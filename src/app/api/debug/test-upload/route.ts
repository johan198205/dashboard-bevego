import { NextRequest, NextResponse } from 'next/server';
import { parseExcelFileFromBuffer } from '@/lib/excel-parsers';
import { FileKind } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const kind = formData.get('kind') as FileKind || 'BREAKDOWN';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log(`Starting to parse file: ${file.name}, size: ${buffer.length} bytes`);

    // Parse with timeout
    const parsePromise = parseExcelFileFromBuffer(buffer, 'test-id', kind);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Parse timeout after 30 seconds')), 30000);
    });

    const parsedData = await Promise.race([parsePromise, timeoutPromise]) as any;

    console.log(`Parsing completed. Found ${parsedData.metricPoints.length} metric points`);

    return NextResponse.json({
      success: true,
      metricPointsCount: parsedData.metricPoints.length,
      validationReport: parsedData.validationReport,
      samplePoints: parsedData.metricPoints.slice(0, 5) // First 5 points as sample
    });

  } catch (error) {
    console.error('Debug upload error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to parse file',
        success: false
      },
      { status: 500 }
    );
  }
}
