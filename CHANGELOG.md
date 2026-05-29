# Changelog

## v1.4.2

UI-fix.

- **Tijdstipveld op iOS netjes in het kader.** De iOS-polish (appearance-reset, links uitlijnen, hoogte) gold alleen voor `input[type=date]`; nu ook voor `input[type=time]`, zodat "Rond hoe laat in de stad?" net als het datumveld links uitlijnt en niet meer gecentreerd in z'n kader zweeft.
- Versie + service-worker-cachenaam gebumpt naar v1.4.2 — dat forceert meteen de update op de volgende load (geen handmatige SW-refresh meer nodig).

## v1.4.1

Patch-release: laatste technische schuld + nieuwe app-icon.

- **localStorage-bezem.** Cache-sleutels van oudere versies worden bij het opstarten opgeruimd (Gemini-bevinding). Correct geschreven: keys eerst verzamelen, dán wissen — niet de index-shift-bug uit het voorbeeld.
- **`CACHE_PREFIX` afgeleid van `APP_VERSION`.** Kan niet meer handmatig uit sync raken.
- **Favorieten-migratie.** Eenmalige overname van favorieten uit oude versie-gebonden sleutels (v1.1–v1.3), zodat niemand z'n bewaarde plekken kwijtraakt door de de-versionering.
- **Offline hoofdmarker.** Bestemmingsmarker is nu een `circleMarker` (rust met cream rand) i.p.v. de standaard Leaflet-pin, die offline een 404 op z'n PNG gaf en onzichtbaar werd.
- **Nieuwe app-icon.** Kompasroos met serif-R in het thema (teal/rust/cream), omgebouwd naar full-bleed (geen witte rand of ingebakken hoeken meer), plus een aparte `maskable` variant met veilige zone. Manifest bijgewerkt.

## v1.4

Review-fix release (op basis van code-review van v1.3).

- **Favorietknop apostrof-bug verholpen.** Inline `onclick` vervangen door event-delegation; namen met een apostrof (O'Briens, L'Escale, "Mary's") werken nu. Nieuwe `escAttr()` escapet ook quotes in attribuutwaarden; openingstijden en adres worden nu ook ge-escaped.
- **Versiestrings gelijkgetrokken.** `<title>` en meta-description stonden nog op v1.2, de colofon op v1.1 — alles nu v1.4. Interne CSS-comment geneutraliseerd zodat een versie-grep schoon is.
- **Reisgezelschap doet nu iets.** Nieuwe `companionScore()` weegt mee in de ranking: Vrienden → bars/arcade omhoog, Gezin → speeltuin/park/dierentuin omhoog en nachtleven omlaag. Stuurt ook de volgorde van drinkplekken en het borrel-label in de dagplanning.
- **Hidden gems hersteld.** Sluit nu de al getoonde plekken uit (geen dubbeling met "Zien & doen") en pakt de eerste 3 niet-mainstream tips i.p.v. een willekeurige slice die soms leeg bleef. `museum` uit de mainstream-filter gehaald — bekendheid wordt al via wikidata/wikipedia bepaald.
- **Favorieten & install-voorkeur ge-de-versioneerd.** `FAV_KEY`/`INSTALL_KEY` niet langer aan het versienummer gekoppeld, zodat ze niet bij elke release verdwijnen. Alleen de data-cache (`CACHE_PREFIX`) blijft versie-gebonden.
- **Service worker cachet nu ook Leaflet** (CORS, via `allSettled` zodat install niet faalt). Kaartbibliotheek laadt daardoor ook offline; tiles/fonts blijven netwerk-afhankelijk maar de UI crasht niet.
- **Aparte debounce-timer per adresveld.** Snel wisselen tussen "heen" en "vertrek" annuleert elkaars lookup niet meer.
- Dode `boosts`-variabele verwijderd.

## v1.3

QA-fix release.

- Inline JavaScript uit `index.html` verwijderd.
- Alle applicatielogica geconsolideerd in `app.js`.
- Versienummer gelijkgetrokken naar v1.3.
- LocalStorage cache keys bijgewerkt naar v1.3.
- Service worker cache gebumpt naar `reiskompas-v1-3-static`.
- Manifest gecontroleerd en opgeschoond.
- Install-prompt aanwezig gehouden in de HTML.
- Bronbadge-tekst voor Overpass fallback verduidelijkt.

## v1.2

- Datumveld polish voor iOS.
- Header-logo gelijkgetrokken met app-icon.
- Versiebadgecontrast verbeterd.

## v1.1

- Overpass failover.
- LocalStorage caching.
- Favorieten.
- Kindvriendelijke ranking.
- "Niet iedereen kent deze".
- Printknop.
- PWA-bestanden toegevoegd.
