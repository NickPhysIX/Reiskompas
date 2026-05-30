# QA-check v2.0-beta.14

- version_beta_14: True
- sw_cache_beta_14: True
- syntax_ok: True
- attraction_noise_penalty: True        # #1 kale tourism=attraction sterk laag gerankt, niet hard gefilterd
- substantial_attraction_helper: True   # #1 isSubstantialAttraction heuristiek
- nl_labels: True                        # #3 LABELS_NL map + nette fallback
- catlabel_historic_before_tourism: True # #3 kasteel toont 'kasteel' i.p.v. 'bezienswaardigheid'
- playground_default_gated: True         # #4 speeltuin/zoo alleen zonder gekozen interesses
- attractions_fetch_limit_180: True      # #6 100 -> 180
- icecream_not_in_doing_intact: True     # beta.13 intact
- utrecht_overlay_intact: True           # beta.13 intact
- beta12_foodcourt_filter_intact: True
- beta10_section_order_intact: True
- beta9_parking_limit_intact: True
- deferred_not_applied: True             # #2 en #5 bewust niet toegepast
