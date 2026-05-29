# Changelog

## v2.0-beta.2

Kleine QA/QC-fixrelease.

- Handmatige focusgebied-invoer explicieter gemaakt: het `area`-select-element wordt nu lokaal opgehaald in de custom-area resolver.
- Meta-description in `index.html` bijgewerkt naar de nieuwe stadsverkenner/dossier-scope.
- `esc()` aangescherpt: naast `<`, `>` en `&` worden nu ook quotes escaped.
- Enkele belangrijke stille foutafhandelingen geven nu `console.warn()` voor makkelijker live-debuggen.
- Versie, manifestmetadata en service-worker cache bijgewerkt naar v2.0-beta.2.

## v2.0-beta.1

- Subtiele footer toegevoegd met `door Niels Braakman`.
- **Over deze app**-modal toegevoegd.
- Modal bevat korte uitleg over doel, bronnen, privacyvriendelijke werking en beperkingen.
- Escape/click-buiten sluit de modal.
- Versie, manifestmetadata en service-worker cache bijgewerkt naar v2.0-beta.1.

## v2.0-beta

Beta-release op basis van v2.0-alpha.

- Bibliotheekknop toegevoegd bovenaan het startformulier.
- Opgeslagen dossiers kunnen nu worden bekeken zonder eerst een nieuwe zoekopdracht te genereren.
- `window.__dossier` wordt gezet vóór de dossiersectie wordt gerenderd.
- Reset selectie-knop toegevoegd aan het dossierpaneel.
- Dossierbibliotheek toont geselecteerde plekken als chips.
- Manifest opnieuw netjes gegenereerd.
- Versie, manifestmetadata en service-worker cache bijgewerkt naar v2.0-beta.

## v2.0-alpha

Grote scopewijziging: Reiskompas is nu een persoonlijke stadsverkenner, geen itinerary-planner.

- Dag-itinerary/routeplanning uit de hoofdflow gehaald.
- Sectie **Logische route** vervangen door **Mijn dossier**.
- Zoekradius toegevoegd rond gekozen focusgebied: 500 m, 1 km, 2 km, 3 km, 5 km, 10 km.
- Gebiedskeuze verduidelijkt: gebied = focuspunt, radius = zoekbereik.
- Dossiers lokaal opslaan met geselecteerde POI’s en notities.
- AI-prompt herschreven naar stadsadvies zonder uurplanning of route-itinerary.
- Startmodus **Ik reis erheen / Ik ben al in de buurt** behouden.
- Meerdaagse reizen expliciet buiten scope.
- Versie, manifestmetadata en service-worker cache bijgewerkt naar v2.0-alpha.

## v1.9.11

Bugfix-release voor te agressieve bestemmingsherkenning.

- Auto-resolve tijdens typen uitgeschakeld.
- Bestemming wordt nu pas vastgezet via suggestie, Enter, blur of Genereer.
- Voorkomt dat korte tussenstanden zoals `de` naar Duitsland-achtige resultaten springen.
- `resolveCity()` vraagt meerdere resultaten op en scoort deze op exacte plaatsnaam, plaats-type en landcode.
- Versie, manifestmetadata en service-worker cache bijgewerkt naar v1.9.11.

## v1.9.10

Hotfix op v1.9.9.

- Ontbrekende `sweepOldCaches()` hersteld zodat de init niet afhankelijk is van try/catch rond een ontbrekende functie.
- `setupAreaCustom()` gerepareerd: de niet-bestaande `key`-variabele is verwijderd.
- Handmatige buurtinvoer gebruikt nu een eigen `resolveCustomArea()` flow.
- Autocomplete/geocoder-fouten tonen nu een gebruikershint in de buurt-hintregel.
- Getypte bestemming wordt bij genereren genormaliseerd teruggeschreven naar het invoerveld.
- Versie, manifestmetadata en service-worker cache bijgewerkt naar v1.9.10.

## v1.9.9

Hotfix voor live/iOS initialisatie.

