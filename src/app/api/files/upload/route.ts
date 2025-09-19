import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { prisma } from '@/lib/prisma';
import { parseExcelFileFromBuffer } from '@/lib/excel-parsers';
import { FileKind } from '@prisma/client';

export async function POST(request: NextRequest) {
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
    const parsedData = parseExcelFileFromBuffer(buffer, fileUpload.id, kind);

    // Store metric points in database
    if (parsedData.metricPoints.length > 0) {
      // Delete existing metric points for the same source and periods
      const periods = [...new Set(parsedData.metricPoints.map(p => p.period))];
      await prisma.metricPoint.deleteMany({
        where: {
          source: kind,
          period: { in: periods }
        }
      });

      // Insert new metric points
      await prisma.metricPoint.createMany({
        data: parsedData.metricPoints.map(point => ({
          period: point.period,
          metric: point.metric,
          value: point.value,
          weight: point.weight,
          source: kind,
          groupA: point.groupA,
          groupB: point.groupB,
          groupC: point.groupC,
        })),
      });

      // Update file record with detected periods
      await prisma.fileUpload.update({
        where: { id: fileUpload.id },
        data: {
          period: parsedData.validationReport.detectedPeriods.join(',')
        }
      });
    }

    return NextResponse.json({
      success: true,
      fileId: fileUpload.id,
      validationReport: parsedData.validationReport,
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
