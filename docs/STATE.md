Status (initial)

Stack: Next.js + TypeScript (OK). Tester: npm test (TBD konfiguration). Node LTS TBD.

Datakällor: GA4 propertyId TBD. BigQuery project.dataset TBD; tabellprefix events_* antas. CrUX API key TBD.

Vyer: vw_sessions, vw_pageviews_users (att skapa).

Caching: In-memory/kv (TBD val; Redis föreslås).

Tidsram v1: 4–6 veckor (TBD exakt).

Öppna frågor

GA4 property-ID samt exakta metrik/dimensioner för första widgets.

BigQuery project.dataset och ev. service-konton/sekretshantering.

CrUX API integration: Chrome UX Report API för Core Web Vitals data (LCP, INP, CLS p75 värden för mobil/desktop). Kräver CRUX_API_KEY env variabel.

Val av cache (Redis/Upstash vs Edge-cache vs in-process).

Vilka kanalgrupperingsregler i BQ? Mapping-tabellnamn?

Exakta success-trösklar (paritets-% per KPI).

Om AI-insikter i v1: minimal summarizer på datasetet eller vänta v1.1?

Nästa steg (tekniska)

Skapa kontraktstyper, resolver-skeletton, dummy-clients, och minimal tidsserie-widget.

Sätta upp test-rigg med fixtures för GA4 & BQ.