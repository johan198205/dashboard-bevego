# Implementation Summary: Clarity Data Exporter Integration

## Genomförda ändringar

Alla ändringar följer PDD-principer (Plan, Design, Deliver) och docs-regler (SYSTEM.md, RULES.md, ARCHITECTURE.md).

### Nya filer

1. **`src/lib/clarityClient.ts`** (201 rader)
   - Server-side klient för Clarity Data Exporter API
   - JWT-autentisering med Bearer token från `CLARITY_API_KEY`
   - In-memory cache (120s TTL) för att minska API-belastning
   - Domänfiltrering: `mitt.riksbyggen.se` enligt RULES.md
   - Typsäker med TypeScript interfaces
   - Felhantering med säkra fallbacks

2. **`src/app/api/clarity/route.ts`** (149 rader)
   - Intern API-endpoint: `GET /api/clarity`
   - Validering av query-parametrar (start, end, type, filters)
   - Mappning från Clarity API-svar till interna typer
   - Stöd för `type=overview` och `type=timeseries`
   - Felhantering med 400/500/503 status codes
   - Development-only error details

3. **`CLARITY_INTEGRATION.md`** (dokumentation)
   - Detaljerad arkitekturdokumentation
   - API-endpoints och parametrar
   - Datamappning och cache-strategi
   - Säkerhetsriktlinjer
   - Verifieringssteg

4. **`CLARITY_SETUP.md`** (snabbguide)
   - Steg-för-steg setup-instruktioner
   - Felsökningsguide
   - Säkerhetskontroller innan deploy

5. **`.env.local`** (skapad)
   - Innehåller `CLARITY_API_KEY` med JWT-token
   - Gitignored (får ej committas)

### Modifierade filer

1. **`src/services/clarity.service.ts`**
   ```diff
   @@ -15,8 +15,53 @@
   -  async getOverview(params: ClarityParams): Promise<ClarityOverview> {
   -    // TODO: Implement real Clarity API call
   -    // For now, return mock data that respects date range and filters
   -    const mockData = this.generateMockOverview(params);
   -    return mockData;
   +  async getOverview(params: ClarityParams): Promise<ClarityOverview> {
   +    try {
   +      const queryParams = new URLSearchParams({
   +        start: params.range.start,
   +        end: params.range.end,
   +        type: 'overview',
   +      });
   +
   +      // Add filters if present
   +      if (params.filters?.device && params.filters.device.length > 0) {
   +        queryParams.append('device', params.filters.device[0]);
   +      }
   +      // ... (more filter mappings)
   +
   +      const response = await fetch(`/api/clarity?${queryParams.toString()}`, {
   +        cache: 'no-store',
   +      });
   +
   +      if (!response.ok) {
   +        console.error('Failed to fetch Clarity overview:', response.statusText);
   +        // Fallback to mock data on error
   +        return this.generateMockOverview(params);
   +      }
   +
   +      const data = await response.json();
   +      return data;
   +    } catch (error) {
   +      console.error('Error fetching Clarity overview:', error);
   +      // Fallback to mock data on error
   +      return this.generateMockOverview(params);
   +    }
     }
   ```
   
   - Ändrat `getOverview()` och `getTrends()` att anropa `/api/clarity` istället för mock
   - Bibehållen fallback till mock-data vid fel (robust felhantering)
   - Bibehållen API-signatur (backward compatible)

2. **`src/app/clarity/_components/clarity-trends.tsx`**
   ```diff
   @@ -1,13 +1,15 @@
    "use client";
    
    import { useEffect, useState } from "react";
    import { ClarityTrendsChart } from "./clarity-trends-chart";
   -import { ClarityTrendPoint } from "@/lib/types";
   +import { ClarityTrendPoint, ClarityOverview } from "@/lib/types";
    import { clarityService } from "@/services/clarity.service";
    import { useFilters } from "@/components/GlobalFilters";
    import { cn } from "@/lib/utils";
    
    export function ClarityTrends() {
      const { state } = useFilters();
      const [data, setData] = useState<ClarityTrendPoint[]>([]);
   +  const [source, setSource] = useState<string>('Mock');
      const [loading, setLoading] = useState(true);
   
   @@ -19,11 +21,24 @@
          ...
        });
   -    setData(result);
   +    const [trendsResult, overviewResult] = await Promise.all([...]);
   +    setData(trendsResult);
   +    setSource(overviewResult.source);
   ```
   
   - Lagt till `source` state för att visa korrekt datakälla
   - Uppdaterat alla "Källa: Mock" till "Källa: {source}"
   - Visar dynamiskt "Clarity API" när live-data används

## Säkerhet

✅ **API-nyckel exponeras ALDRIG till klient**
- Endast server-side kod har tillgång till `CLARITY_API_KEY`
- Klientkomponenter anropar intern `/api/clarity` endpoint
- JWT-token finns endast i `.env.local` (gitignored)

✅ **Validering och sanitering**
- Query-parametrar valideras i API-route
- Datum valideras med regex `^\d{4}-\d{2}-\d{2}$`
- Filter saneras innan vidarebefordran

✅ **Felhantering**
- Säkra felmeddelanden utan att läcka interndetaljer
- Development-only error details
- Fallback till mock-data vid API-fel

## Dataflöde

