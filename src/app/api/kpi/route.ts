import { NextRequest } from "next/server";
import { getKpi } from "@/lib/resolver";
import { aggregateAverage } from "@/lib/mockData/generators";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const metric = searchParams.get("metric") as any;
  const start = searchParams.get("start") as string;
  const end = searchParams.get("end") as string;
  const grain = (searchParams.get("grain") as any) || "day";
  const comparisonMode = (searchParams.get("comparisonMode") as any) || "none";

  // Special server-side GA4 handling for MAU to avoid bundling GA4 SDK in client code
  if (metric === 'mau' && process.env.GA4_PROPERTY_ID) {
    try {
      // Helper ranges
      const prevRange = (() => {
        if (comparisonMode === 'yoy') {
          const addYears = (d: string, y: number) => {
            const tmp = new Date(d); tmp.setFullYear(tmp.getFullYear() + y); return tmp.toISOString().slice(0,10);
          };
          return { start: addYears(start, -1), end: addYears(end, -1) };
        }
        if (comparisonMode === 'prev') {
          const s = new Date(start); const e = new Date(end);
          const len = Math.max(0, Math.round((e.getTime()-s.getTime())/(24*3600*1000))+1);
          const prevEnd = new Date(s); prevEnd.setDate(prevEnd.getDate()-1);
          const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate()-(len-1));
          return { start: prevStart.toISOString().slice(0,10), end: prevEnd.toISOString().slice(0,10) };
        }
        return null;
      })();

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { BetaAnalyticsDataClient } = (eval('require'))('@google-analytics/data');
      const clientOptions: any = {};
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        try { clientOptions.credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON as string); } catch {}
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        clientOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      }
      const client = new BetaAnalyticsDataClient(clientOptions);
      const run = async (range: {start:string; end:string}) => {
        const [resp] = await client.runReport({
          property: `properties/${process.env.GA4_PROPERTY_ID}`,
          dateRanges: [{ startDate: range.start, endDate: range.end }],
          dimensions: [{ name: 'date' }],
          metrics: [{ name: 'totalUsers' }],
          dimensionFilter: {
            filter: {
              fieldName: 'hostName',
              stringFilter: { matchType: 'EXACT', value: 'mitt.riksbyggen.se' }
            }
          },
          orderBys: [{ dimension: { dimensionName: 'date' } }],
        });
        const rows = resp.rows || [];
        return rows.map((r: any) => ({
          date: `${r.dimensionValues?.[0]?.value?.slice(0,4)}-${r.dimensionValues?.[0]?.value?.slice(4,6)}-${r.dimensionValues?.[0]?.value?.slice(6,8)}`,
          value: Number(r.metricValues?.[0]?.value || 0),
        }));
      };

      // Fetch daily series
      const daySeries = await run({ start, end });
      const dayCompare = prevRange ? await run(prevRange) : undefined;

      // Respect requested grain by aggregating with average semantics
      const series = aggregateAverage(daySeries as any, (grain as any) || 'day');
      const compare = dayCompare ? aggregateAverage(dayCompare as any, (grain as any) || 'day') : undefined;

      // Average value over the (possibly aggregated) series for summary
      const avg = (arr: {value:number}[] | undefined) => (arr && arr.length)
        ? arr.reduce((s,p)=>s+p.value,0) / arr.length
        : 0;
      const current = avg(series as any);
      const prev = avg(compare as any);
      const yoyPct = prev ? ((current - prev) / Math.abs(prev)) * 100 : 0;
      return Response.json({
        meta: { source: 'ga4', metric: 'mau', dims: [] },
        summary: { current, prev, yoyPct },
        timeseries: series,
        compareTimeseries: compare,
        notes: ["Källa: GA4 API (medel per period)"],
      });
    } catch (err) {
      console.error('GA4 MAU API error (no fallback):', err);
      return new Response(JSON.stringify({ error: String(err), notes: ["Källa: GA4 API (fel)"] }), {
        status: 502,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  const res = await getKpi({ metric, range: { start, end, grain, comparisonMode } as any });
  return Response.json(res);
}

export async function POST(req: Request) {
  const body = await req.json();
  const res = await getKpi(body);
  return Response.json(res);
}


