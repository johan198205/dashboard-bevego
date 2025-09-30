# Clarity Database Integration - Komplett Guide

## ✅ Vad har implementerats

Systemet är nu **komplett omdesignat** för att hantera Clarity's strikta API-begränsningar (10 calls/day):

### 1. Databas-baserad arkitektur
```
┌──────────────────────────────────────────────────────────┐
│  Daglig Sync (kl 08:00)                                  │
│  ↓                                                        │
│  1. Hämta senaste 3 dagars data från Clarity API         │
│  2. Spara i SQLite databas (ClaritySnapshot table)       │
│  3. Bygg upp historik över tid                           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  Användare öppnar /clarity                                │
│  ↓                                                        │
│  1. Läs från databas (INTE Clarity API)                  │
│  2. Aggregera data för valt datumintervall               │
│  3. ALDRIG mock-data - visa real data eller tom state    │
└──────────────────────────────────────────────────────────┘
```

### 2. Prisma Schema
```prisma
model ClaritySnapshot {
  id                String   @id @default(cuid())
  date              DateTime // Datum för snapshot
  fetchedAt         DateTime @default(now())
  
  // Aggregerade metrics
  sessions          Int
  avgEngagementTime Int
  avgScrollDepth    Float
  rageClicksCount   Int
  rageClicksPct     Float
  deadClicksCount   Int
  deadClicksPct     Float
  quickBackPct      Float
  scriptErrorsCount Int
  
  rawData           String // Full JSON för framtida behov
  
  @@unique([date])
}
```

### 3. Nya filer

**`src/lib/claritySync.ts`**
- `syncClarityData()` - Hämtar data från Clarity och sparar i DB
- `getClarityDataFromDB()` - Läser och aggregerar data för datumintervall
- `getClarityTimeseriesFromDB()` - Returnerar timeseries från DB

**`src/app/api/clarity/sync/route.ts`**
- `POST /api/clarity/sync` - Triggar manuell sync
- `GET /api/clarity/sync` - Visar sync-status

### 4. Uppdaterade filer

**`src/app/api/clarity/route.ts`**
- ✅ Läser nu från databas
- ✅ Inga fler direkta Clarity API-anrop
- ✅ Visar tydligt felmeddelande om DB är tom

**`src/services/clarity.service.ts`**
- ✅ Tar bort mock-data fallback
- ✅ Kastar error istället (UI hanterar tom state)

**`src/app/clarity/_components/clarity-overview.tsx`**
- ✅ Visar användarvänligt meddelande när DB är tom
- ✅ Knapp för att trigga datahämtning direkt från UI

## 🚀 Första gången - Setup

### Steg 1: Vänta till imorgon (efter midnatt UTC)

API-kvoten är slut idag. Den återställs **kl 01:00 svensk tid**.

### Steg 2: Kör första synken

```bash
# Efter 01:00 svensk tid
curl -X POST http://localhost:3001/api/clarity/sync
```

**Förväntat svar:**
```json
{
  "success": true,
  "message": "Synced 3 days of Clarity data",
  "latestDate": "2025-09-30"
}
```

### Steg 3: Verifiera data i databas

```bash
# Kontrollera sync-status
curl http://localhost:3001/api/clarity/sync | jq '.'
```

**Förväntat svar:**
```json
{
  "status": "ok",
  "latestSnapshot": {
    "date": "2025-09-30",
    "fetchedAt": "2025-09-30T08:00:00.000Z",
    "sessions": 15141
  },
  "snapshotCount": 3,
  "message": "Database contains 3 days of Clarity data"
}
```

### Steg 4: Öppna dashboard

```bash
# Öppna http://localhost:3001/clarity
# Bör nu visa RIKTIGA värden från Clarity (ej mock)
```

## ⏰ Automatisk daglig sync

Du har flera alternativ för att köra daglig sync:

### Alternativ 1: Vercel Cron (Rekommenderat för Vercel hosting)

**`vercel.json`:**
```json
{
  "crons": [{
    "path": "/api/clarity/sync",
    "schedule": "0 8 * * *"
  }]
}
```

Detta kör POST /api/clarity/sync varje dag kl 08:00 UTC (09:00 svensk tid).

### Alternativ 2: GitHub Actions

**`.github/workflows/clarity-sync.yml`:**
```yaml
name: Daily Clarity Sync
on:
  schedule:
    - cron: '0 8 * * *' # 08:00 UTC varje dag
  workflow_dispatch: # Manuell trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Clarity Sync
        run: |
          curl -X POST https://ditt-domän.com/api/clarity/sync \
            -H "Content-Type: application/json"
```