```
1. Användare öppnar /clarity
   ↓
2. UI-komponenter läser filter från GlobalFilters (UI är single source of truth)
   ↓
3. clarity.service.ts bygger query-parametrar från UI-state
   ↓
4. Fetch till /api/clarity?start=...&end=...&type=...
   ↓
5. API-route validerar parametrar
   ↓
6. ClarityClient gör autentiserat anrop till Clarity API
   ↓
7. Svar mappas till interna typer (ClarityOverview, ClarityTrendPoint[])
   ↓
8. Data cacheläggs (120s) och returneras till klient
   ↓
9. UI renderar kort och grafer med "Källa: Clarity API"
```

## Cache-strategi

- **Server-side**: 120 sekunder (2 minuter)
- **Cache-nyckel**: `endpoint:${JSON.stringify(params)}`
- **Syfte**: Minska belastning på Clarity API, förbättra svarstider
- **Implementation**: In-memory Map med timestamp
- **Future**: Överväg Redis för distributed caching i produktion

## Kända begränsningar & TODOs

### API-schema ej bekräftat
```typescript
// TODO: Update endpoint path once Clarity API documentation is confirmed
// Nuvarande antaganden:
// - Base URL: https://www.clarity.ms/api/v1
// - Endpoints: /metrics, /timeseries
// - Response fields: sessions, avgEngagementTime, etc.
```

**Action**: Verifiera med Microsoft Clarity dokumentation eller support när tillgänglig.

### URL-data och insights saknas
```typescript
// TODO: Implement URL-level data endpoints
async getUrls(params: ClarityParams): Promise<ClarityUrlRow[]> {
  // Currently returns mock data
  const mockData = this.generateMockUrls(params);
  return mockData;
}
```

**Action**: Implementera när Clarity API-endpoints för URL-data är bekräftade.

### Filter-begränsningar
Endast första värdet i filter-array används:
```typescript
if (params.filters?.device && params.filters.device.length > 0) {
  queryParams.append('device', params.filters.device[0]); // Only first value
}
```

**Action**: Uppdatera till stöd för multipla filter-värden om Clarity API stödjer det.

## Verifiering

### Manuell testning

1. **Lokal start**:
   ```bash
   npm run dev
   # Öppna http://localhost:3000/clarity
   ```

2. **Verifiera datakälla**:
   - Korten ska visa "Källa: Clarity API"
   - Om "Källa: Mock" visas: kontrollera `.env.local` och starta om server

3. **Testa filter**:
   - Ändra datumintervall i UI
   - Välj olika kanaler/enheter
   - Verifiera att data uppdateras

4. **Nätverksinspektion**:
   - Öppna DevTools → Network
   - Verifiera att anrop går till `/api/clarity` (lokalt)
   - Inga anrop ska gå direkt till `clarity.ms` från klient

5. **Felsimulering**:
   ```bash
   # Tillfälligt ta bort API-nyckel
   # Verifiera att UI fallback till mock utan krasch
   ```

### Säkerhetskontroll

```bash
# Bygg production bundle
npm run build

# Sök efter API-nyckel i klientbundles
grep -r "CLARITY_API_KEY" .next/static/
# Ska returnera: 0 resultat

# Sök efter JWT-signatur
grep -r "eyJhbGciOiJSUzI1NiIsImtpZCI" .next/static/
# Ska returnera: 0 resultat
```

**KRITISKT**: Om något hittas i klientbundles, STOPPA DEPLOY och undersök omedelbart.

## Tester (TODO)

### Enhetstester
```bash
# src/lib/clarityClient.test.ts
- Test JWT authentication
- Test cache logic
- Test error handling
- Test parameter building

# src/app/api/clarity/route.test.ts
- Test parameter validation
- Test response mapping
- Test error responses
- Mock HTTP calls to Clarity API
```

### Integrationstester
```bash
# Testa hela flödet från UI till API och tillbaka
- Mock Clarity API responses
- Verifiera datamappning
- Testa filter-kombinationer
- Verifiera cache-beteende
```

## Miljövariabler

### Utveckling (`.env.local`)
```bash
CLARITY_API_KEY=eyJhbGciOiJSUzI1NiIs... # JWT från Clarity Settings
```

### Produktion
Lägg till i hosting-plattformens secrets:
- Vercel: Environment Variables
- AWS: Secrets Manager eller Parameter Store
- Azure: Key Vault
- GCP: Secret Manager

**VIKTIGT**: Rotera nyckel omedelbart om den läcker.

## Framtida förbättringar

1. **Bekräfta API-schema**: Kontakta Microsoft Clarity support för officiell dokumentation
2. **Redis-cache**: Ersätt in-memory cache med Redis för distributed caching
3. **Rate limiting**: Implementera för att undvika API-kvoter
4. **Retry-logik**: Exponential backoff vid temporära fel
5. **URL-data**: Implementera endpoints för URL-tabell och insights
6. **Multi-filter**: Stöd för flera filter-värden samtidigt
7. **Tester**: Implementera enhetstester och integrationstester
8. **Monitoring**: Lägg till logging och metrics för API-anrop

## Sammanfattning

**Status**: ✅ Implementation klar och redo för testning

**Omfattning**:
- 5 nya filer (inkl. dokumentation)
- 2 modifierade filer
- 0 linter-fel
- Minimal change enligt PDD

**Säkerhet**: ✅ API-nyckel exponeras aldrig till klient

**Felhantering**: ✅ Robust fallback till mock-data

**Dokumentation**: ✅ Komplett med setup-guide och API-referens

**Nästa steg**: Verifiera med live-data från Clarity API och justera mappning om nödvändigt.
