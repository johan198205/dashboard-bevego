import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { prisma } from '@/lib/prisma';
import { parseExcelFileFromBuffer } from '@/lib/excel-parsers';
import { FileKind } from '@prisma/client';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Set timeout for the entire request
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), 45000); // 45 seconds
  });

  try {
    const requestPromise = handleUpload(request);
    const result = await Promise.race([requestPromise, timeoutPromise]) as NextResponse;
    return result;
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload file' },
      { status: 500 }
    );
  }
}

async function handleUpload(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const kind = formData.get('kind') as FileKind;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!kind || !['AGGREGATED', 'BREAKDOWN'].includes(kind)) {
      return NextResponse.json({ error: 'Invalid file kind' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json({ error: 'Only Excel files are supported' }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch {
      // Directory might already exist
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;
    const filePath = join(uploadsDir, fileName);

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Create file record in database
    const fileUpload = await prisma.fileUpload.create({
      data: {
        kind,
        originalName: file.name,
        storedPath: filePath,
      },
    });

    // Parse the Excel file from buffer
    console.log(`Starting to parse file: ${file.name}, size: ${buffer.length} bytes`);
    const parsedData = parseExcelFileFromBuffer(buffer, fileUpload.id, kind);
    console.log(`Parsing completed. Found ${parsedData.metricPoints.length} metric points`);

    // Store metric points in database
    if (parsedData.metricPoints.length > 0) {
      const batchId = randomUUID();
      const periodIds = [...new Set(parsedData.metricPoints.map(p => p.periodId))];
      
      // Clear existing Index data for these periods to avoid duplicates
      console.log(`Clearing existing Index data for periods: ${periodIds.join(', ')}`);
      for (const periodId of periodIds) {
        const deleted = await prisma.metricPoint.deleteMany({
          where: {
            periodId: periodId,
            groupA: 'Index',
            source: kind
          }
        });
        console.log(`Deleted ${deleted.count} existing Index records for period ${periodId}`);
      }
      
      // For Index rows, we need to save all rows separately to calculate averages
      // For other metrics, use upsert to avoid duplicates
      for (const point of parsedData.metricPoints) {
        try {
          if (point.groupA === 'Index') {
            // For Index rows, we need to make them unique by adding a sequence number
            // to avoid unique constraint violations when there are multiple Index rows
            const sequenceId = randomUUID().substring(0, 8); // Short unique ID
            const uniqueGroupA = `${point.groupA}_${sequenceId}`;
            console.log(`Creating Index record: ${point.groupB}/${point.groupC} = ${point.value} (seq: ${sequenceId})`);
            await prisma.metricPoint.create({
              data: {
                id: randomUUID(),
                period: point.period,
                periodId: point.periodId,
                periodStart: point.periodStart,
                periodEnd: point.periodEnd,
                metric: point.metric,
                value: point.value,
                weight: point.weight,
                source: kind,
                groupA: uniqueGroupA, // Make it unique by adding sequence
                groupB: point.groupB,
                groupC: point.groupC,
                ingestionBatchId: batchId,
                superseded: false,
                createdAt: new Date(),
              }
            });
          } else {
            // For non-Index rows, use upsert to avoid duplicates
            await prisma.metricPoint.upsert({
              where: {
                unique_metric_period: {
                  periodId: point.periodId,
                  metric: point.metric,
                  source: kind,
                  groupA: point.groupA || '',
                  groupB: point.groupB || '',
                  groupC: point.groupC || ''
                }
              },
              update: {
                value: point.value,
                weight: point.weight,
                ingestionBatchId: batchId,
                superseded: false
              },
              create: {
                id: randomUUID(),
                period: point.period,
                periodId: point.periodId,
                periodStart: point.periodStart,
                periodEnd: point.periodEnd,
                metric: point.metric,
                value: point.value,
                weight: point.weight,
                source: kind,
                groupA: point.groupA,
                groupB: point.groupB,
                groupC: point.groupC,
                ingestionBatchId: batchId,
                superseded: false,
                createdAt: new Date(),
              }
            });
          }
        } catch (error) {
          console.error('Error upserting metric point:', error);
          // Continue with other points even if one fails
        }
      }

      // Update file record with detected periods
      await prisma.fileUpload.update({
        where: { id: fileUpload.id },
        data: {
          period: parsedData.validationReport.detectedPeriods.join(',')
        }
      });
    }

    console.log(`Upload completed successfully. File ID: ${fileUpload.id}`);
    return NextResponse.json({
      ok: true,
      periodsDetected: parsedData.validationReport.detectedPeriods,
      rowsInserted: parsedData.validationReport.rowCount,
      warnings: parsedData.validationReport.warnings,
      fileId: fileUpload.id,
      validationReport: parsedData.validationReport,
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload file' },
      { status: 500 }
    );
  }
}
