# QA-check v1.4.1

- inline_script_blocks: 0
- inline_onclick_with_userdata: 0   (favorieten nu via event-delegation)
- external_app_js: True
- install_prompt_count: 1
- version_badge_v1_4: True
- app_version_v1_4: True
- version_strings_consistent: True  (grep 'v1\.[0-9]' over alle bestanden — geen stale v1.1/v1.2/v1.3 meer)
- manifest_valid: True
- app_js_syntax_ok: True
- sw_cache_name: reiskompas-v1-4-1-static

## Aanbeveling voor de QA-stap
Voeg twee greps toe aan de pijplijn, want v1.3 miste stale versiestrings in title/meta/colofon:
- `grep -rno 'v1\.[0-9]' index.html app.js sw.js`  → alleen de huidige versie mag voorkomen
- `grep -n "onclick=\"[a-zA-Z]*('" app.js`           → geen inline onclick met geïnterpoleerde data
