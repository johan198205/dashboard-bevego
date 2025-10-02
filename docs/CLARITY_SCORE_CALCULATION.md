# Clarity Score Beräkning

## Översikt

Clarity Score är en sammansatt poäng som mäter användarupplevelsen på webbplatsen baserat på Microsoft Clarity data. Poängen beräknas som en vägd summa av 6 normaliserade mätvärden på en skala från 0-100.

## Formel

```
Clarity Score = (Rage × 0.25) + (Dead × 0.20) + (Quickback × 0.15) + 
                (Script × 0.10) + (Engagement × 0.20) + (Scroll × 0.10)
```

## Viktning

| Mätvärde | Vikt | Beskrivning |
|----------|------|-------------|
| **Rage Clicks** | 25% | Användare som klickar snabbt och upprepade gånger |
| **Dead Clicks** | 20% | Klick på element som inte är klickbara |
| **Engagement Time** | 20% | Genomsnittlig tid användare spenderar på sidan |
| **Quick-back** | 15% | Användare som lämnar sidan snabbt |
| **Script Errors** | 10% | JavaScript-fel per 1000 sessioner |
| **Scroll Depth** | 10% | Hur långt användare scrollar på sidan |

## Normalisering (0-100 skala)

### 1. Rage Clicks (%)
- **0%** → 100 poäng
- **5%** → 50 poäng  
- **10%** → 0 poäng

### 2. Dead Clicks (%)
- **0%** → 100 poäng
- **5%** → 50 poäng
- **10%** → 0 poäng

### 3. Quick-back (%)
- **0%** → 100 poäng
- **10%** → 50 poäng
- **20%** → 0 poäng

### 4. Script Errors (per 1000 sessioner)
- **0** → 100 poäng
- **10** → 70 poäng
- **50** → 0 poäng

### 5. Engagement Time (sekunder)
- **10s** → 20 poäng
- **30s** → 70 poäng
- **60s** → 100 poäng

### 6. Scroll Depth (%)
- **25%** → 30 poäng
- **50%** → 70 poäng
- **75%** → 100 poäng

## Betyg

| Poäng | Betyg | Färg |
|-------|-------|------|
| **≥80** | "Bra" | 🟢 |
| **60-79** | "Behöver förbättras" | 🟡 |
| **<60** | "Dålig" | 🔴 |

## Exempel

### Scenario:
- Rage Clicks: 2% → 80 poäng
- Dead Clicks: 3% → 70 poäng
- Quick-back: 8% → 60 poäng
- Script Errors: 5 per 1k → 85 poäng
- Engagement: 45s → 85 poäng
- Scroll Depth: 60% → 80 poäng

### Beräkning:
```
Score = (80×0.25) + (70×0.20) + (60×0.15) + (85×0.10) + (85×0.20) + (80×0.10)
Score = 20 + 14 + 9 + 8.5 + 17 + 8
Score = 76.5 → 77 poäng
```

### Resultat:
**77 poäng = "Behöver förbättras"** 🟡

## Implementering

### Fil: `src/lib/clarity-score.ts`
- `normalizeMetric()` - Normaliserar värden till 0-100 skala
- `computeClarityScore()` - Beräknar total poäng och betyg

### Konfiguration: `src/lib/theme-tokens.ts`
- `clarityScoreConfig` - Innehåller vikter, breakpoints och betygströsklar

## Fokusområden

Systemet fokuserar mest på att minska:
1. **Rage Clicks** (25% vikt) - Förbättra användarupplevelse
2. **Dead Clicks** (20% vikt) - Fixa klickbara element
3. **Engagement Time** (20% vikt) - Öka användarintresse

## Tekniska Detaljer

- **Piecewise Linear Mapping**: Använder linjär interpolation mellan breakpoints
- **Vägd Summa**: Alla vikter summerar till 1.0 (100%)
- **Avrundning**: Slutpoäng avrundas till närmaste heltal
- **Edge Cases**: Hanterar fall med 0 sessioner (returnerar "N/A")

## Uppdateringar

Dokumentet skapades: 2025-10-02
Senast uppdaterat: 2025-10-02