- Robuuste, idempotente `initReiskompas()` toegevoegd.
- Init draait nu zowel via `DOMContentLoaded`, direct wanneer het DOM al geladen is, als via een extra `load`-vangnet.
- `app.js` krijgt `defer` in `index.html`.
- Formulierbindings zijn toleranter gemaakt, zodat één mislukte binding niet de rest van de interface blokkeert.
- Getypte bestemmingen worden sneller automatisch resolved.
- Versie, manifestmetadata en service-worker cache bijgewerkt naar v1.9.9.

## v1.9.8

Bugfix-release voor bestemmingsinvoer.

- Getypte bestemmingen zoals `Delft` worden nu automatisch resolved zonder verplichte autocomplete-keuze.
- Auto-resolve toegevoegd na korte pauze, bij Enter en bij verlaten van het veld.
- Buurt-/focusdropdown wordt automatisch geladen zodra de bestemming is herkend.
- Vertrekplaats gebruikt dezelfde fallback-resolutie.
- Curaçao-labeling robuuster gemaakt met coördinatenherkenning, zodat Willemstad/Jan Thiel niet als Europees Nederland worden weergegeven.
- Versie, manifestmetadata en service-worker cache bijgewerkt naar v1.9.8.

## v1.9.7

- Startmodus toegevoegd: **Ik reis erheen** versus **Ik ben al in de buurt**.
- Vertrekplaats wordt uitgeschakeld wanneer de gebruiker al in de buurt is.
- Reisadvies en verstoringen vanaf vertrekplaats worden in lokale modus overgeslagen.
- Routevoorstel start in lokale modus vanaf het gekozen focusgebied.
- AI-prompt uitgebreid met startmodus.
- Versie, manifestmetadata en service-worker cache bijgewerkt naar v1.9.7.

## v1.9.6

Route-leegtoestand & terugschakelen (polish).

- **Heldere leegtoestand met altijd een uitweg.** De route-sectie legt nu uit *waarom* er geen route is en biedt in elk geval één knop:
  - niets gekozen → "Gebruik suggesties toch";
  - alle gekozen plekken buiten het focusgebied → uitleg + "Gebruik suggesties voor dit gebied";
  - suggesties aan maar geen resultaat → "Terug naar alleen mijn selectie".
  Lost het stille "er gebeurt niets" op wanneer je selectie effectief leeg was.
- **Terugschakelen rondgemaakt.** "Gebruik alleen mijn selectie" verschijnt nu consequent zodra een route op suggesties draait, naast de bestaande "Gebruik suggesties toch".
- Dode `hasSelection`-variabele verwijderd; `localFavoriteCandidates` wordt in de leegtoestand nog maar één keer berekend.
- Versie en service-worker-cache naar v1.9.6.

## v1.9.5

Selectie & route polish.

- Route gebruikt standaard alleen actuele tripselecties.
- Automatische route uit suggesties gebeurt alleen nog na expliciete keuze via **Gebruik suggesties toch**.
- `+` / `✓`-knoppen maken duidelijker dat het om **deze trip** gaat.
- Route-sectie toont geselecteerde plekken bovenaan.
- Route-sectie meldt lokaal genegeerde selecties buiten het focusgebied.
- AI-prompt blijft gebaseerd op actuele, lokaal relevante selectie.
- Versie, manifestmetadata en service-worker cache bijgewerkt naar v1.9.5.

## v1.9.4

Buurtdetectie uit adresdata (Punda-fix).

- **Buurten afgeleid uit adresvelden.** Naast `place`-objecten leidt Reiskompas focusgebieden nu ook af uit `addr:suburb`/`addr:quarter`/`addr:city_district` van de opgehaalde POI's. Dit lost gevallen op als **Punda**, dat in OpenStreetMap niet als zelfstandig `place`-object bestaat maar wél in de adresdata zit. Werkt brononafhankelijk, dus ook voor Pietermaai, Scharloo, en wijken in Orlando/Utrecht.
- Een buurt wordt pas aangeboden bij minstens 2 POI's met dezelfde buurtnaam (ruisfilter); het ankerpunt is het zwaartepunt van die POI's.
- **Klikbare buurt-suggesties.** Onder "Zien & doen" verschijnen de in de resultaten gevonden buurten als chips ("Punda · 3×"); één klik herfocust de zoekopdracht op die buurt met kleinere straal.
- Verkeerd meervoud "tripselectieen" overal gecorrigeerd naar "tripselecties".
- Versie en service-worker-cache naar v1.9.4.

