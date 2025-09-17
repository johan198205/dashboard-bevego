import { GA4_SOURCE_LABEL, querySessionsByDateRange as ga4Query } from "./ga4Client";
import { BQ_SOURCE_LABEL, querySessionsByDateRange as bqQuery } from "./bqClient";

export type DataSource = "ga4" | "bq";

export type SessionsKpiInput = {
	startDate: string; // YYYY-MM-DD
	endDate: string; // YYYY-MM-DD
	dataSource: DataSource;
};

export type SessionsKpiResult = {
	total_sessions: number;
	source_label: "GA4 API" | "BigQuery";
};

export async function getSessionsKpi(
	input: SessionsKpiInput,
): Promise<SessionsKpiResult> {
	if (input.dataSource === "ga4") {
		// TODO: Byt placeholder mot riktig GA4-anrop när env/auth finns.
		const rows = await ga4Query({
			startDate: input.startDate,
			endDate: input.endDate,
			timeZone: "Europe/Stockholm",
		});
		const total = rows.reduce((sum, r) => sum + (r.sessions || 0), 0);
		return { total_sessions: total, source_label: GA4_SOURCE_LABEL };
	}

    // BigQuery temporärt avstängt bakom feature-flag. Gör no-op och logga varning.
    if (process.env.ENABLE_BQ === "true" || process.env.NEXT_PUBLIC_ENABLE_BQ === "true") {
        const rows = await bqQuery({
            startDate: input.startDate,
            endDate: input.endDate,
            timeZone: "Europe/Stockholm",
        });
        const total = rows.reduce((sum, r) => sum + (r.sessions || 0), 0);
        return { total_sessions: total, source_label: BQ_SOURCE_LABEL };
    }

    console.warn("BigQuery disabled via feature flag. Returning GA4-only no-op for BQ path.");
    return { total_sessions: 0, source_label: BQ_SOURCE_LABEL };
}

