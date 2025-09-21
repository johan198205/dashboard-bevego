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
    
    // Save to database
    const createdRecords = await prisma.metricPoint.createMany({
      data: result.metricPoints.map(point => ({
        id: randomUUID(),
        period: point.period,
        metric: point.metric,
        value: point.value,
        weight: point.weight,
        groupA: point.groupA,
        groupB: point.groupB,
        groupC: point.groupC,
        source: 'BREAKDOWN',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      ok: true,
      message: "NDI data uploaded successfully",
      recordsCreated: createdRecords.count,
      validationReport: result.validationReport,
    });
  } catch (error) {
    console.error("Error uploading NDI data:", error);
    return NextResponse.json(
      { error: "Failed to upload NDI data" },
      { status: 500 }
    );
  }
}