## v1.9.3

Rapid prototype bugfix/UX-release.

- Permanente favorieten omgebouwd naar sessiegebonden **Interessant voor deze trip**.
- Oude favorieten uit eerdere bestemmingen worden niet meer gemigreerd of opgeslagen.
- AI-prompt gebruikt alleen actuele, lokaal relevante tripselecties.
- Curaçao/CW-labeling verbeterd zodat Willemstad/Jan Thiel als Curaçao worden weergegeven i.p.v. Netherlands.
- Resultaten worden niet meer te vroeg afgeknipt; renderlaag gebruikt nu 'Laad meer'.
- 'Laad meer'-knoppen toegevoegd voor bezienswaardigheden, eten en drinken.
- Versie, manifestmetadata en service-worker cache bijgewerkt naar v1.9.3.

## v1.9.2

Bugfix-release voor routefavorieten.

- Favorieten worden nu gefilterd op afstand tot het huidige focusgebied.
- Alleen favorieten binnen 3 km worden automatisch meegenomen in de logische route.
- Oude favorieten uit andere steden/regio’s beïnvloeden nieuwe routes niet meer.
- Waarschuwing toegevoegd wanneer favorieten buiten het focusgebied zijn genegeerd.
- Extra sanity-warning toegevoegd voor routes langer dan 5 km.
- Versie, manifestmetadata en service-worker cache bijgewerkt naar v1.9.2.

## v1.9.1

Housekeeping-release op basis van Claude’s v1.9.

- README opgeschoond en teruggebracht tot huidige productbeschrijving.
- Verouderde verwijzingen naar dagplanning en ICS-export verwijderd.
- Terminologie gelijkgetrokken: **Logische route** in plaats van dagplanning.
- Versies, manifestmetadata en service-worker cache bijgewerkt naar v1.9.1.
- CHANGELOG blijft de plaats voor historische release-informatie.

## v1.9

Route op de kaart + route-fixes.

- **Rijroute als lijn op de Leaflet-kaart.** `osrmRoute` haalt nu de volledige geometrie op (`overview=full&geometries=polyline`); een meegeleverde polyline-decoder zet die om naar coördinaten. De route wordt in de rust-kleur over de kaart getekend (met crème 'casing' eronder voor contrast) en de kaart zoomt met `fitBounds` op de hele reis. Vertrek- en bestemmingspunt krijgen een eigen marker, met een bijschrift dat de lijn uitlegt.
- **Greedy-volgorde robuuster.** Een kandidaat zonder geldige coördinaat laat de bezoekvolgorde niet meer vastlopen of in willekeurige invoervolgorde achterblijven; het anker verschuift alleen bij een geldig punt.
- **Maps-waypointlimiet veiliger.** Cap teruggebracht van 8 naar 7 tussenpunten, zodat de Google Maps-URL onder de praktische limiet (~9 punten totaal) blijft en geen stops stilletjes wegvallen.
- Versie en service-worker-cache naar v1.9.

## v1.8

- Dagplanning/itinerary vervangen door **Logische route**.
- Routevoorstel gebruikt favorieten als primaire input.
- Als er nog geen favorieten zijn, gebruikt Reiskompas de hoogst gerankte bezienswaardigheden plus eten/drinken.
- Startpunt wordt automatisch gekozen uit parkeerplaats, OV-knooppunt, vertrekpunt of focusgebied.
- Greedy nearest-neighbour volgorde toegevoegd voor praktische bezoekvolgorde.
- Indicatieve afstanden tussen stops toegevoegd.
- Google Maps-link met waypoints toegevoegd.
- AI-prompt omgebouwd naar routeadvies zonder strak tijdschema.
- Versie en service-worker cache bijgewerkt naar v1.8.

## v1.7

