# Manual Cache Injection - Tillfällig lösning

## Problem
API-gränsen nådd men vi har faktisk data från tidigare test-anrop.

## Lösning
Skapa en temporär cache-fil baserad på redan hämtad data.

## Data vi fick från första anropet (27-29 Sept):

```json
{
  "sessions": 15141,
  "avgEngagementTime": 146,
  "avgScrollDepth": 55.85,
  "rageClicks": {
    "count": 23,
    "percentage": 0.07
  },
  "deadClicks": {
    "count": 1280,
    "percentage": 4.5
  },
  "quickBack": {
    "percentage": 29.69
  },
  "scriptErrors": {
    "count": 290
  },
  "source": "Clarity API"
}
```

## Observation

⚠️ **Viktigt**: Även denna data verkar skilja sig från Clarity dashboard:

**Vår API-data (27-29 Sept, 3 dagar):**
- Sessions: 15,141
- Dead clicks: 1,280 (4.5%)

**Clarity Dashboard (24-30 Sept, 7 dagar):**
- Sessions: 34,630
- Dead clicks: 1,505 (4.35%)

## Förklaring till skillnaden

Skillnaderna beror på:

1. **Olika tidsperioder**:
   - API: 27-29 Sept (3 dagar) - eftersom Clarity endast tillåter max 3 dagar per anrop
   - Dashboard: 24-30 Sept (7 dagar) - du valde "Senaste 7 dagarna"

2. **Bot-filtrering**:
   - API: Inkluderar alla sessions
   - Dashboard: Exkluderar 8,232 bot sessions (visas längst ner)

3. **Aggregering**:
   - För att få 7 dagars data behöver vi göra **3 separata API-anrop**:
     - Dag 1-3 (senaste 3 dagar)
     - Dag 4-6 (3 dagar sedan)
     - Dag 7 (1 dag sedan)
   - Detta skulle ta 6 API-anrop (overview + timeseries per period) = 60% av daglig quota

## Rekommendation för produktion

### Option A: Matcha Clarity's dashboard exakt
```typescript
// Gör 3 anrop för att få 7 dagars data
const last3Days = await fetchClarityData(numOfDays: 3);  // Anrop 1-2
const days4to6 = await fetchClarityData(numOfDays: 3, offset: 3); // STÖDS EJ AV API
const day7 = await fetchClarityData(numOfDays: 1, offset: 6);     // STÖDS EJ AV API
```

**Problem**: Clarity API stödjer inte `offset`-parameter. Vi kan bara få "senaste N dagar" (max 3).

### Option B: Visa endast 3 dagars data (REKOMMENDERAT)
```typescript
// Ändra UI till att endast visa "Senaste 3 dagarna"
// Detta matchar Clarity API's begränsning perfekt
```

Fördelar:
- 1 API-anrop för overview
- 1 API-anrop för timeseries
- = Endast 2 anrop per dashboard-load
- Kan göra 5 fullständiga loads per dag

### Option C: Schemalagd daglig sync till databas
```typescript
// Cron job varje morgon kl 08:00
// 1. Hämta senaste 3 dagars data från Clarity
// 2. Spara till Prisma database
// 3. UI läser från databas (obegränsat)
// 4. Data uppdateras 1x per dag
```

Detta är den mest produktionsklara lösningen.
