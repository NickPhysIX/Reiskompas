# Changelog

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
