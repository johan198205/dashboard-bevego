Syfte
Minsta möjliga ändringar per iteration (PDD). Spec → Test → Kod. Håll publik API stabil.

Arkitektur (översikt)

UI (Next.js + TypeScript): Toggle dataSource: 'ga4' | 'bq'. Widgetar läser samma schema.

Server

ga4Client.query(metric, dims, filters, dateRange)

bqClient.query(sqlTemplate, params)

resolver.getKpi(params, dataSource) → normaliserar till kontraktsschemat.

Kontraktsschema

{
  date: string (YYYY-MM-DD),
  channel_group: string,
  sessions: number,
  engaged_sessions: number,
  pageviews: number,
  users: number,
  source_label: 'GA4 API' | 'BigQuery'
}


Käll-explainer

GA4: “Inkluderar Consent Mode-modellering, Signals, spamfilter. Kan ändras av Google.”

BQ: “Rådata. Ingen modellering. Sessioner/Users enligt våra SQL-regler (device-based).”

Data & tidszon

Tidszon: Europe/Stockholm.

GA4-läge: hämta sessions, engagedSessions, screenPageViews, totalUsers med dimensioner date, sessionDefaultChannelGroup.

BQ-läge: vyer vw_sessions, vw_pageviews_users (TBD projektnamn). SQL räknar enligt given dedupe/engagement-logik.

Prestanda & cache

GA4: kvot-aware cache‐nyckel = (metrics,dims,filters,dateRange).

BQ: dagsaggregat i vy/tabell (materialiserad eller batch). Endast nödvändiga kolumner; partitions på events_*.

PDD-principer

Smallest possible change.

Unified diffs only.

Touch only specificerade filer.

Leave TODO if uncertain; stop.

Keep public APIs stable.

Ändra aldrig configs/linters utan uttryckligt OK.

Testning

Test runner: npm test (TBD setup).

Enhetstester för resolver (GA4↔BQ parity). Snapshot-tester för UI-widgets. Minimal mock av GA4/BQ.