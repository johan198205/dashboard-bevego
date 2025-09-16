export type BqDateRange = {
	startDate: string; // YYYY-MM-DD
	endDate: string; // YYYY-MM-DD
	timeZone?: string; // default Europe/Stockholm
};

export type BqSessionsRow = {
	date: string; // YYYY-MM-DD
	channel_group: string;
	sessions: number;
};

/**
 * TODO:
 * - Bekräfta projectId, dataset och tabell/vy för sessions (t.ex. vw_sessions).
 * - Bekräfta auth (service account) och env-nycklar: t.ex. BQ_PROJECT_ID, BQ_DATASET, BQ_CREDENTIALS_JSON.
 * - Implementera faktisk BigQuery-klient (ex @google-cloud/bigquery) och SQL/vy-anrop.
 * - Säkerställ Europe/Stockholm i datumhantering och paritet mot GA4-regler.
 */
export async function querySessionsByDateRange(
	dateRange: BqDateRange,
): Promise<BqSessionsRow[]> {
	// Placeholder-implementation tills env och auth bekräftas.
	// Returnerar tom lista = 0 total sessions.
	return [];
}

export const BQ_SOURCE_LABEL = "BigQuery";