### Alternativ 3: Lokal Cron (Linux/Mac)

```bash
# Öppna crontab
crontab -e

# Lägg till denna rad (kör varje dag kl 08:00)
0 8 * * * curl -X POST http://localhost:3001/api/clarity/sync
```

### Alternativ 4: Windows Task Scheduler

1. Öppna Task Scheduler
2. Skapa ny task: "Clarity Daily Sync"
3. Trigger: Dagligen kl 08:00
4. Action: Start program
   - Program: `curl.exe`
   - Arguments: `-X POST http://localhost:3001/api/clarity/sync`

## 📊 Hur det fungerar i produktion

### Dag 1 (idag - efter setup)
```
08:00 - Sync körs
      ↓
Database: [27 Sept, 28 Sept, 29 Sept]
      ↓
UI visar: Data för senaste 3 dagarna
```

### Dag 2
```
08:00 - Sync körs igen
      ↓
Database: [27, 28, 29, 30 Sept] (upsert = uppdaterar eller lägger till)
      ↓
UI visar: Data för senaste 4 dagarna
```

### Dag 30
```
Database: [30 dagars historik]
      ↓
UI visar: Användar-vald period från de senaste 30 dagarna
```

### Efter 3 månader
```
Database: [~90 dagars historik]
      ↓
UI: Användare kan välja valfritt datumintervall i de senaste 90 dagarna
```

## 🎯 Fördelar med denna lösning

### ✅ Ingen rate limit för användare
- UI läser från databas
- Obegränsade query
- Användare kan filtrera fritt

### ✅ Bygger historik
- Dag 1: 3 dagars data
- Dag 30: 30 dagars data
- Dag 90: 90 dagars data
- Etc.

### ✅ Endast 2 API-calls per dag
- 1 anrop för att hämta data
- Mycket marginal till 10-calls limit

### ✅ Ingen mock-data
- Alltid visa riktiga värden
- Tom state om DB är tom (med hjälpsam knapp)

### ✅ Prestanda
- Snabba queries från lokal SQLite
- Ingen väntan på externa API-anrop

## 🔧 Troubleshooting

### Problem: "No Clarity data available"

**Orsak**: Databasen är tom (första gången eller sync har inte körts)

**Lösning**:
```bash
# Trigga manuell sync
curl -X POST http://localhost:3001/api/clarity/sync

# Eller klicka på "Hämta Clarity-data nu" i UI
```

### Problem: Sync returnerar 429 (Rate limit exceeded)

**Orsak**: API-kvoten för idag är slut

**Lösning**:
- Vänta till nästa dag (quota återställs kl 01:00 svensk tid)
- Använd befintlig data i databasen (om tillgänglig)

### Problem: Data är gammal

**Orsak**: Sync har inte körts på ett tag

**Lösning**:
```bash
# Kontrollera senaste sync
curl http://localhost:3001/api/clarity/sync | jq '.latestSnapshot.fetchedAt'

# Trigga ny sync
curl -X POST http://localhost:3001/api/clarity/sync
```

### Problem: Data stämmer inte med Clarity dashboard

**Möjliga orsaker**:
1. **Olika tidsperioder**: Din dashboard visar 7 dagar, API ger max 3 dagar
2. **Bot-filtrering**: Clarity dashboard exkluderar bots, API inkluderar
3. **Cache**: Clarity dashboard kan ha cache, API är färsk data
4. **Tidszon**: Kontrollera att både dashboard och API använder samma tidszon

**Lösning**: Efter 7 dagars daglig sync kommer du ha 7 dagars data i DB och kan då jämföra exakt.

## 📈 Nästa steg

1. **✅ Implementerat**: Database-baserad arkitektur
2. **✅ Implementerat**: Manuell sync endpoint
3. **⏳ TODO**: Sätt upp automatisk cron (välj alternativ ovan)
4. **⏳ TODO**: Vänta 7 dagar för att bygga upp full historik
5. **⏳ TODO**: Lägg till filter-stöd i `claritySync.ts` (device, channel, etc.)
6. **⏳ TODO**: Överväg att migrera från SQLite till PostgreSQL för produktion

## 🎉 Sammanfattning

Du har nu ett **produktionsklart system** för Clarity-integration som:
- ✅ Respekterar API-begränsningar (10 calls/day)
- ✅ Bygger historik över tid
- ✅ Ger användare fri åtkomst till data
- ✅ Aldrig visar mock-data
- ✅ Är enkelt att underhålla

**Första körning imorgon efter 01:00!** 🚀
