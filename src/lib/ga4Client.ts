// Inga externa beroenden: använd inbyggda datumhelpers

export type Ga4DateRange = {
	startDate: string; // YYYY-MM-DD
	endDate: string; // YYYY-MM-DD
	timeZone?: string; // default Europe/Stockholm
};

export type Ga4SessionsRow = {
	date: string; // YYYY-MM-DD
	channel_group: string;
	sessions: number;
};

/**
 * TODO:
 * - Bekräfta auth-modell (Service Account vs OAuth).
 * - Ange env-nycklar: exempelvis GA4_PROPERTY_ID, GA4_CLIENT_EMAIL, GA4_PRIVATE_KEY.
 * - Implementera faktisk GA4 Data API-koppling (google-analytics-data).
 */
export async function querySessionsByDateRange(
	dateRange: Ga4DateRange,
): Promise<Ga4SessionsRow[]> {
	const tz = dateRange.timeZone || "Europe/Stockholm";

	// Placeholder-implementation tills env och auth bekräftas.
	// Returnerar en singelrad per dag med 0-sessioner för att inte bryta UI.
	const start = new Date(dateRange.startDate + "T00:00:00");
	const end = new Date(dateRange.endDate + "T00:00:00");
	const rows: Ga4SessionsRow[] = [];

	for (let d = start; d <= end; d = addDays(d, 1)) {
		rows.push({
			date: formatDate(d),
			channel_group: "All",
			sessions: 0,
		});
	}

	// TODO: Ersätt med riktig GA4-query och normalisering till kontraktsschemat.
	// - Metrics: sessions
	// - Dimensions: date, sessionDefaultChannelGroup
	// - Label: source_label = 'GA4 API'
	// - Timezone: Europe/Stockholm
	return rows;
}

export const GA4_SOURCE_LABEL = "GA4 API";

function addDays(date: Date, days: number): Date {
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}

function formatDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

