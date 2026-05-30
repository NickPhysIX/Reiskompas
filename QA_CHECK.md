# QA-check v2.0-beta.10

- version_beta_10: True
- sw_cache_beta_10: True
- app_js_syntax_ok: True
- section_order_reshuffle: True   # weer → reisadvies → verstoringen → kaart → POI's → dossier
- map_own_section: True           # routekaart losgetrokken naar sec-map, ná verstoringen
- single_map_container: True      # exact één #map in de render-output
- google_maps_export: True
- apple_maps_export: True         # appleDeeplink, respecteert dep/aankomstpunt/modus
- parking_fetch_limit_raised: True   # beta.9: 40 → 200, garage-ways niet meer afgekapt
- transit_fetch_limit_raised: True   # beta.9: 30 → 120
- arrival_route_preserved_on_fail: True  # beta.8
- arrival_pending_button_state: True     # beta.8
- arrival_async_race_guard: True         # beta.8
- arrival_default_preselected: True      # beta.8
- chooseArrival: True
- parking_arrival_buttons: True
- transit_arrival_buttons: True
- route_recalc_without_queries: True
