# Changelog

## v2.0-beta.14

Generaliseerbare classificatie-fixes (audit naar aanleiding van het ijssalon-/Hoog Catharijne-onderzoek). Deze gelden wereldwijd, niet per stad.

- **#1 — `tourism=attraction`-ruis aangepakt.** Die OSM-tag is een vergaarbak die aan van alles hangt. Een "kale" attraction (geen naam, geen wiki-koppeling, geen ondersteunend subtype zoals museum/historisch/kunst) wordt nu sterk laag gerankt in plaats van als volwaardige bezienswaardigheid getoond. Echte, benoemde of gedocumenteerde attracties blijven gewoon bovenaan; er wordt niets hard weggefilterd.
- **#3 — Nette Nederlandse labels.** POI-labels toonden rauwe OSM-tags ("fast food", "place of worship", "bureau de change"). Er is nu een NL-labelmap (snackbar, kerk/gebedshuis, ijssalon, uitzichtpunt, kasteel, ...) met nette fallback voor onbekende tags. Een kasteel met zowel `historic=castle` als `tourism=attraction` toont nu "kasteel" i.p.v. "bezienswaardigheid".
- **#4 — Speeltuinen kapen de lijst niet meer.** Met kinderen erbij werden `playground` + `zoo` altijd als extra query toegevoegd, ook bij een specifieke interesse als Musea. Speeltuinen/dierentuinen worden nu alleen los opgehaald als je géén eigen interesses koos; anders weegt kindvriendelijkheid via de scoring mee.
- **#6 — Grote attracties niet meer afgekapt.** De fetch-limiet voor attracties ging van 100 → 180, zodat als ways/relations gemapte grote attracties (stadspark, dierentuin, kasteelterrein) niet wegvallen vóór de afstandssortering — zelfde klasse fout als eerder bij parkeren.

Niet in deze versie (bewust uitgesteld): #2 (hard filteren op boost-match bij shop-interesses) en #5 (herziening van de "verborgen parels"-definitie) — beide deels productkeuzes.

## v2.0-beta.13

Classificatie en Utrecht-overlay.

- IJssalons (`amenity=ice_cream`) worden uit **Zien & doen** gehouden en horen voortaan bij **Eten**.
- Kindvriendelijke selectie haalt geen ijssalons meer als hoofdactiviteit op.
- Known-places overlay toegevoegd voor Utrecht/Binnenstad:
  - Hoog Catharijne als mall/winkelcentrum.
  - Hoog Catharijne foodcourt / food area als foodcourt.
  - Parkeergarage Croeselaan / Jaarbeurszijde als aankomst-/parkeeroptie.
- Known plekken worden alleen toegevoegd wanneer ze binnen een redelijke afstand van het focusgebied vallen.
- Bekende plekken krijgen een korte toelichting in de UI.
- Versie, manifestmetadata en service-worker cache bijgewerkt naar v2.0-beta.13.

## v2.0-beta.12

Fixes op de horeca/winkel-uitbreiding van beta.11.

- **Foodcourt sneuvelde bij keukenfilter — opgelost.** Een foodcourt bevat ~alle keukens maar heeft zelden een `cuisine`-tag, waardoor hij wegviel zodra je een specifiek keukenfilter (bv. Italiaans) koos — juist wanneer hij het nuttigst is. Foodcourts (`amenity=food_court`) passeren het keukenfilter nu altijd.
- **Mall-query aangescherpt tegen ruis.** De interesse Mall/winkelcentrum matchte via `building~retail|commercial` élk pand met die tag, inclusief anonieme winkelpanden. De query eist nu een `name`-tag op die buildings, zodat alleen echte, benoemde winkelcentra/retailpanden meekomen (`shop=mall` en `food_court` blijven ongewijzigd).
- Versie, manifestmetadata en service-worker cache bijgewerkt naar v2.0-beta.12.

## v2.0-beta.11

Uitbreiding voor winkelcentra en foodcourts.

- Interesse **Mall / winkelcentrum** toegevoegd aan `Wat wil je zien of doen?`.
- Horeca-query uitgebreid met `amenity=food_court`.
- Keuken-/eetfilter **Foodcourt** toegevoegd.
- Foodcourts, malls en winkelgebieden krijgen duidelijkere labels.
- Foodcourt/winkelcentrum-hint toegevoegd bij eetresultaten wanneer relevant.
- Horeca-querylimiet verhoogd zodat stations-/mallclusters beter worden meegenomen.
- Versie, manifestmetadata en service-worker cache bijgewerkt naar v2.0-beta.11.

