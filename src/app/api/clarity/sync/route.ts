import { NextRequest, NextResponse } from 'next/server';
import { syncClarityData } from '@/lib/claritySync';

export const dynamic = 'force-dynamic';

/**
 * POST /api/clarity/sync
 * 
 * Manually trigger Clarity data sync
 * This endpoint can be called:
 * - Manually for testing
 * - By a cron job service (Vercel Cron, GitHub Actions, etc.)
 * - By an external scheduler
 * 
 * Security: Consider adding authentication header in production
 */
export async function POST(req: NextRequest) {
  try {
    console.log('[API] Starting Clarity sync...');
    
    const result = await syncClarityData();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Synced ${result.snapshotsSaved} days of Clarity data`,
        latestDate: result.latestDate,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[API] Clarity sync failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * GET /api/clarity/sync
 * 
 * Get status of latest sync
 */
export async function GET(req: NextRequest) {
  try {
    const { prisma } = await import('@/lib/prisma');
    
    const latestSnapshot = await prisma.claritySnapshot.findFirst({
      orderBy: {
        fetchedAt: 'desc',
      },
      select: {
        date: true,
        fetchedAt: true,
        sessions: true,
      },
    });
    
    const snapshotCount = await prisma.claritySnapshot.count();
    
    if (!latestSnapshot) {
      return NextResponse.json({
        status: 'no_data',
        message: 'No Clarity data in database yet. Run POST /api/clarity/sync to fetch data.',
        snapshotCount: 0,
      });
    }
    
    return NextResponse.json({
      status: 'ok',
      latestSnapshot: {
        date: latestSnapshot.date.toISOString().split('T')[0],
        fetchedAt: latestSnapshot.fetchedAt.toISOString(),
        sessions: latestSnapshot.sessions,
      },
      snapshotCount,
      message: `Database contains ${snapshotCount} days of Clarity data`,
    });
    
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
