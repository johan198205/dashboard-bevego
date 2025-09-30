# Clarity API Setup - Snabbguide

## 1. Lägg till API-nyckel

Skapa/uppdatera `.env.local` i projektets rot:

```bash
CLARITY_API_KEY=eyJhbGciOiJSUzI1NiIsImtpZCI6IjQ4M0FCMDhFNUYwRDMxNjdEOTRFMTQ3M0FEQTk2RTcyRDkwRUYwRkYiLCJ0eXAiOiJKV1QifQ.eyJqdGkiOiJmYjZmOGMyNS1iNDA2LTRjMmMtYjMwMi0zMjYzMDU5NTcwMWQiLCJzdWIiOiIxNzk5NDg1MzIxNTAwMDEwIiwic2NvcGUiOiJEYXRhLkV4cG9ydCIsIm5iZiI6MTc1OTIxMTgxMiwiZXhwIjo0OTEyODExODEyLCJpYXQiOjE3NTkyMTE4MTIsImlzcyI6ImNsYXJpdHkiLCJhdWQiOiJjbGFyaXR5LmRhdGEtZXhwb3J0ZXIifQ.K4KQGKKOSOBwEjjHlmNuqRKfoZvA8YszB1gdcBk29X5pfRJCjQTP2koR-cTuOmR18OaXoC9wKV0ulKUG3JgKezBOVzsrxXRzIsjdGl5IAQbrlsdSQhyHEv3r69pBuOxhlaAjf7U3WdQSUzB6E2jBJIt4Erv2p1O-WDzxtAk7MKBXOJRKYQVxSFtyh6T_wAUkVvynzYgQSuyvpAJzAUewvfBjwQl_HiL7bNI4QmN-2KAzeI44_Lwn2BWIs5kw_flzSwdfN247uOt6ru-VuwOLkC5da0CdLx5c1e0bwHlgRJooYureXlQP-04veNRkVxHqPlKRHoNtx920ZJC4NZSSHw
```

**VIKTIGT**: 
- `.env.local` får ALDRIG committas till git
- Lägg till i `.gitignore` om den inte redan finns där

## 2. Starta utvecklingsserver

```bash
npm run dev
```

## 3. Testa integrationen

1. Öppna `http://localhost:3000/clarity`
2. Verifiera att korten visar "Källa: Clarity API" (istället för "Källa: Mock")
3. Ändra datumintervall i UI och se att data uppdateras
4. Öppna DevTools → Network och verifiera att anrop går till `/api/clarity`

## 4. Felsökning

### Om "Källa: Mock" visas

- **Kontrollera att `.env.local` finns** i projektets rot (samma nivå som `package.json`)
- **Starta om dev-servern** efter att ha lagt till miljövariabeln
- **Kontrollera console** för felmeddelanden om Clarity API

### Om API-fel visas

- **Verifiera API-nyckel**: Kopiera hela JWT-strängen utan radbrytningar
- **Kontrollera nätverket**: Se DevTools → Network → `/api/clarity` för feldetaljer
- **Loggar**: Kolla terminalen där `npm run dev` körs för server-side fel

### Fallback till Mock

Om Clarity API inte är tillgängligt kommer systemet automatiskt att:
1. Logga varningen i konsolen
2. Visa mock-data istället
3. Fortsätta fungera utan krasch

Detta är avsiktligt beteende för robust felhantering.

## 5. Säkerhetskontroll

Innan deploy till produktion:

```bash
# Bygg produktionsbundle
npm run build

# Verifiera att API-nyckeln INTE finns i klientbundles
grep -r "CLARITY_API_KEY" .next/static/
# Ska returnera 0 resultat

# Alternativt, sök efter JWT-början
grep -r "eyJhbGciOiJSUzI1NiIsImtpZCI" .next/static/
# Ska returnera 0 resultat
```

Om något hittas: **STOPPA DEPLOY** och undersök omedelbart.

## Nästa steg

Se `CLARITY_INTEGRATION.md` för detaljerad dokumentation om:
- Arkitektur och dataflöde
- API-endpoints och parametrar
- Datamappning
- Caching-strategi
- Testning
- Kända begränsningar