## v2.0-beta.10

QoL: logischere volgorde van het stadsdossier + losse kaartsectie.

Nieuwe volgorde van de resultaten, dichter bij de natuurlijke leesvolgorde van een uitje:

1. Weer op de gekozen datum/bestemming.
2. Reisadvies (auto/EV/OV) met parkeer- en laadopties en aankomstpuntkeuze.
3. Bereikbaarheid & verstoringen (werkzaamheden, spoor) — indien van toepassing.
4. **Kaart** (nieuwe eigen sectie) met de route/aankomstpunt, plus knoppen **Open in Google Maps** en **Open in Apple Maps**.
5. Zien & doen, verborgen parels, eten, drinken — op basis van je interesses.
6. Mijn dossier: gekozen POI's op een eigen dossierkaart + dossier opslaan.

- De routekaart zat eerst ín de reisadvies-sectie; die is losgetrokken naar een eigen sectie (`sec-map`) ná de verstoringen, zodat de volgorde parkeren → waarschuwingen → kaart klopt.
- Apple Maps-deeplink toegevoegd (`appleDeeplink`) naast de bestaande Google Maps-export; beide respecteren vertrekpunt, gekozen aankomstpunt en vervoersmodus.
- Sectienummering bijgewerkt naar de nieuwe volgorde (①–⑧).
- POI-dossierkaart en opslaan blijven onderaan, in die volgorde.
- Versie, manifestmetadata en service-worker cache bijgewerkt naar v2.0-beta.10.

## v2.0-beta.9

Fix: binnenstadsgarages ontbraken bij de aankomstopties.

- **Oorzaak:** Overpass levert resultaten in volgorde nodes → ways → relations en kapt af op de fetch-limiet. Grote binnenstadsgarages (Marktgarage, Zuidpoort, Phoenix) staan als *ways* in OSM. Binnen een straal van ~3 km zitten 40+ parkeer-*nodes*, dus de limiet van 40 was opgebruikt vóórdat één garage-way werd uitgevoerd. De afstandssortering kreeg die garages nooit te zien, met alleen losse node-parkings en afgelegen opties (station, IKEA) als gevolg.
- **Fix:** fetch-limiet voor parkeren verhoogd van 40 → 200, zodat álle parkeerfeatures binnen de straal terugkomen (nodes én ways). De bestaande client-side sortering op nabijheid zet daarna de dichtstbijzijnde — inclusief centrale garages — correct bovenaan.
- Idem voor OV-knooppunten (30 → 120) en laadpunten (40 → 80); stations zijn vaak ways/relations en werden om dezelfde reden afgekapt.
- Cache-sleutel bevat de limiet, dus oude (te krappe) parkeerresultaten worden automatisch ververst.
- Versie, manifestmetadata en service-worker cache bijgewerkt naar v2.0-beta.9.

## v2.0-beta.8

QA/QC-fixes op de selecteerbare-aankomstflow van beta.7.

- **Route-verlies bij mislukte herberekening opgelost.** `chooseArrival` overschrijft de route alleen nog als de herberekening lukt; faalt de routeserver, dan blijft de vorige route staan en verschijnt een nette waarschuwing in plaats van de misleidende "Geen route — vul een vertrekstad in".
- **Zichtbare voortgang.** De geklikte aankomstknop toont nu een pending-state ("Route bijwerken…", tijdelijk uitgeschakeld) i.p.v. een statusregel in de verborgen laad-overlay. Geen "doet-ie-iets?"-dubbelklik meer.
- **Async race-guard.** Snel achter elkaar van aankomstpunt wisselen kan niet meer tot een verkeerd getekende route leiden: een volgnummer negeert responses die niet bij de laatste keuze horen.
- **Default-aankomstpunt voorgeselecteerd.** Het automatisch gekozen dichtstbijzijnde parkeer-/OV-punt toont vanaf de eerste render meteen "✓ Aankomstpunt", zodat zichtbaar is waar de route naartoe gaat.
- Versie, manifestmetadata en service-worker cache bijgewerkt naar v2.0-beta.8.

### Bewust niet gewijzigd (uit QA)

- Geen "terug naar focusgebied"-optie toegevoegd; past bij de productrichting (concreet aankomstpunt). Te overwegen indien gewenst.
- Het label "📍 X m van focus" per optie blijft (klopt: afstand t.o.v. het focusgebied).

## v2.0-beta.7

