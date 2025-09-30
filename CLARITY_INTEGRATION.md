# Microsoft Clarity Data Export Integration

## Översikt

Denna integration ansluter till Microsoft Clarity Data Exporter API för att hämta användaranalys och beteendemätningar för domänen `mitt.riksbyggen.se`.

## Säkerhet

**KRITISKT**: API-nyckeln exponeras ALDRIG till klienten. All kommunikation med Clarity API sker server-side via en intern proxy-endpoint.

## Arkitektur

```
[Client Components] → [/api/clarity] → [ClarityClient] → [Clarity Data Exporter API]
         ↓                                                           ↓
    [UI-state filters]                                    [Bearer JWT Auth]
```

### Komponenter

1. **`src/lib/clarityClient.ts`**
   - Server-side klient som hanterar autentisering och HTTP-anrop
   - Använder Bearer JWT från `CLARITY_API_KEY`
   - Implementerar cache (120s TTL) för att minska API-belastning
   - Filtrerar alltid på domain: `mitt.riksbyggen.se`

2. **`src/app/api/clarity/route.ts`**
   - Intern API-endpoint som exponeras till klient
   - Validerar query-parametrar (start, end, type, filters)
   - Mappar Clarity API-svar till våra interna typer
   - Implementerar felhantering med säkra fallback-värden

3. **`src/services/clarity.service.ts`**
   - Klient-kompatibel service som anropar intern API
   - Fallback till mock-data vid fel
   - Respekterar UI-state för filter och datumintervall

## Setup

### 1. Skaffa API-nyckel

