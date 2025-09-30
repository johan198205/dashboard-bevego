# Microsoft Clarity API - Begränsningar och Best Practices

## API Rate Limits

Microsoft Clarity Data Export API har **mycket strikta begränsningar**:

### Daglig gräns
- **10 anrop per projekt per dag**
- **Ingen exponential backoff hjälper** - gränsen är absolut
- **Återställs vid midnatt UTC**

### Praktiska konsekvenser

Med 10 anrop/dag och vår implementation:
- **Overview endpoint**: ~3-5 anrop (olika datumintervall/filter)
- **Timeseries endpoint**: ~3-5 anrop
- **= Snabbt slut på quota** om man testar/refreshar sidan flera gånger

## Vår lösning

### 1. Aggressiv cache (24h)
```typescript
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 timmar
```

**Varför så länge?**
- Clarity-data uppdateras inte i realtid ändå (fördröjning ~30 min)
- Quota är så liten att varje anrop måste räknas
- Data från igår är fortfarande värdefull

### 2. Persistent fallback-cache
När rate limit nås (HTTP 429):
```typescript
if (response.status === 429) {
  // Använd senaste lyckade data, oavsett ålder
  return getFromPersistentCache(cacheKey);
}
```

### 3. Mock-data som sista utväg
Om ingen cache finns alls, faller systemet tillbaka till mock-data så UI inte kraschar.

## Rekommendationer för produktion

### Alternativ 1: Begränsa UI-uppdateringar
```typescript
// Visa en varning när användare försöker ändra filter/datum
if (clarityApiCallsToday >= 8) {
  return {
    warning: "Clarity API-quota nästan slut. Data uppdateras imorgon.",
    data: cachedData
  };
}
```

### Alternativ 2: Schemalägg daglig data-fetch
Istället för on-demand:
- Kör ett cron-job varje morgon kl 08:00
- Gör exakt 3 anrop: dagens data, gårdagens data, förra veckans data
- Spara i databas (Prisma)
- UI läser från databas istället för live API

```typescript
// cron/fetchClarityData.ts
export async function scheduledClarityFetch() {
  const client = getClarityClient();
  
  // Anrop 1: Senaste 3 dagarna
  const recent = await client.getMetrics({
    domain: 'mitt.riksbyggen.se',
    startDate: getDate(-3),
    endDate: getDate(0),
  });
  
  // Anrop 2: Förra veckan
  const lastWeek = await client.getMetrics({
    domain: 'mitt.riksbyggen.se',
    startDate: getDate(-10),
    endDate: getDate(-3),
  });
  
  // Spara till databas
  await prisma.claritySnapshot.create({
    data: {
      date: new Date(),
      recentData: recent,
      weekData: lastWeek,
    }
  });
}
```

### Alternativ 3: Kombinera Clarity med Google Analytics

Eftersom Clarity bara används för specifika UX-metrics:
- **Rage/Dead clicks, Quick-back, Script errors** → Clarity (10 calls/day OK)
- **Sessions, Users, Engagement** → Google Analytics 4 (mycket högre quota)

Detta ger bästa av två världar:
- GA4 för volymetrics (låt användare filtrera fritt)
- Clarity för kvalitativa UX-insights (begränsade men värdefulla)

## Felsökning

### Symptom: "Källa: Mock" visas istället för "Källa: Clarity API"

**Orsaker:**
1. **API rate limit nådd** (vanligast)
   ```
   Error: Clarity API error (429): Exceeded daily limit
   ```
   **Lösning**: Vänta till nästa dag, eller kontrollera cache

2. **API-nyckel saknas/felaktig**
   ```
   Error: Clarity API error (401): Unauthorized
   ```
   **Lösning**: Verifiera `CLARITY_API_KEY` i `.env.local`

3. **Ingen cache finns**
   - Första gången sidan laddas efter server restart
   - **Lösning**: Gör 1 test-anrop för att fylla cache

### Kontrollera cache-status

```bash
# Kolla server-loggar för cache-hits
✓ Returning cached Clarity data (age: 45 min)
✓ Fresh Clarity data fetched and cached
⚠️ Clarity API rate limit exceeded (10 calls/day). Using cached data.
```

### Manuellt testa cache

```bash
# Första anropet (borde cacha)
curl "http://localhost:3001/api/clarity?start=2025-09-27&end=2025-09-29&type=overview"

# Andra anropet (borde använda cache)
curl "http://localhost:3001/api/clarity?start=2025-09-27&end=2025-09-29&type=overview"

# Kolla loggar - borde se "Returning cached Clarity data"
```

## Slutsats

**Clarity API är inte designad för real-time dashboards med många användare.**

För produktionsmiljö, överväg:
- Schemalagd data-fetch en gång per dag
- Spara i databas
- Kombinera med GA4 för real-time metrics
- Informera användare om att Clarity-data uppdateras 1x/dag

Detta ger stabilare upplevelse och respekterar API-begränsningarna.