Selecteerbare aankomstopties.

- Auto/EV: parkeergelegenheden tonen nu **Gebruik als aankomstpunt**.
- OV: OV-knooppunten tonen nu **Gebruik als aankomstpunt**.
- Gekozen aankomstpunt wordt gebruikt voor routekaart, reistijd en Maps-link.
- Route wordt client-side opnieuw berekend zonder nieuwe POI-/weer-/dossierqueries.
- Knopstatus toont welk aankomstpunt actief is.
- Hoofdkaart blijft voor aankomst/bereikbaarheid; dossierkaart blijft voor gekozen POI’s.
- Versie, manifestmetadata en service-worker cache bijgewerkt naar v2.0-beta.7.

## v2.0-beta.6

Praktischer aankomstpunt voor auto en OV.

- Auto/EV-route eindigt nu waar mogelijk bij de dichtstbijzijnde aanbevolen parkeerlocatie in plaats van bij het abstracte focuspunt.
- OV-plannerlinks richten zich nu waar mogelijk op het dichtstbijzijnde OV-knooppunt nabij het focusgebied.
- Tekst boven de hoofdkaart bijgewerkt: hoofdkaart = aankomst/bereikbaarheid; dossierkaart = gekozen POI's.
- Hoofdkaart toont niet langer alle gevonden POI's, om verwarring met de dossierkaart te voorkomen.
- Aankomstpunt wordt apart gemarkeerd op de kaart.
- Versie, manifestmetadata en service-worker cache bijgewerkt naar v2.0-beta.6.

## v2.0-beta.5

Nieuwe functie: tweede kaart met alleen je gekozen plekken.

- De hoofdkaart toont de auto-route en alle nabije POI's; de met **+** gemarkeerde plekken stonden nergens apart op een kaart.
- In de sectie **Mijn dossier** staat nu een eigen POI-kaart die uitsluitend jouw selectie toont, met kleurcodering (bezienswaardigheid/eten/drinken/parkeren), popups met naam + adres en een "Open in Maps"-link.
- De POI-kaart werkt live: zodra je **+** tikt of een plek verwijdert, wordt de kaart direct bijgewerkt zonder de hele pagina te herladen. De teller "x gekozen" loopt mee.
- Lege staat: zolang je niets koos, blijft de kaart verborgen met een korte uitleg in plaats van een lege grijze kaart.
- `#poi-map` deelt de styling van `#map`; legenda-stijlen toegevoegd.
- Versie, manifestmetadata en service-worker cache bijgewerkt naar v2.0-beta.5.

## v2.0-beta.4

Echte fix voor de "vertrek van"-bug (de beta.3-fix zat in de verkeerde functie).

- **Oorzaak gevonden:** `dest` en `dep` deelden `setupAutocomplete()`, en daarin hing een `resolveCustomArea()` aan blur/Enter. Die behandelde de getypte vertrektekst als een *gebied binnen de bestemming* (`resolveAreaText(q, state.dest)`), met Photon-bias naar de bestemmingscoördinaten. Bij bestemming Utrecht maakte dat van `Delft` het object `Helft van Delft`, dat zowel het vertrekveld overschreef als de gebiedsselectie vervuilde.
- De beta.3-aanscherping zat in `resolveCity` (scoring), maar het blur-pad liep nooit via `resolveCity` — vandaar dat het probleem bleef.
- **Fix:** in `setupAutocomplete` resolvet de fallback (blur/Enter) nu via `resolveTypedInput`/`resolveCity` als *stad*, niet als gebied. Het vertrekveld wordt daarbij niet overschreven en `state.area` wordt niet meer per ongeluk gezet.
- De legitieme `resolveCustomArea` blijft ongewijzigd in `setupAreaCustom` (alleen voor het focusgebied-veld).
- Versie, manifestmetadata en service-worker cache bijgewerkt naar v2.0-beta.4.

## v2.0-beta.3

- Plaatsherkenning aangescherpt: exacte plaatsnaam krijgt veel hogere prioriteit.
- Fuzzy matches zoals `Helft van Delft` worden afgestraft wanneer de gebruiker `Delft` bedoelt.
- Kleine bekende-plaatsenlaag toegevoegd voor Delft, Willemstad, Punda en Kissimmee.
- Vertrekpuntveld wordt bij automatische resolutie niet meer overschreven; de gebruikersinvoer blijft zichtbaar.
- Versie, manifestmetadata en service-worker cache bijgewerkt naar v2.0-beta.3.

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