- Sectie **Bereikbaarheid & verstoringen** toegevoegd.
- Dagplanning minder prominent gemaakt door deze in te klappen.
- Auto/EV-output aangevuld met routewegen en controlelinks voor verkeer/werkzaamheden.
- Voor Nederland links toegevoegd naar Rijkswaterstaat, van A naar Beter, 9292 en NS.
- OV-output aangevuld met praktische storings-/werkzaamhedencheck.
- AI-prompt uitgebreid zodat AI expliciet controleert op wegwerkzaamheden, spoorhinder, evenementen en andere verstoringen.
- Versie en service-worker cache bijgewerkt naar v1.7.

## v1.6.1
- AI-sectie vereenvoudigd.
- Alleen Gemini en ChatGPT zichtbaar als aanbevolen AI-opties.
- Claude en Grok verwijderd uit de standaardinterface.
- Kopieer prompt blijft model-onafhankelijk.

## v1.6

- AI-adviesprompt toegevoegd als optionele exportfunctie.
- Geen Gemini/OpenAI/Claude API-key nodig; de app genereert alleen een kopieerbare prompt.
- Links toegevoegd naar Gemini, ChatGPT en Claude.
- Prompt bevat bestemming, focusgebied, datum, vervoer, gezelschap, kinderen, interesses, weerindicatie, voorgestelde plekken, verborgen parels, eten/drinken, favorieten en indicatieve planning.
- Printweergave houdt de AI-prompt verborgen.
- Versie en service-worker cache bijgewerkt naar v1.6.

## v1.5 (Claude branch)

Gebaseerd op v1.4.2.

Belangrijkste toevoeging: ondersteuning voor buurt-/wijkfocus binnen een bestemming.

### Toegevoegd

- Wijk- en buurtselectie binnen een stad.
- Kleinere zoekstralen wanneer een specifiek focusgebied wordt gekozen.
- Afstandssortering voor:
  - parkeerlocaties
  - laadpunten
  - OV-knooppunten
- Verbeterde relevantie van resultaten binnen grotere steden en regio's.
- Oplossing voor situaties waarbij resultaten onbedoeld aan de rand van een stad terechtkwamen.

### Doel

Resultaten beter laten aansluiten op het daadwerkelijke gebied dat de gebruiker wil bezoeken in plaats van uitsluitend op de stadsnaam.

---

## v1.5 (ChatGPT branch)

Parallelle ontwikkeling gebaseerd op v1.4.2.

Alternatieve implementatie van bestemmingsfocus met nadruk op flexibiliteit en handmatige invoer.

### Toegevoegd

- Handmatige focusinvoer voor buurten en stadsdelen.
- Photon-gebaseerde autocomplete voor focusgebieden.
- Ondersteuning voor invoer zoals Centrum, Binnenstad, Punda en Downtown.
- Centrum-/binnenstad-fallback wanneer geen expliciete buurtinformatie beschikbaar is.
- Uitgebreidere detectie van buurten en lokale gebieden.

### Doel

Ook bruikbare resultaten genereren wanneer OpenStreetMap buurtinformatie onvolledig of inconsistent aanwezig is.

---

## v1.5.1 (Merge release)

Samenvoeging van de Claude v1.5 branch met geselecteerde verbeteringen uit de parallel ontwikkelde ChatGPT v1.5 branch.

### Behouden uit Claude v1.5

- Buurtfocus als hoofdmechanisme.
- Kleinere zoekstralen bij gekozen focusgebied.
- Afstandssortering voor parkeren, laadpunten en OV.
- Verbeterde lokale relevantie van resultaten.

### Overgenomen uit ChatGPT v1.5

- Handmatige focusinvoer.
- Photon-autocomplete voor buurten en stadsdelen.
- Centrum-/binnenstad-fallback.
- Uitgebreidere buurtdetectie.

### Overige wijzigingen

- Metadata opgeschoond.
- Versienummers gesynchroniseerd.
- README bijgewerkt.
- Service worker cacheversies gelijkgetrokken.
- QA-controles uitgevoerd.

### Resultaat

v1.5.1 combineert de nauwkeurigheid van de Claude-implementatie met de flexibiliteit van de ChatGPT-implementatie.
