import { NextRequest, NextResponse } from "next/server";
import { parseBreakdownFileFromBuffer } from "@/lib/excel-parsers";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileId = randomUUID();
    
    // Parse the Excel file
    const result = parseBreakdownFileFromBuffer(buffer, fileId);
    
    console.log('Parse result:', {
      metricPointsCount: result.metricPoints.length,
      validationReport: result.validationReport,
      firstFewPoints: result.metricPoints.slice(0, 3)
    });
    
    // Generate batch ID for this upload
    const batchId = randomUUID();
    
    // Get unique period IDs from parsed data
    const periodIds = [...new Set(result.metricPoints.map(p => p.periodId))];
    
    // For each period, use upsert to handle idempotent uploads
    let totalCreated = 0;
    for (const periodId of periodIds) {
      const periodPoints = result.metricPoints.filter(p => p.periodId === periodId);

      // Use individual upserts to handle unique constraint properly
      for (const point of periodPoints) {
        try {
          await prisma.metricPoint.upsert({
                where: {
                  unique_metric_period: {
                    periodId: point.periodId,
                    metric: point.metric,
                    source: 'BREAKDOWN',
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
              groupA: point.groupA,
              groupB: point.groupB,
              groupC: point.groupC,
              source: 'BREAKDOWN',
              ingestionBatchId: batchId,
              superseded: false,
              createdAt: new Date(),
            }
          });
          totalCreated++;
        } catch (error) {
          console.error('Error upserting metric point:', error);
          // Continue with other points even if one fails
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: "NDI data uploaded successfully",
      recordsCreated: totalCreated,
      periodsProcessed: periodIds,
      batchId,
      validationReport: result.validationReport,
    });
  } catch (error) {
    console.error("Error uploading NDI data:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to upload NDI data", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}