1. Logga in på [Microsoft Clarity](https://www.clarity.ms/)
2. Gå till Settings → Data Export
3. Generera JWT token med scope `Data.Export`
4. Kopiera token

### 2. Konfigurera miljövariabler

Lägg till i `.env.local`:

```bash
CLARITY_API_KEY=eyJhbGciOiJSUzI1NiIsImtpZCI6IjQ4M0FCMDhFNUYwRDMxNjdEOTRFMTQ3M0FEQTk2RTcyRDkwRUYwRkYiLCJ0eXAiOiJKV1QifQ...
```

**SÄKERHET**: 
- Lägg ALDRIG till `.env.local` i git
- Nyckeln får ENDAST användas i server-side kod
- Verifiera att nyckeln inte läcker till klientbundles

### 3. Starta utvecklingsserver

```bash
npm run dev
```

Navigera till `http://localhost:3000/clarity`

## API Endpoints

### `GET /api/clarity`

Hämtar Clarity-data för angivet datumintervall och filter.

**Query Parameters:**

- `start` (required): Startdatum `YYYY-MM-DD`
- `end` (required): Slutdatum `YYYY-MM-DD`
- `type` (required): `overview` | `timeseries`
- `device` (optional): Enhetsfilter
- `channel` (optional): Kanalfilter (mappas till `source`)
- `country` (optional): Landsfilter
- `browser` (optional): Webbläsarfilter
- `os` (optional): OS-filter

**Response för `type=overview`:**

```json
{
  "sessions": 1234,
  "avgEngagementTime": 53,
  "avgScrollDepth": 73,
  "rageClicks": { "count": 20, "percentage": 4 },
  "deadClicks": { "count": 18, "percentage": 1 },
  "quickBack": { "percentage": 14 },
  "scriptErrors": { "count": 8 },
  "source": "Clarity API"
}
```

**Response för `type=timeseries`:**

```json
[
  {
    "date": "2025-09-23",
    "sessions": 150,
    "engagementTime": 50,
    "scrollDepth": 70,
    "rageClicks": 5,
    "deadClicks": 2,
    "quickBack": 10,
    "scriptErrors": 1
  }
]
```

## Datamappning

### Clarity API → Interna typer

TODO: Uppdatera mappningen när exakt Clarity API-schema är bekräftat.

Nuvarande antaganden:
- `sessions` → `sessions`
- `avgEngagementTime` eller `averageEngagementTime` → `avgEngagementTime`
- `avgScrollDepth` eller `averageScrollDepth` → `avgScrollDepth`
- `rageClicks` → `rageClicks.count`
- `deadClicks` → `deadClicks.count`
- `quickBackRate` eller `quickBackPercentage` → `quickBack.percentage`
- `jsErrors` eller `scriptErrors` → `scriptErrors.count`

## Caching

⚠️ **VIKTIGT**: Clarity API har en strikt gräns på **10 anrop per projekt per dag**

- **Server-side cache**: 24 timmar
- **Persistent fallback cache**: Sparar senaste lyckade svar permanent
- **Cache-nyckel**: Baserad på endpoint + parametrar
- **Syfte**: 
  - Respektera Clarity's dagliga API-gräns (10 calls/day)
  - Säkerställa att data finns tillgänglig även efter limit
  - Förbättra svarstider

### Cache-strategi vid rate limit (429)

När daglig gräns nås:
1. Returnera senaste cachade data (upp till 24h gamla)
2. Om ingen cache finns, fallback till persistent cache
3. Om ingen data finns alls, fallback till mock-data
4. Logga tydlig varning i konsolen

## Felhantering

### Scenarier

1. **API-nyckel saknas** → Returnerar 503 Service Unavailable
2. **Ogiltiga parametrar** → Returnerar 400 Bad Request
3. **Clarity API-fel** → Returnerar 500 Internal Server Error
4. **Timeout** → Fallback till mock-data i klienten

### UI-beteende

- **Loading state**: Skeletton/spinners visas under inhämtning
- **Error state**: Fallback till mock-data, inget krasch
- **Empty state**: Meddelande när ingen data finns

## Mätningar

Clarity Data Exporter tillhandahåller följande KPI:er för `/clarity`-sidan:

| KPI | Beskrivning |
|-----|-------------|
| **Clarity Score** | Beräknad från övriga mätningar (74/100) |
| **Sessions** | Totalt antal sessioner |
| **Avg. Engagement Time** | Genomsnittlig tid användare är aktiva |
| **Avg. Scroll Depth** | Genomsnittlig skrolldjup i procent |
| **Rage Clicks** | Antal och andel "rage clicks" (frustrerade klick) |
| **Dead Clicks** | Antal och andel "dead clicks" (klick utan effekt) |
| **Quick-back** | Andel snabba tillbakaklick |
| **Script Errors** | Antal JavaScript-fel |

## Tester

TODO: Implementera enhetstester och integrationstester

```bash
# Enhetstester för mappare
npm test src/lib/clarityClient.test.ts

# Integrationstester för API-route (mockade HTTP)
npm test src/app/api/clarity/route.test.ts
```

## Verifiering

1. **Lokal test**: Kör `npm run dev` och besök `/clarity`
2. **Filter-test**: Ändra datumintervall och filter i UI, verifiera att data uppdateras
3. **Nätverkstest**: Öppna DevTools → Network, verifiera att anrop går till `/api/clarity` (EJ extern domän)
4. **Fel-test**: Simulera fel (ogiltig nyckel, timeout), verifiera att UI inte kraschar
5. **Säkerhetstest**: Sök efter `CLARITY_API_KEY` i byggda bundles (får EJ finnas)

```bash
# Bygg produktionsbundle
npm run build

# Sök efter nyckel (ska ge 0 resultat)
grep -r "CLARITY_API_KEY" .next/static/
```

## Kända begränsningar

1. **API-schema ej bekräftat**: Endpoint-sökvägar och fältnamn är antaganden som kan behöva justeras
2. **URL-data saknas**: Ingen implementation för URL-tabell eller insights ännu
3. **Filter-begränsningar**: Endast första värdet i array används för varje filter

## Framtida förbättringar

- [ ] Bekräfta exakt Clarity API-schema från Microsoft
- [ ] Implementera URL-data och insights-endpoints
- [ ] Lägg till stöd för flera filter-värden
- [ ] Implementera Redis-cache istället för in-memory
- [ ] Lägg till retry-logik med exponential backoff
- [ ] Implementera rate limiting för att undvika API-kvoter

## Support

För frågor om Clarity Data Exporter API, se:
- [Microsoft Clarity Documentation](https://learn.microsoft.com/en-us/clarity/)
- [Clarity API Reference](https://www.clarity.ms/api-docs) (om tillgänglig)
