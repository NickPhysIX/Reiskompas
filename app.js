
/* =========================================================================
   Reiskompas — keyless city-trip prep.
   Bronnen: Nominatim + Photon (geocoding), Open-Meteo (weer + klimatologie),
   Overpass/OpenStreetMap (POI's), OSRM (auto-route), Leaflet (kaart).
   Alles client-side, geen API-keys.
   ========================================================================= */

const $ = id => document.getElementById(id);
function setFieldHint(id, msg){
  const el=$(id);
  if(el && msg) el.textContent=msg;
}

const APP_VERSION = '2.0-beta.5';
const CACHE_PREFIX = 'reiskompas-cache-v'+APP_VERSION+':';  // afgeleid → kan niet uit sync raken
const INSTALL_KEY = 'reiskompas-install-dismissed'; // idem — gebruikersvoorkeur, geen cache
const TTL = { weather: 6*60*60*1000, poi: 7*24*60*60*1000, food: 3*24*60*60*1000, route: 6*60*60*1000 };
const sourceStatus = { overpass: 'live' };
const MAX_ROUTE_FAVORITE_DISTANCE_KM = 3;
const ROUTE_TOTAL_WARNING_KM = 5;
let routeFavoriteWarning = null;
let displayCounts = { attractions: 9, eats: 9, drinks: 9 };
let routeUseSuggestions = false;
let favorites = []; // trip-specifieke selectie; niet persistent
const DOSSIER_KEY = 'reiskompas-dossiers-v2-alpha';

function cacheKey(type, parts){ return CACHE_PREFIX + type + ':' + parts.map(p=>String(p ?? '').toLowerCase()).join('|'); }
function cacheGet(type, parts, ttl){
  try{
    const raw = localStorage.getItem(cacheKey(type, parts));
    if(!raw) return null;
    const item = JSON.parse(raw);
    if(!item || Date.now() - item.t > ttl) return null;
    return item.v;
  }catch(e){ console.warn('cacheGet failed', e); return null; }
}
function cacheSet(type, parts, val){
  try{ localStorage.setItem(cacheKey(type, parts), JSON.stringify({t:Date.now(), v:val})); }catch(e){}
}
function loadFavorites(){ return []; }
function sweepOldCaches(){
  try{
    const kill=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k && k.startsWith('reiskompas-cache-') && !k.startsWith(CACHE_PREFIX)) kill.push(k);
    }
    kill.forEach(k=>localStorage.removeItem(k));
  }catch(e){}
}
function saveFavorites(){ /* selectie blijft alleen in deze browser-sessie */ }
function migrateFavorites(){ /* v1.9.3: oude permanente tripselecties bewust niet migreren */ }
function favId(e){ return e && e.id ? e.id : ((e?.tags?.name||'')+'@'+Math.round((e?.lat||0)*10000)+','+Math.round((e?.lon||0)*10000)); }
function isFav(e){ const id=favId(e); return favorites.some(f=>f.id===id); }
function toggleFavorite(btn){
  const id  = btn && btn.dataset ? btn.dataset.fav : null;
  const raw = btn && btn.dataset ? btn.dataset.poi : null;
  if(!id || !raw) return;
  let poi; try{ poi = JSON.parse(decodeURIComponent(raw)); }catch(e){ return; }
  const ix = favorites.findIndex(f=>f.id===id);
  if(ix>=0) favorites.splice(ix,1); else favorites.unshift(poi);
  saveFavorites();
  const on = ix<0;
  document.querySelectorAll(`[data-fav="${CSS.escape(id)}"]`).forEach(b=>{
    b.classList.toggle('on',on); b.textContent=on?'✓':'+';
    b.title=on?'Verwijder uit deze trip':'Neem mee in deze trip';
  });
  // tweede kaart live bijwerken zonder de hele pagina te herrenderen
  try{ if($('poi-map')||$('poi-map-empty')) initPoiMap(); }catch(e){ console.warn('initPoiMap failed', e); }
  const dossierSec=$('sec-dossier'); const cnt=dossierSec?dossierSec.querySelector('.count'):null;
  if(cnt) cnt.textContent=favorites.length?`${favorites.length} gekozen`:'lokaal';
}
function serializePoi(e, tag){ return encodeURIComponent(JSON.stringify({id:favId(e), name:e.tags.name, tag:tag||catLabel(e), lat:e.lat, lon:e.lon, address:addr(e.tags)})); }
function asNum(n){ return Math.round(Number(n)*1000)/1000; }

function displayCountry(country, cc=''){
  const code=String(cc||'').toLowerCase();
  const raw=String(country||'').trim();
  const overrides={cw:'Curaçao',aw:'Aruba',sx:'Sint Maarten',bq:'Caribbean Netherlands'};
  if(overrides[code]) return overrides[code];
  if(/curacao|curaçao/i.test(raw)) return 'Curaçao';
  return raw || '';
}

function isCuracaoCoords(lat, lon){
  lat=Number(lat); lon=Number(lon);
  return isFinite(lat)&&isFinite(lon) && lat>11.7 && lat<12.5 && lon>-69.5 && lon<-68.5;
}
function normalizeCountry(country, cc='', lat=null, lon=null){
  if(isCuracaoCoords(lat,lon)) return 'Curaçao';
  return displayCountry(country, cc);
}

function displayPlaceName(place, fallback=''){
  if(!place) return fallback;
  const name=place.name || fallback || '';
  const country=normalizeCountry(place.country, place.cc, place.lat, place.lon);
  if(!country) return name;
  return `${name}, ${country}`;
}



/* ---------- interesse → OSM tags ---------- */
const INTERESTS = [
  {id:'musea',     label:'Musea',            em:'🏛️', osm:['nwr["tourism"="museum"]']},
  {id:'arch',      label:'Architectuur',     em:'🏰', osm:['nwr["historic"~"castle|monument|tower|city_gate|fort|ruins"]','nwr["tourism"="attraction"]']},
  {id:'kunst',     label:'Kunst & galerie',  em:'🎨', osm:['nwr["tourism"="gallery"]','nwr["amenity"="arts_centre"]']},
  {id:'natuur',    label:'Parken & natuur',  em:'🌳', osm:['nwr["leisure"~"park|garden"]','nwr["tourism"="zoo"]']},
  {id:'comics',    label:'Stripwinkels',     em:'📚', osm:['nwr["shop"="books"]','nwr["shop"="anime"]'], boost:/comic|strip|manga|graphic/i},
  {id:'lego',      label:'LEGO & speelgoed', em:'🧱', osm:['nwr["shop"="toys"]'], boost:/lego|bricks?/i},
  {id:'gaming',    label:'Gaming',           em:'🎮', osm:['nwr["shop"~"video_games|games"]','nwr["leisure"="amusement_arcade"]']},
  {id:'scifi',     label:'Boekhandels',      em:'🚀', osm:['nwr["shop"="books"]'], boost:/sci|fantasy|fiction|boek/i},
  {id:'winkelen',  label:'Winkelen',         em:'🛍️', osm:['nwr["shop"~"mall|department_store"]']},
  {id:'view',      label:'Uitzicht & foto',  em:'📷', osm:['nwr["tourism"~"viewpoint|artwork"]']},
  {id:'pretpark',  label:'Pretparken',       em:'🎢', osm:['nwr["tourism"="theme_park"]']},
  {id:'kidsfun',   label:'Kindvriendelijk',  em:'🧒', osm:['nwr["leisure"="playground"]','nwr["tourism"="zoo"]','nwr["amenity"="ice_cream"]','nwr["leisure"="park"]']},
];

const CUISINES = [
  {label:'Italiaans',   re:/italian|pizza/},
  {label:'Aziatisch',   re:/asian|chinese|japanese|thai|vietnamese|korean|indonesian|sushi|ramen/},
  {label:'Amerikaans',  re:/american|burger|bbq|barbecue/},
  {label:'Steakhouse',  re:/steak/},
  {label:'Frans',       re:/french/},
  {label:'Nederlands',  re:/dutch|pancake/},
  {label:'Mediterraan', re:/greek|turkish|lebanese|mediterranean|spanish|tapas/},
  {label:'Mexicaans',   re:/mexican|tex-mex/},
  {label:'Indiaas',     re:/indian/},
  {label:'Vega(n)',     re:/vegetarian|vegan/},
  {label:'Streetfood',  re:/street_food|fast_food/},
  {label:'Vis',         re:/seafood|fish/},
];

const state = {
  dest:null, dep:null, area:null, _areas:[],
  startMode:'travel',
  companions:new Set(['Samen']),
  interests:new Set(),
  eat:false, drink:false, noAlcohol:false,
  cuisines:new Set(),
};

/* ---------- build chips ---------- */
function buildChips(){
  const ic = $('interests');
  if(!ic) return;
  INTERESTS.forEach(it=>{
    const c=document.createElement('span');
    c.className='chip'; c.dataset.v=it.id;
    c.innerHTML=`<span class="em">${it.em}</span>${it.label}`;
    c.onclick=()=>{ c.classList.toggle('on'); toggleSet(state.interests,it.id,c); };
    ic.appendChild(c);
  });
  const cc=$('cuisines');
  if(!cc) return;
  CUISINES.forEach(cu=>{
    const c=document.createElement('span');
    c.className='chip'; c.dataset.v=cu.label; c.textContent=cu.label;
    c.onclick=()=>{ c.classList.toggle('on'); toggleSet(state.cuisines,cu.label,c); };
    cc.appendChild(c);
  });
  // companions
  if($('companions')) $('companions').querySelectorAll('.chip').forEach(c=>{
    if(state.companions.has(c.dataset.v)) c.classList.add('on');
    c.onclick=()=>{ c.classList.toggle('on'); toggleSet(state.companions,c.dataset.v,c); };
  });
  // start mode
  document.querySelectorAll('[data-start]').forEach(c=>{
    c.onclick=()=>{
      document.querySelectorAll('[data-start]').forEach(x=>x.classList.remove('on'));
      c.classList.add('on');
      state.startMode=c.dataset.start || 'travel';
      applyStartModeUI();
    };
  });
  applyStartModeUI();

  // eat / drink
  document.querySelectorAll('[data-eat]').forEach(c=>{
    c.onclick=()=>{
      c.classList.toggle('on');
      const on=c.classList.contains('on');
      if(c.dataset.eat==='eat'){ state.eat=on; $('cuisine-wrap').classList.toggle('hidden',!on); }
      else { state.drink=on; $('drink-wrap').classList.toggle('hidden',!on); }
    };
  });
  if($('nodrink-chip')) $('nodrink-chip').onclick=function(){
    const on=this.dataset.on!=='true'; this.dataset.on=on;
    this.classList.toggle('on',on); state.noAlcohol=on;
  };
}
function toggleSet(set,v,el){ if(el.classList.contains('on'))set.add(v); else set.delete(v); }

function applyStartModeUI(){
  const local = state.startMode === 'local';
  const depField=$('dep-field'), dep=$('dep'), hint=$('start-mode-hint');
  if(depField) depField.classList.toggle('disabled', local);
  if(dep) dep.disabled = local;
  if(hint) hint.textContent = local
    ? 'Je bent al in of rond het focusgebied. Reiskompas slaat reisadvies vanaf vertrekplaats over.'
    : 'Gebruik vertrekplaats, reisadvies, parkeren/OV en verstoringen.';
}


/* ---------- geocoding ---------- */

function formatPlaceInput(place, fallback=''){
  if(!place) return fallback;
  return displayPlaceName(place, fallback || place.name || '');
}
async function resolveTypedInput(key, opts={}){
  const inputId = key==='dest' ? 'dest' : 'dep';
  const inp=$(inputId);
  if(!inp) return null;
  const txt=inp.value.trim();
  if(txt.length<3) return null;
  if(state[key]) return state[key];

  const place = await resolveCity(txt);
  if(!place){
    if(key==='dest') setFieldHint('area-hint','Bestemming nog niet herkend. Kies eventueel een suggestie of druk Enter na het typen.');
    return null;
  }
  state[key]=place;
  if(key==='dest') inp.value=formatPlaceInput(place, txt);

  if(key==='dest'){
    resetAreaField();
    loadAreasFor(place);
  }
  return place;
}
function scheduleTypedResolve(key, delay=350){
  const timerKey = key==='dest' ? '_destResolveTimer' : '_depResolveTimer';
  clearTimeout(state[timerKey]);
  state[timerKey]=setTimeout(()=>resolveTypedInput(key).catch(()=>{}), delay);
}

function setupAutocomplete(inputId,listId,key){
  const inp=$(inputId), list=$(listId);
  if(!inp || !list) return;
  let timer=null;
  inp.addEventListener('input',()=>{
    state[key]=null;
    if(key==='dest') resetAreaField();
    const q=inp.value.trim();
    clearTimeout(timer);
    if(q.length<2){ list.classList.remove('open'); return; }
    /* v1.9.11: niet automatisch resolven tijdens typen; dat koos te vroeg verkeerde landen. */
    timer=setTimeout(async()=>{
      try{
        const r=await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=en`);
        const d=await r.json();
        list.innerHTML='';
        (d.features||[]).forEach(f=>{
          const p=f.properties||{};
          const city=p.name||p.city||'';
          const shownCountry=normalizeCountry(p.country,p.countrycode,f.geometry.coordinates[1],f.geometry.coordinates[0]);
          const ctx=[p.state,shownCountry].filter(Boolean).join(', ');
          const it=document.createElement('div');
          it.className='ac-item';
          it.innerHTML=`${city}<small>${ctx}</small>`;
          it.onclick=()=>{
            inp.value=city + (shownCountry?`, ${shownCountry}`:'');
            state[key]={lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0],
                        name:city,country:shownCountry,cc:(p.countrycode||'').toLowerCase()};
            list.classList.remove('open');
            if(key==='dest') loadAreasFor(state.dest);
          };
          list.appendChild(it);
        });
        list.classList.toggle('open',(d.features||[]).length>0);
      }catch(e){ list.classList.remove('open'); if(key==='dest') setFieldHint('area-hint','Autocomplete kon niet laden. Druk Enter of klik Genereer; Reiskompas probeert de stad alsnog te herkennen.'); }
    },260);
  });
  // Fallback wanneer de gebruiker wel typte maar niets uit de lijst koos.
  // BELANGRIJK: dest/dep zijn STEDEN, geen gebied binnen de bestemming.
  // Daarom resolven we hier via resolveTypedInput (resolveCity) en NIET via
  // resolveAreaText — dat laatste biaste naar state.dest en maakte van
  // "Delft" bij bestemming Utrecht het object "Helft van Delft".
  function resolveTypedCity(){
    if(state[key]) return;                 // al gekozen uit de suggestielijst
    if(inp.value.trim().length<3) return;  // te kort om zinvol te resolven
    resolveTypedInput(key).catch(()=>{});  // overschrijft het dep-veld niet
  }
  inp.addEventListener('blur',()=>{ setTimeout(resolveTypedCity, 120); });
  inp.addEventListener('keydown',e=>{
    if(e.key==='Enter'){
      e.preventDefault();
      resolveTypedCity();
      list.classList.remove('open');
    }
  });
  document.addEventListener('click',e=>{ if(!inp.contains(e.target)&&!list.contains(e.target)) list.classList.remove('open'); });
}
// fallback resolve via Nominatim if user typed but didn't pick
const KNOWN_PLACE_ALIASES = {
  'delft': {lat:52.0116, lon:4.3571, name:'Delft', country:'Nederland', cc:'nl'},
  'willemstad': {lat:12.1084, lon:-68.9335, name:'Willemstad', country:'Curaçao', cc:'cw'},
  'punda': {lat:12.1057, lon:-68.9320, name:'Punda', country:'Curaçao', cc:'cw'},
  'kissimmee': {lat:28.29196, lon:-81.40757, name:'Kissimmee', country:'United States', cc:'us'}
};

async function resolveCity(q){
  try{
    const rawFull=String(q||'').trim();
    const raw=rawFull.split(',')[0].trim().toLowerCase();
    if(KNOWN_PLACE_ALIASES[raw]) return {...KNOWN_PLACE_ALIASES[raw]};

    const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&addressdetails=1&accept-language=nl,en&q=${encodeURIComponent(q)}`;
    const r=await fetch(url);
    const arr=await r.json();
    if(!Array.isArray(arr) || !arr.length) return null;

    const scored=arr.map(p=>{
      const a=p.address||{};
      const nm=(a.city||a.town||a.village||a.municipality||a.hamlet||p.name||(p.display_name||q).split(',')[0]||'').trim();
      const display=(p.display_name||'').toLowerCase();
      const cls=`${p.class||''}/${p.type||''}`;
      const cc=(a.country_code||'').toLowerCase();
      let score=0;
      if(nm.toLowerCase()===raw) score+=100;
      if((p.name||'').trim().toLowerCase()===raw) score+=80;
      if(display.split(',')[0].trim()===raw) score+=70;
      if(['city','town','village','municipality'].some(k=>a[k])) score+=30;
      if(/administrative|place/i.test(cls)) score+=12;
      if(cc==='nl') score+=8;
      if(cc==='cw') score+=10;
      if(nm.toLowerCase().includes(raw) && nm.toLowerCase()!==raw) score-=35; // "Helft van Delft" is geen Delft
      if(!['city','town','village','municipality','hamlet'].some(k=>a[k]) && !(p.name||'').trim()) score-=15;
      return {p,nm,score};
    }).sort((a,b)=>b.score-a.score);

    const best=scored[0].p;
    const a=best.address||{};
    const name=scored[0].nm || String(q||'');
    return {lat:+best.lat,lon:+best.lon,name,
      country:normalizeCountry(a.country,a.country_code,+best.lat,+best.lon),
      cc:(a.country_code||'').toLowerCase()};
  }catch(e){ console.warn('resolveCity failed', e); return null; }
}

/* ---------- buurten / gebied + afstand ---------- */
function distLabel(km){
  if(km==null||isNaN(km)) return '';
  return km<1 ? `± ${Math.round(km*1000)} m` : `± ${km.toFixed(1).replace('.',',')} km`;
}
function withDistance(arr, anchor){
  if(anchor) arr.forEach(e=>{ e._dist = haversine(anchor,{lat:e.lat,lon:e.lon}); });
  return arr;
}
function resetAreaField(){
  state.area=null; state._areas=[];
  const sel=$('area'); if(sel){ sel.innerHTML='<option value="">Hele stad / automatisch centrum</option>'; }
  const inp=$('area-custom'); if(inp){ inp.value=''; inp.disabled=true; }
  const list=$('area-custom-ac'); if(list){ list.innerHTML=''; list.classList.remove('open'); }
  const h=$('area-hint'); if(h) h.textContent='Vult zich nadat je een bestemming kiest — handig in grote steden.';
}
async function resolveAreaPlace(text, city){
  const q=(text||'').trim();
  if(!q || !city) return null;
  try{
    const full=`${q}, ${city.name} ${city.country||''}`;
    const r=await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(full)}&limit=1&lang=en&lat=${city.lat}&lon=${city.lon}`);
    const d=await r.json();
    const f=(d.features||[])[0];
    if(!f) return null;
    const p=f.properties||{};
    const name=p.name||p.city||q;
    return {name, lat:f.geometry.coordinates[1], lon:f.geometry.coordinates[0], dist:haversine(city,{lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0]}), custom:true};
  }catch(e){ return null; }
}
// Leidt buurten af uit de adresvelden van POI's (addr:suburb/quarter/city_district).
// Lost gevallen op als Punda, dat in OSM niet als place-object bestaat maar wél in adressen.
function harvestAddressAreas(pois, city){
  const groups={};
  (pois||[]).forEach(e=>{
    const t=e.tags||{};
    const nm=(t['addr:suburb']||t['addr:quarter']||t['addr:city_district']||t['addr:neighbourhood']||'').trim();
    if(!nm) return;
    const key=nm.toLowerCase();
    if(key===(city.name||'').toLowerCase()) return;     // niet de stad zelf
    if(e.lat==null||e.lon==null) return;
    (groups[key]=groups[key]||{name:nm,lats:[],lons:[]});
    groups[key].lats.push(e.lat); groups[key].lons.push(e.lon);
  });
  return Object.values(groups).map(g=>{
    const lat=g.lats.reduce((s,v)=>s+v,0)/g.lats.length;   // zwaartepunt van de POI's
    const lon=g.lons.reduce((s,v)=>s+v,0)/g.lons.length;
    return {name:g.name, lat, lon, count:g.lats.length, dist:haversine(city,{lat,lon}), kind:'adres'};
  }).filter(a=>a.count>=2);   // minstens 2 POI's → naam is betekenisvol, geen ruis
}

async function fetchAreas(city){
  const seen=new Set(); const out=[];
  const add=a=>{
    if(!a || !a.name) return;
    const nm=(a.name||'').trim();
    const key=nm.toLowerCase();
    if(!nm || seen.has(key) || key===(city.name||'').toLowerCase()) return;
    seen.add(key); out.push(a);
  };

  // Extra useful default: actual centre/binnenstad if Photon can resolve it.
  const center = await resolveAreaPlace('centrum binnenstad', city);
  if(center) add({...center, name:'Centrum / binnenstad'});

  const els = await overpass(
    ['nwr["place"~"suburb|neighbourhood|quarter|city_district|borough|locality"]["name"]'],
    city.lat, city.lon, 15000, 120, 'areas');
  for(const e of els){
    const nm=(e.tags.name||'').trim();
    const dist=haversine(city,{lat:e.lat,lon:e.lon});
    if(dist<=20) add({name:nm, lat:e.lat, lon:e.lon, dist, kind:e.tags.place||catLabel(e)});
  }

  // Punda-fix: buurten die niet als place-object bestaan, afleiden uit adresvelden van POI's.
  try{
    const tagged = await overpass(
      ['nwr["addr:suburb"]','nwr["addr:quarter"]','nwr["addr:city_district"]'],
      city.lat, city.lon, 6000, 300, 'area-addr');
    harvestAddressAreas(tagged, city).forEach(a=>{ if(a.dist<=20) add(a); });
  }catch(e){}

  out.sort((a,b)=>a.dist-b.dist || a.name.localeCompare(b.name,'nl'));
  return out.slice(0,35);
}
async function loadAreasFor(city){
  if(!city) return;
  const sel=$('area'), h=$('area-hint'), inp=$('area-custom');
  state.area=null; state._areas=[];
  if(sel) sel.innerHTML='<option value="">Hele stad / automatisch centrum</option><option value="__loading">Buurten laden…</option>';
  if(inp){ inp.disabled=false; inp.value=''; }
  if(h) h.textContent='Buurten laden…';
  const areas = await fetchAreas(city);
  state._areas = areas;
  if(sel){
    sel.innerHTML='<option value="">Hele stad / automatisch centrum</option>';
    areas.forEach((a,i)=>{
      const o=document.createElement('option');
      o.value=i; o.textContent=`${a.name}`;
      sel.appendChild(o);
    });
    sel.onchange=()=>{ const v=sel.value; state.area = v===''?null:(state._areas[+v]||null); if($('area-custom')) $('area-custom').value=''; };
  }
  if(h) h.textContent = areas.length
    ? `${areas.length} focusgebieden gevonden — kies er één, of typ zelf bijv. Centrum, Punda, TU Delft.`
    : 'Geen aparte buurten gevonden; typ eventueel zelf een focusgebied.';
}

async function resolveAreaText(q, city){
  try{
    const full=`${q}, ${city.name} ${city.country||''}`;
    const r=await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(full)}&limit=1&lang=en&lat=${city.lat}&lon=${city.lon}`);
    const d=await r.json();
    const f=(d.features||[])[0];
    if(!f) return null;
    const p=f.properties||{};
    const name=p.name||p.city||q;
    return {name, lat:f.geometry.coordinates[1], lon:f.geometry.coordinates[0], dist:haversine(city,{lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0]}), custom:true};
  }catch(e){ console.warn('resolveAreaText failed', e); return null; }
}

function setupAreaCustom(){
  const inp=$('area-custom'), list=$('area-custom-ac'), sel=$('area');
  if(!inp || !list) return;
  let timer=null;
  inp.addEventListener('input',()=>{
    const q=inp.value.trim();
    state.area=null;
    if(sel) sel.value='';
    clearTimeout(timer);
    if(q.length<2 || !state.dest){ list.classList.remove('open'); return; }
    timer=setTimeout(async()=>{
      try{
        const full=`${q}, ${state.dest.name} ${state.dest.country||''}`;
        const r=await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(full)}&limit=6&lang=en&lat=${state.dest.lat}&lon=${state.dest.lon}`);
        const d=await r.json();
        list.innerHTML='';
        (d.features||[]).forEach(f=>{
          const p=f.properties||{};
          const name=p.name||p.city||q;
          const ctx=[p.city&&p.city!==name?p.city:null,p.state,p.country].filter(Boolean).join(', ');
          const it=document.createElement('div');
          it.className='ac-item';
          it.innerHTML=`${esc(name)}<small>${esc(ctx)}</small>`;
          it.onclick=()=>{
            inp.value=name;
            state.area={name, lat:f.geometry.coordinates[1], lon:f.geometry.coordinates[0], dist:haversine(state.dest,{lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0]}), custom:true};
            list.classList.remove('open');
          };
          list.appendChild(it);
        });
        list.classList.toggle('open',(d.features||[]).length>0);
      }catch(e){ console.warn('autocomplete failed', e); list.classList.remove('open'); }
    },260);
  });
  async function resolveCustomArea(){
    const q=inp.value.trim();
    if(q.length<2 || !state.dest) return null;
    const area = await resolveAreaText(q, state.dest);
    if(area){
      state.area=area;
      inp.value=area.name;
      const areaSel=$('area');
      if(areaSel) areaSel.value='';
      setFieldHint('area-hint',`Focus op ${area.name}.`);
    }else{
      setFieldHint('area-hint','Gebied niet herkend; probeer bijvoorbeeld Centrum, Binnenstad of een wijknaam.');
    }
    return area;
  }
  inp.addEventListener('blur',()=>{ setTimeout(()=>resolveCustomArea().catch(()=>{}), 120); });
  inp.addEventListener('keydown',e=>{
    if(e.key==='Enter'){
      e.preventDefault();
      resolveCustomArea().catch(()=>{});
      list.classList.remove('open');
    }
  });
  document.addEventListener('click',e=>{ if(!inp.contains(e.target)&&!list.contains(e.target)) list.classList.remove('open'); });
}

/* ---------- weather ---------- */
const WCODE={0:['Helder','☀️'],1:['Overwegend zonnig','🌤️'],2:['Half bewolkt','⛅'],3:['Bewolkt','☁️'],
  45:['Mist','🌫️'],48:['Mist','🌫️'],51:['Motregen','🌦️'],53:['Motregen','🌦️'],55:['Motregen','🌧️'],
  61:['Lichte regen','🌧️'],63:['Regen','🌧️'],65:['Zware regen','🌧️'],71:['Lichte sneeuw','🌨️'],
  73:['Sneeuw','❄️'],75:['Zware sneeuw','❄️'],80:['Buien','🌦️'],81:['Buien','🌧️'],82:['Zware buien','⛈️'],
  95:['Onweer','⛈️'],96:['Onweer + hagel','⛈️'],99:['Zwaar onweer','⛈️']};
function wlabel(c){ return WCODE[c]||['Wisselend','🌥️']; }

async function getWeather(lat,lon,date){
  const cached = cacheGet('weather',[asNum(lat),asNum(lon),date],TTL.weather);
  if(cached) return cached;
  const today=new Date(); today.setHours(0,0,0,0);
  const target=new Date(date+'T00:00:00');
  const diff=Math.round((target-today)/86400000);
  // binnen forecast-venster (en niet in verleden)
  if(diff>=0 && diff<=15){
    try{
      const u=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`+
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max`+
        `&timezone=auto&start_date=${date}&end_date=${date}`;
      const d=await(await fetch(u)).json();
      if(d.daily&&d.daily.time.length){
        const out = {kind:'fc',code:d.daily.weather_code[0],
          max:Math.round(d.daily.temperature_2m_max[0]),min:Math.round(d.daily.temperature_2m_min[0]),
          precip:d.daily.precipitation_probability_max[0]??null,wind:Math.round(d.daily.wind_speed_10m_max[0])};
        cacheSet('weather',[asNum(lat),asNum(lon),date],out);
        return out;
      }
    }catch(e){}
  }
  // anders: klimatologie — gemiddelde van die kalenderdag over afgelopen 5 jaar
  const out = await getClimatology(lat,lon,target);
  if(out) cacheSet('weather',[asNum(lat),asNum(lon),date],out);
  return out;
}
async function getClimatology(lat,lon,target){
  const mmdd=`${String(target.getMonth()+1).padStart(2,'0')}-${String(target.getDate()).padStart(2,'0')}`;
  const years=[]; const base=new Date().getFullYear()-1;
  for(let y=base;y>base-5;y--) years.push(y);
  try{
    const reqs=years.map(y=>{
      const ds=`${y}-${mmdd}`;
      const u=`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}`+
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto`+
        `&start_date=${ds}&end_date=${ds}`;
      return fetch(u).then(r=>r.json()).catch(()=>null);
    });
    const res=await Promise.all(reqs);
    let mx=[],mn=[],pr=[],codes=[];
    res.forEach(d=>{
      if(d&&d.daily&&d.daily.time&&d.daily.time.length){
        if(d.daily.temperature_2m_max[0]!=null)mx.push(d.daily.temperature_2m_max[0]);
        if(d.daily.temperature_2m_min[0]!=null)mn.push(d.daily.temperature_2m_min[0]);
        if(d.daily.precipitation_sum[0]!=null)pr.push(d.daily.precipitation_sum[0]);
        if(d.daily.weather_code[0]!=null)codes.push(d.daily.weather_code[0]);
      }
    });
    if(!mx.length) return null;
    const avg=a=>a.reduce((s,v)=>s+v,0)/a.length;
    const wetDays=pr.filter(v=>v>=1).length;
    // meest representatieve code = mediaan-ish: pak meest voorkomende
    const codeMode=codes.sort((a,b)=>codes.filter(v=>v===a).length-codes.filter(v=>v===b).length).pop();
    return {kind:'clim',code:codeMode??2,max:Math.round(avg(mx)),min:Math.round(avg(mn)),
      precip:Math.round(100*wetDays/pr.length),wind:null,nYears:mx.length};
  }catch(e){ return null; }
}
function weatherAdvice(w){
  const t=[];
  if(w.max>=26)t.push('warm — neem water en zonnebescherming mee');
  else if(w.max>=20)t.push('aangenaam — een laagje voor de avond volstaat');
  else if(w.max>=12)t.push('fris — een jas is prettig');
  else if(w.max>=4)t.push('koud — warme jas, sjaal');
  else t.push('vriezend — dik inpakken');
  if(w.precip!=null && w.precip>=40)t.push('flinke kans op neerslag — <b>regenjas of paraplu mee</b>');
  else if(w.precip!=null && w.precip>=20)t.push('kans op een bui');
  if(w.wind!=null && w.wind>=40)t.push('stevige wind');
  return t.join(' · ');
}

/* ---------- Overpass ---------- */
const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
async function overpass(clauses,lat,lon,radius=4500,limit=80,cacheType='poi'){
  if(!clauses.length) return [];
  const cacheParts = [cacheType, clauses.join(','), asNum(lat), asNum(lon), radius, limit];
  const cached = cacheGet('overpass', cacheParts, cacheType==='food'?TTL.food:TTL.poi);
  if(cached){ sourceStatus.overpass='cache'; return cached; }
  const body=`[out:json][timeout:25];(`+
    clauses.map(c=>`${c}(around:${radius},${lat},${lon});`).join('')+
    `);out center ${limit};`;
  let lastErr=null;
  for(const endpoint of OVERPASS_SERVERS){
    try{
      const ctrl = new AbortController();
      const timer = setTimeout(()=>ctrl.abort(), 28000);
      const r=await fetch(endpoint,{method:'POST',body:'data='+encodeURIComponent(body),signal:ctrl.signal});
      clearTimeout(timer);
      if(!r.ok) throw new Error('Overpass '+r.status);
      const d=await r.json();
      const out=(d.elements||[]).map(e=>({
        id:e.type[0]+e.id, tags:e.tags||{},
        lat:e.lat??e.center?.lat, lon:e.lon??e.center?.lon
      })).filter(e=>e.lat&&e.tags.name);
      cacheSet('overpass', cacheParts, out);
      sourceStatus.overpass = endpoint.includes('kumi')?'live/fallback':endpoint.includes('lz4')?'live/fallback':'live';
      return out;
    }catch(e){ lastErr=e; }
  }
  sourceStatus.overpass='error';
  console.warn('Overpass unavailable', lastErr);
  return [];
}
function dedupe(arr){
  const seen=new Set(); const out=[];
  for(const e of arr){ const k=(e.tags.name||'').toLowerCase()+Math.round(e.lat*1000);
    if(!seen.has(k)){ seen.add(k); out.push(e);} }
  return out;
}
function addr(t){
  const s=[t['addr:street'],t['addr:housenumber']].filter(Boolean).join(' ');
  const c=[t['addr:postcode'],t['addr:city']].filter(Boolean).join(' ');
  return [s,c].filter(Boolean).join(', ')||'';
}
function gmaps(lat,lon,name){return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;}
function osmLink(id){return `https://www.openstreetmap.org/${id.startsWith('n')?'node':id.startsWith('w')?'way':'relation'}/${id.slice(1)}`;}

function poiCard(e,tag,extra=''){
  const t=e.tags;
  const id=favId(e);
  const on=isFav(e);
  const oh=t.opening_hours?`<div class="oh">🕒 ${esc(t.opening_hours)}</div>`:`<div class="oh na">openingstijden n.b.</div>`;
  const a=addr(t); const ad=a?`<div class="ad">${esc(a)}</div>`:`<div class="ad na">adres n.b.</div>`;
  const di=e._dist!=null?`<div class="oh">📍 ${distLabel(e._dist)}</div>`:'';
  return `<div class="poi">
    <button class="fav-btn ${on?'on':''}" data-fav="${escAttr(id)}" data-poi="${serializePoi(e,tag)}" title="${on?'Verwijder uit deze trip':'Neem mee in deze trip'}" type="button">${on?'✓':'+'}</button>
    ${tag?`<div class="tag">${esc(tag)}</div>`:''}
    <div class="nm">${esc(t.name)}</div>
    ${ad}${oh}${di}${extra}
    <a class="lk" href="${gmaps(e.lat,e.lon)}" target="_blank" rel="noopener">Open in kaart →</a>
  </div>`;
}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function escAttr(s){return (s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

/* ---------- routing (OSRM, auto) ---------- */
async function osrmRoute(o,d){
  try{
    const u=`https://router.project-osrm.org/route/v1/driving/${o.lon},${o.lat};${d.lon},${d.lat}?overview=full&geometries=polyline&steps=true`;
    const r=await(await fetch(u)).json();
    if(!r.routes||!r.routes.length) return null;
    const rt=r.routes[0];
    const refs=[];
    (rt.legs||[]).forEach(l=>(l.steps||[]).forEach(s=>{
      if(s.ref) s.ref.split(';').forEach(x=>{ x=x.trim(); if(x&&!refs.includes(x))refs.push(x); });
    }));
    return {km:(rt.distance/1000).toFixed(0),min:Math.round(rt.duration/60),roads:refs.slice(0,8),
            geometry: rt.geometry ? decodePolyline(rt.geometry) : null};
  }catch(e){ return null; }
}
// OSRM 'polyline' = Google encoded polyline, precisie 5 → array van [lat,lon]
function decodePolyline(str, precision=5){
  let index=0, lat=0, lng=0; const coords=[]; const factor=Math.pow(10,precision);
  while(index<str.length){
    let result=0, shift=0, b;
    do{ b=str.charCodeAt(index++)-63; result|=(b&0x1f)<<shift; shift+=5; }while(b>=0x20);
    lat += (result&1)?~(result>>1):(result>>1);
    result=0; shift=0;
    do{ b=str.charCodeAt(index++)-63; result|=(b&0x1f)<<shift; shift+=5; }while(b>=0x20);
    lng += (result&1)?~(result>>1):(result>>1);
    coords.push([lat/factor, lng/factor]);
  }
  return coords;
}
function haversine(a,b){
  const R=6371,toR=x=>x*Math.PI/180;
  const dLat=toR(b.lat-a.lat),dLon=toR(b.lon-a.lon);
  const s=Math.sin(dLat/2)**2+Math.cos(toR(a.lat))*Math.cos(toR(b.lat))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(s),Math.sqrt(1-s));
}
function busyness(date,time){
  const d=new Date(date+'T'+(time||'10:00'));
  const day=d.getDay(), h=d.getHours();
  const weekday=day>=1&&day<=5;
  if(weekday&&((h>=7&&h<9)||(h>=16&&h<19))) return {lvl:'high',txt:'spits — reken op vertraging op de ring en invalswegen'};
  if(weekday&&h>=9&&h<16) return {lvl:'mid',txt:'daluren — doorgaans vlot, lokaal drukte rond knooppunten'};
  if(!weekday&&h>=11&&h<17) return {lvl:'mid',txt:'weekend-middag — drukte rond centrum en attracties'};
  return {lvl:'low',txt:'rustig verwacht op dit tijdstip'};
}


/* ---------- ranking ---------- */
function childScore(e,kids){
  if(kids==='none') return 0;
  const t=e.tags||{}, hay=((t.name||'')+' '+(t.tourism||'')+' '+(t.leisure||'')+' '+(t.amenity||'')+' '+(t.shop||'')).toLowerCase();
  let s=0;
  if(kids==='0-4'){
    if(/playground|park|garden|zoo|ice_cream/.test(hay)) s+=8;
    if(/gallery|monument|memorial|ruins/.test(hay)) s-=3;
  } else if(kids==='5-12'){
    if(/lego|toy|playground|zoo|theme_park|science|museum|aquarium|ice_cream/.test(hay)) s+=7;
    if(/gallery|memorial/.test(hay)) s-=2;
  } else if(kids==='13-18'){
    if(/arcade|games|video|mall|shop|museum|viewpoint|artwork|cinema|comic|manga/.test(hay)) s+=6;
  }
  if(t.opening_hours) s+=1;
  if(addr(t)) s+=1;
  return s;
}
function interestScore(e, chosen){
  const t=e.tags||{}, hay=((t.name||'')+' '+Object.values(t).join(' ')).toLowerCase();
  let s=0;
  chosen.forEach(it=>{ if(it.boost && it.boost.test(hay)) s+=12; });
  if(t.tourism==='museum') s+=2;
  if(t.tourism==='attraction') s+=1;
  if(t.wikidata || t.wikipedia) s+=3;
  return s;
}
function companionScore(e, companions){
  if(!companions || !companions.size) return 0;
  const t=e.tags||{}, am=t.amenity||'', le=t.leisure||'', to=t.tourism||'';
  let s=0;
  if(companions.has('Vrienden')){ if(/bar|pub|nightclub|biergarten/.test(am)) s+=4; if(le==='amusement_arcade') s+=2; }
  if(companions.has('Gezin')){
    if(/playground|park|garden/.test(le) || /zoo|theme_park/.test(to) || am==='ice_cream') s+=4;
    if(/nightclub|bar|pub/.test(am)) s-=3;
  }
  return s;
}
function rankPlaces(arr, chosen, kids, companions){
  return arr.map((e,i)=>({e,i,s:interestScore(e,chosen)+childScore(e,kids)+companionScore(e,companions)}))
    .sort((a,b)=> b.s-a.s || ((a.e._dist??1e9)-(b.e._dist??1e9)) || a.i-b.i)
    .map(x=>x.e);
}
function hiddenGems(arr, shownIds){
  return arr.filter(e=>{
    if(shownIds && shownIds.has(favId(e))) return false;   // niet dubbel met "Zien & doen"
    const t=e.tags||{};
    const hay=((t.name||'')+' '+Object.values(t).join(' ')).toLowerCase();
    const mainstream = t.wikidata || t.wikipedia || /central|cathedral|palace|rijksmuseum|louvre|colosseum|eiffel/.test(hay);
    return !mainstream && (t.shop || t.leisure || t.amenity || t.tourism || t.historic);
  }).slice(0,3);
}
function sourceBadges(){
  const st=sourceStatus.overpass;
  const cls=st==='error'?'err':st==='cache'?'warn':'';
  const txt=st==='error'?'Overpass tijdelijk niet bereikbaar':st==='cache'?'OSM uit lokale cache':st==='live/fallback'?'OSM live data via fallback':'OSM live data';
  return `<div class="source-row"><span class="source-badge ${cls}">${txt}</span><span class="source-badge warn">Openingstijden/tarieven indicatief</span></div>`;
}

/* ---------- main ---------- */
async function generate(){
  const destText=$('dest').value.trim();
  const depText=state.startMode==='local' ? '' : $('dep').value.trim();
  const date=$('date').value;
  const time=$('time').value||'10:00';
  const mode=$('mode').value;
  const kids=$('kids').value;
  const radiusKm = Math.max(0.5, Number($('radius')?.value || 2));

  if(!destText||!date){ alert('Vul minstens een bestemming en datum in.'); return; }

  $('empty').style.display='none';
  $('content').classList.remove('on');
  $('loading').classList.add('on');
  const setStatus=s=>$('status').textContent=s;

  setStatus('Bestemming opzoeken…');
  let dest=state.dest|| await resolveCity(destText);
  let dep = depText ? (state.dep|| await resolveCity(depText)) : null;
  const cleanDestText = dest ? displayPlaceName(dest,destText) : destText;
  const cleanDepText = dep ? displayPlaceName(dep,depText) : depText;
  if(!dest){ setStatus(''); $('loading').classList.remove('on'); $('empty').style.display='block';
    alert('Bestemming niet gevonden — kies een suggestie uit de lijst of probeer een andere spelling.'); return; }
  if(!state.dest){ state.dest=dest; const di=$('dest'); if(di) di.value=formatPlaceInput(dest,destText); loadAreasFor(dest); }
  if(dep && !state.dep) state.dep=dep;

  const city = dest;                                 // stadcentrum (weer + route-doel als geen buurt)
  const anchor = state.area ? state.area : city;     // waar we omheen zoeken
  const tight = !!state.area;                        // buurt gekozen → kleinere straal
  const radiusM = Math.round(radiusKm * 1000);
  const R = { poi:radiusM, food:radiusM, park:Math.min(radiusM,3000), charge:Math.min(Math.max(radiusM,1500),5000), transit:Math.min(radiusM,3000) };
  const anchorName = state.area ? state.area.name : destText;

  // weer (altijd op stadsniveau)
  setStatus('Weer ophalen…');
  const weather=await getWeather(city.lat,city.lon,date);

  // attracties op interesses
  setStatus('Bezienswaardigheden zoeken…');
  let clauses=[];
  const chosen=INTERESTS.filter(it=>state.interests.has(it.id));
  (chosen.length?chosen:INTERESTS.filter(it=>['musea','arch','view'].includes(it.id)))
    .forEach(it=>clauses.push(...it.osm));
  if(kids !== 'none') clauses.push('nwr["leisure"="playground"]','nwr["tourism"="zoo"]','nwr["amenity"="ice_cream"]');
  clauses=[...new Set(clauses)];
  let attractions=withDistance(dedupe(await overpass(clauses,anchor.lat,anchor.lon,R.poi,100,'poi')),anchor);
  attractions = rankPlaces(attractions, chosen, kids, state.companions);  // score primair, afstand als tiebreak

  // eten / drinken
  let eats=[],drinks=[];
  if(state.eat||state.drink){
    setStatus('Eet- en drinkgelegenheden zoeken…');
    const food=withDistance(dedupe(await overpass(
      ['nwr["amenity"~"restaurant|cafe|fast_food|bar|pub|biergarten|ice_cream"]'],anchor.lat,anchor.lon,R.food,120,'food')),anchor);
    const cuiRes=CUISINES.filter(c=>state.cuisines.has(c.label));
    food.forEach(f=>{
      const am=f.tags.amenity;
      if(['bar','pub','biergarten'].includes(am)) drinks.push(f);
      else if(am==='cafe'){ drinks.push(f); if(state.eat) eats.push(f); }
      else eats.push(f);
    });
    if(cuiRes.length){
      eats=eats.filter(f=>{ const c=(f.tags.cuisine||'').toLowerCase();
        return cuiRes.some(cu=>cu.re.test(c)); });
    }
    // eten: kindvriendelijkheid als lichte voorkeur, daarna nabijheid
    eats.sort((a,b)=> (childScore(b,kids)-childScore(a,kids)) || (a._dist-b._dist));
    // drinken: voorkeur (alcoholvrij/gezelschap) als tier, daarna nabijheid
    const drinkPref=x=> (state.noAlcohol?(x.tags.amenity==='cafe'?2:0):0) + companionScore(x,state.companions);
    drinks.sort((a,b)=> (drinkPref(b)-drinkPref(a)) || (a._dist-b._dist));
    /* v1.9.3: niet vooraf afkappen; renderlaag doet 'laad meer' */
  }

  // vervoer
  setStatus('Reisinformatie samenstellen…');
  let route=null, parking=[], charging=[], stops=[];
  if(state.startMode!=='local' && (mode==='car'||mode==='ev')){
    if(dep) route=await osrmRoute(dep,anchor);
    parking=withDistance(dedupe(await overpass(['nwr["amenity"="parking"]'],anchor.lat,anchor.lon,R.park,40,'parking')),anchor)
              .sort((a,b)=>a._dist-b._dist);   // dichtstbijzijnde eerst → fixt 'IKEA-parkeren'
    if(mode==='ev') charging=withDistance(dedupe(await overpass(['nwr["amenity"="charging_station"]'],anchor.lat,anchor.lon,R.charge,40,'charging')),anchor)
              .sort((a,b)=>a._dist-b._dist);
  } else if(state.startMode!=='local' && mode==='transit'){
    stops=withDistance(dedupe(await overpass(
      ['nwr["public_transport"="station"]','nwr["railway"="station"]','nwr["railway"="tram_stop"]','nwr["station"="subway"]'],
      anchor.lat,anchor.lon,R.transit,30,'transit')),anchor).sort((a,b)=>a._dist-b._dist);
  }

  routeUseSuggestions=false;
  resetDisplayCounts();
  renderAll({dest:city,anchor,anchorName,tight,radiusKm,dep,destText:cleanDestText,depText:cleanDepText,date,time,mode,startMode:state.startMode,kids,weather,attractions,eats,drinks,route,parking,charging,stops});

  $('loading').classList.remove('on');
  $('content').classList.add('on');
}

/* ---------- render ---------- */
function stagger(){ document.querySelectorAll('#content .sec').forEach((s,i)=>{ s.style.animationDelay=(i*70)+'ms'; s.style.animation='none'; s.offsetHeight; s.style.animation=''; }); }


function visibleItems(arr, key){
  return (arr||[]).slice(0, displayCounts[key] || 9);
}
function moreButton(sectionKey, total){
  const current=displayCounts[sectionKey]||9;
  if(total<=current) return '';
  return `<div class="more-row"><button class="btn" type="button" onclick="loadMore('${sectionKey}')">Laad meer (${Math.min(current+9,total)} van ${total})</button></div>`;
}
function loadMore(sectionKey){
  displayCounts[sectionKey]=(displayCounts[sectionKey]||9)+9;
  if(window.__dossier) renderAll(window.__dossier);
}

function selectedTripItems(){
  const scoped = window.__dossier ? localFavoriteCandidates(window.__dossier).local : favorites;
  return scoped || [];
}
function selectionSummaryHTML(d){
  const scoped = localFavoriteCandidates(d).local;
  const ignored = localFavoriteCandidates(d).remote;
  const selected = scoped.map((f,i)=>`<span class="chip on" style="cursor:default">✓ ${esc(f.name)}</span>`).join(' ');
  const ignoredNote = ignored.length ? `<div class="na" style="margin-top:6px">Genegeerd buiten dit focusgebied: ${ignored.slice(0,4).map(f=>esc(f.name)).join(' · ')}${ignored.length>4?' …':''}</div>` : '';
  return `<div class="note" style="margin:0 0 11px"><b>Maak je eigen route:</b> tik op <b>+</b> bij plekken die je wilt meenemen. De route gebruikt standaard alleen jouw selectie.${scoped.length?`<div class="chips" style="margin-top:8px">${selected}</div>`:'<div class="na" style="margin-top:6px">Nog niets gekozen voor deze trip.</div>'}${ignoredNote}</div>`;
}
function useSuggestedRoute(){
  routeUseSuggestions=true;
  if(window.__dossier) renderAll(window.__dossier);
}
function useSelectionRoute(){
  routeUseSuggestions=false;
  if(window.__dossier) renderAll(window.__dossier);
}

function focusHarvestedArea(i){
  const a=(window.__harvestedAreas||[])[i];
  if(!a) return;
  state.area={name:a.name, lat:a.lat, lon:a.lon, dist:a.dist, custom:true};
  // dropdown/handmatig veld in lijn brengen voor de duidelijkheid
  const sel=$('area'); if(sel) sel.value='';
  const inp=$('area-custom'); if(inp) inp.value=a.name;
  const h=$('area-hint'); if(h) h.textContent=`Focus op ${a.name} (afgeleid uit adresdata).`;
  $('go').scrollIntoView({behavior:'smooth',block:'center'});
  generate();
}
function resetDisplayCounts(){
  displayCounts={ attractions:9, eats:9, drinks:9 };
}

function renderAll(d){
  // weather
  let wHTML;
  if(d.weather){
    const [lab,ico]=wlabel(d.weather.code);
    const dayStr=new Date(d.date+'T00:00:00').toLocaleDateString('nl-NL',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const badge=d.weather.kind==='fc'
      ? `<span class="badge fc">Verwachting</span>`
      : `<span class="badge clim">Typisch · ⌀ ${d.weather.nYears} jr</span>`;
    const precipTxt=d.weather.precip!=null
      ? (d.weather.kind==='fc'?`Neerslagkans ${d.weather.precip}%`:`Natte dagen ~${d.weather.precip}%`):'';
    wHTML=`<div class="weather">
      <div class="ico">${ico}</div>
      <div><div class="temps">${d.weather.max}°<small> / ${d.weather.min}°</small></div>
        <div class="desc">${lab}${d.weather.wind!=null?` · wind ${d.weather.wind} km/u`:''}</div></div>
      <div class="meta"><div class="day">${dayStr}</div>${badge}<br>${precipTxt}</div>
      <div class="advice">🧥 <b>Advies:</b> ${weatherAdvice(d.weather)}</div>
    </div>`;
  } else {
    wHTML=`<div class="weather"><div class="ico">🌥️</div><div class="desc na">Geen weergegevens beschikbaar voor deze datum/locatie.</div></div>`;
  }
  sec('sec-weather','Weer','①',wHTML,'');

  // do
  // buurt-suggesties afgeleid uit de opgehaalde POI's — alleen tonen als nog geen buurt gekozen
  let areaSuggest='';
  if(!d.tight){
    const harvested = harvestAddressAreas([...(d.attractions||[]), ...(d.eats||[]), ...(d.drinks||[])], d.dest)
      .sort((a,b)=> b.count-a.count || a.dist-b.dist).slice(0,6);
    if(harvested.length){
      window.__harvestedAreas = harvested;
      const chips = harvested.map((a,i)=>`<button class="chip" type="button" onclick="focusHarvestedArea(${i})">${esc(a.name)} · ${a.count}×</button>`).join(' ');
      areaSuggest = `<div class="na" style="margin:2px 0 6px">Buurten in de resultaten — klik om hierop te focussen: </div><div class="chips" style="margin-bottom:10px">${chips}</div>`;
    }
  }
  const areaCaption = `<div class="na" style="margin-bottom:8px">Focus: <b>${esc(d.anchorName)}</b> · zoekstraal <b>${d.radiusKm} km</b></div>`;
  const doHTML = areaCaption + areaSuggest + (d.attractions.length
    ? sourceBadges()+`<div class="grid">${visibleItems(d.attractions,'attractions').map(e=>poiCard(e,catLabel(e))).join('')}</div>${moreButton('attractions',d.attractions.length)}`
    : `<div class="note">Weinig gemapte plekken gevonden binnen deze straal. Probeer een grotere stad, een andere buurt of meer interesses aan te vinken — OpenStreetMap-dekking varieert per regio.</div>`);
  sec('sec-do','Zien & doen','②',doHTML, d.attractions.length?`${Math.min(displayCounts.attractions,d.attractions.length)} van ${d.attractions.length} plekken`:'');

  // hidden gems — sluit de al getoonde 9 uit
  const shownIds = new Set(visibleItems(d.attractions,'attractions').map(favId));
  const gems = hiddenGems(d.attractions, shownIds);
  if(gems.length){
    sec('sec-gems','Niet iedereen kent deze','②b',`<div class="grid">${gems.map(e=>poiCard(e,catLabel(e))).join('')}</div>`,`${gems.length} tips`);
  } else clearSec('sec-gems');

  // eat
  if(state.eat){
    const eatHTML = d.eats.length
      ? `<div class="grid">${visibleItems(d.eats,'eats').map(e=>poiCard(e,(e.tags.cuisine||'eten').split(';')[0],priceTag(e))).join('')}</div>${moreButton('eats',d.eats.length)}`
      : `<div class="note">Geen eetgelegenheden gevonden bij deze keuze${state.cuisines.size?' / keuken':''}. Probeer een andere keuken of vink er meer aan.</div>`;
    sec('sec-eat','Eten','③',eatHTML, d.eats.length?`${Math.min(displayCounts.eats,d.eats.length)} van ${d.eats.length}`:'');
  } else clearSec('sec-eat');

  // drink
  if(state.drink){
    const note=state.noAlcohol?`<div class="note" style="margin-bottom:11px">Alcoholvrij gekozen — koffiebars en cafés staan vooraan. OSM markeert mocktailbars niet apart, dus kies gerust op naam.</div>`:'';
    const drHTML = d.drinks.length
      ? note+`<div class="grid">${visibleItems(d.drinks,'drinks').map(e=>poiCard(e,e.tags.amenity)).join('')}</div>${moreButton('drinks',d.drinks.length)}`
      : `<div class="note">Geen drinkgelegenheden gevonden in de buurt.</div>`;
    sec('sec-drink','Drinken','④',drHTML, d.drinks.length?`${Math.min(displayCounts.drinks,d.drinks.length)} van ${d.drinks.length}`:'');
  } else clearSec('sec-drink');

  // travel
  if(d.startMode==='local'){
    sec('sec-travel','Startpunt','⑤', localStartHTML(d), 'lokaal');
    clearSec('sec-disruptions');
  } else {
    sec('sec-travel', travelTitle(d.mode),'⑤', travelHTML(d), '');
    sec('sec-disruptions','Bereikbaarheid & verstoringen','⑤b', disruptionsHTML(d), 'check vooraf');
  }

  // dossier
  window.__dossier={...d};
  sec('sec-dossier','Mijn dossier','⑥', dossierHTML(d), favorites.length?`${favorites.length} gekozen`:'lokaal');
  sec('sec-ai','AI-adviesprompt','⑦', aiPromptHTML(d), 'optioneel');

  // colophon
  $('colophon').innerHTML=`<b>Bronnen:</b> OpenStreetMap (Overpass) · Open-Meteo · OSRM · Nominatim/Photon · Leaflet.
    Live data waar mogelijk, met lokale cache en Overpass-failover. Geen API-keys. Prijzen, live verkeersdrukte en exacte OV-tijden zitten niet in gratis open bronnen — daarvoor staan doorkliks naar de officiële planners.
    <div class="regen"><button class="btn" onclick="document.getElementById('go').scrollIntoView({behavior:'smooth'})">↺ Plan aanpassen</button></div>`;

  // map
  setTimeout(()=>initMap(d),120);
  setTimeout(()=>initPoiMap(),150);
  stagger();
}

function sec(id,title,ix,html,count){
  $(id).innerHTML=`<div class="sec-head"><span class="ix">${ix}</span><h3>${title}</h3>${count?`<span class="count">${count}</span>`:''}</div>${html}`;
}
function clearSec(id){ $(id).innerHTML=''; }
function catLabel(e){
  const t=e.tags;
  if(t.tourism)return t.tourism.replace('_',' ');
  if(t.shop)return t.shop.replace('_',' ');
  if(t.historic)return t.historic.replace('_',' ');
  if(t.leisure)return t.leisure.replace('_',' ');
  if(t.amenity)return t.amenity.replace('_',' ');
  return 'plek';
}
function priceTag(e){
  // OSM heeft zelden prijzen; toon alleen iets als het er is
  const t=e.tags;
  if(t['price:range'])return `<div class="oh">💶 ${esc(t['price:range'])}</div>`;
  return '';
}


function isNetherlands(d){
  return (d.dest?.cc||'').toLowerCase()==='nl' || /netherlands|nederland/i.test(d.dest?.country||'');
}
function roadRefs(d){
  return (d.route?.roads||[]).filter(Boolean).slice(0,10);
}
function googleTrafficLink(d){
  const o=(d.startMode==='local') ? '' : (d.dep?`${d.dep.lat},${d.dep.lon}`:'');
  const tgt=d.anchor||d.dest;
  return `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${tgt.lat},${tgt.lon}&travelmode=driving`;
}
function nsLink(d){
  return 'https://www.ns.nl/reisplanner/';
}
function disruptionSearchLinks(d){
  const city=encodeURIComponent(d.destText||d.anchorName||'');
  const date=encodeURIComponent(d.date||'');
  const roads=encodeURIComponent(roadRefs(d).join(' '));
  return {
    rws:'https://www.rijkswaterstaat.nl/wegen/werkzaamheden',
    vanAnaarBeter:'https://www.vananaarbeter.nl/',
    googleTraffic: googleTrafficLink(d),
    ns: nsLink(d),
    nsStoringen:'https://www.ns.nl/reisinformatie/actuele-situatie-op-het-spoor',
    ov9292:'https://9292.nl/',
    webRoad:`https://www.google.com/search?q=${city}+${roads}+wegwerkzaamheden+${date}`,
    webRail:`https://www.google.com/search?q=${city}+trein+spoor+werkzaamheden+storing+${date}`
  };
}
function disruptionsHTML(d){
  const nl=isNetherlands(d);
  const links=disruptionSearchLinks(d);
  const roads=roadRefs(d);
  const roadText=roads.length?`<div class="roadlist">${roads.map(r=>`<span class="road ${/^N/.test(r)?'N':''}">${esc(r)}</span>`).join('')}</div>`:'<div class="na">Geen hoofdwegen afgeleid; vul een vertrekplaats in voor routecontext.</div>';
  const mode=d.mode;
  let cards='';

  if(mode==='car'||mode==='ev'){
    cards+=`<div class="check-card"><h4>🚧 Auto / weg</h4>
      <div class="sub2">Controleer op de reisdag kort voor vertrek. Reiskompas heeft geen live verkeersfeed.</div>
      ${roadText}
      <div class="actions" style="margin-top:11px">
        <a class="btn solid" target="_blank" rel="noopener" href="${links.googleTraffic}">Google Maps verkeer →</a>
        ${nl?`<a class="btn" target="_blank" rel="noopener" href="${links.vanAnaarBeter}">van A naar Beter →</a>
             <a class="btn" target="_blank" rel="noopener" href="${links.rws}">Rijkswaterstaat →</a>`:''}
        <a class="btn" target="_blank" rel="noopener" href="${links.webRoad}">Webcheck werkzaamheden →</a>
      </div>
      <ul>
        <li>Let op afsluitingen, omleidingen en evenementen rond het centrum/focusgebied.</li>
        <li>${nl?'Voor Nederland zijn Rijkswaterstaat/van A naar Beter de logische controlepunten.':'Buiten Nederland verschilt de beste bron per land; gebruik lokale verkeersdiensten of Maps/Waze.'}</li>
      </ul>
    </div>`;
  }

  if(mode==='transit' || mode==='foot' || mode==='bike'){
    cards+=`<div class="check-card"><h4>🚆 OV / spoor</h4>
      <div class="sub2">Live storingen, perrons en werkzaamheden zitten niet keyless in deze app.</div>
      <div class="actions" style="margin-top:11px">
        <a class="btn solid" target="_blank" rel="noopener" href="${links.ov9292}">9292 →</a>
        ${nl?`<a class="btn" target="_blank" rel="noopener" href="${links.ns}">NS Reisplanner →</a>
             <a class="btn" target="_blank" rel="noopener" href="${links.nsStoringen}">NS actuele situatie →</a>`:''}
        <a class="btn" target="_blank" rel="noopener" href="${links.webRail}">Webcheck spoor →</a>
      </div>
      <ul>
        <li>Controleer overstappen, perrons en laatste aansluitingen vlak voor vertrek.</li>
        <li>Bij grote events kan lokaal OV drukker zijn dan de planner vooraf suggereert.</li>
      </ul>
    </div>`;
  } else {
    cards+=`<div class="check-card"><h4>🚆 OV-backup</h4>
      <div class="sub2">Handig als parkeren of verkeer tegenvalt.</div>
      <div class="actions" style="margin-top:11px">
        <a class="btn" target="_blank" rel="noopener" href="${links.ov9292}">9292 →</a>
        ${nl?`<a class="btn" target="_blank" rel="noopener" href="${links.ns}">NS →</a>`:''}
      </div>
    </div>`;
  }

  cards+=`<div class="check-card"><h4>📌 Snelle checklist</h4>
    <ul>
      <li>Check verkeer/spoor nogmaals op de ochtend zelf.</li>
      <li>Controleer openingstijden van je top 2-3 plekken.</li>
      <li>Check of parkeren reserveren nodig is.</li>
      <li>Neem bij regen een compacte fallback binnenactiviteit.</li>
    </ul>
  </div>`;

  return `<div class="note disruption-note"><b>Indicatief:</b> deze sectie gebruikt doorkliks en routecontext, geen gegarandeerde live storingsdata. Voor beslissingen vlak voor vertrek blijven officiële planners leidend.</div>
    <div class="checklist" style="margin-top:12px">${cards}</div>`;
}



function localStartHTML(d){
  return `<div class="note"><b>Je bent al in de buurt.</b> Reiskompas toont daarom geen reisadvies vanaf een vertrekplaats. Kies interessante plekken met <b>+</b> en verken wat er rond <b>${esc(d.anchorName||d.destText)}</b> te doen is.</div><div id="map"></div>`;
}

function travelTitle(m){return {car:'Reisadvies — auto',ev:'Reisadvies — EV',transit:'Reisadvies — OV',bike:'Reisadvies — fiets',foot:'Reisadvies — te voet'}[m];}

function travelHTML(d){
  const m=d.mode;
  let cards='';
  if(m==='car'||m==='ev'){
    const b=busyness(d.date,d.time);
    const roads=(d.route?.roads||[]).map(r=>`<span class="road ${/^N/.test(r)?'N':''}">${esc(r)}</span>`).join('');
    cards+=`<div class="tcard">
      <h4>🚗 Rit ${d.depText?`vanaf ${esc(d.depText)}`:''}</h4>
      ${d.route?`<div class="big">${d.route.min} min</div><div class="sub2">± ${d.route.km} km · indicatief, zonder live verkeer</div>
        ${roads?`<div class="sub2" style="margin-top:9px">Vermoedelijke route:</div><div class="roadlist">${roads}</div>`:''}`
        : `<div class="na">Geen route — vul een vertrekstad in (en kies 'm uit de lijst).</div>`}
      <div class="busy" style="margin-top:11px"><span class="dot ${b.lvl}"></span>${b.txt}</div>
    </div>`;
    cards+=`<div class="tcard"><h4>🅿️ Parkeren — dichtstbij</h4>${
      d.parking.length? d.parking.slice(0,4).map(p=>{
        const fee=p.tags.fee==='yes'?'betaald':p.tags.fee==='no'?'gratis':'tarief n.b.';
        const cap=p.tags.capacity?` · ${p.tags.capacity} plaatsen`:'';
        const dl=p._dist!=null?` · 📍 ${distLabel(p._dist)}`:'';
        return `<div style="margin-bottom:7px"><b>${esc(p.tags.name||'Parkeergelegenheid')}</b>
          <div class="sub2">${fee}${cap}${dl} · <a class="lk" href="${gmaps(p.lat,p.lon)}" target="_blank" rel="noopener">kaart →</a></div></div>`;
      }).join('') : `<div class="na">Geen parkeerdata gevonden.</div>`}
      <div class="na" style="margin-top:6px">Exacte tarieven staan niet in OSM.</div>
    </div>`;
    if(m==='ev'){
      cards+=`<div class="tcard"><h4>⚡ Laadpunten</h4>${
        d.charging.length? d.charging.slice(0,4).map(c=>`<div style="margin-bottom:6px"><b>${esc(c.tags.name||c.tags.operator||'Laadpunt')}</b>
          <div class="sub2">${c.tags.socket?Object.keys(c.tags).filter(k=>k.startsWith('socket')).length+' aansluitingen':'aansluiting n.b.'}${c._dist!=null?` · 📍 ${distLabel(c._dist)}`:''} · <a class="lk" href="${gmaps(c.lat,c.lon)}" target="_blank" rel="noopener">kaart →</a></div></div>`).join('')
          :`<div class="na">Geen laadpunten gevonden in OSM.</div>`}
        <div class="na" style="margin-top:6px">Voor laadplanning onderweg: <a class="lk" style="display:inline" href="https://abetterrouteplanner.com" target="_blank" rel="noopener">A Better Routeplanner →</a></div>
      </div>`;
    }
  } else if(m==='transit'){
    cards+=`<div class="tcard"><h4>🚋 OV-knooppunten bij bestemming</h4>${
      d.stops.length? d.stops.slice(0,5).map(s=>`<div style="margin-bottom:5px"><b>${esc(s.tags.name)}</b>
        <div class="sub2">${(s.tags.railway||s.tags.station||s.tags.public_transport||'halte').replace('_',' ')}${s._dist!=null?` · 📍 ${distLabel(s._dist)}`:''}</div></div>`).join('')
        :`<div class="na">Geen OV-knooppunten gevonden in de buurt.</div>`}</div>`;
    cards+=`<div class="tcard"><h4>🕐 Tijden & route</h4>
      <div class="sub2">Live OV-tijden, perrons en overstappen zitten niet in gratis open bronnen. Plan de exacte reis via de officiële planner:</div>
      <div class="actions" style="margin-top:11px">
        <a class="btn solid" target="_blank" rel="noopener" href="${transitDeeplink(d)}">Reis plannen (Google) →</a>
        ${d.dest.cc==='nl'?`<a class="btn" target="_blank" rel="noopener" href="https://9292.nl">9292 →</a>`:''}
      </div></div>`;
  } else { // bike / foot
    const dist=d.dep?haversine(d.dep,d.anchor):null;
    const speed=m==='bike'?15:4.8;
    const mins=dist?Math.round(dist/speed*60):null;
    cards+=`<div class="tcard"><h4>${m==='bike'?'🚲 Fietsen':'🚶 Lopen'}</h4>
      ${dist?`<div class="big">± ${mins} min</div><div class="sub2">hemelsbreed ± ${dist.toFixed(1)} km · werkelijke route langer</div>`
        :`<div class="sub2">Ideaal binnen de stad. Vul een vertrekpunt in voor een schatting.</div>`}
      <div class="actions" style="margin-top:11px"><a class="btn solid" target="_blank" rel="noopener" href="${transitDeeplink(d)}">Route in kaart →</a></div>
    </div>`;
    cards+=`<div class="tcard"><h4>💡 Tip</h4><div class="sub2">${m==='bike'?'Veel steden hebben deelfietsen of OV-fiets bij stations. Check de lokale aanbieder.':'Comfortabele schoenen en een waterflesje. Plan pauzes als je kinderen meeneemt.'}</div></div>`;
  }
  const mapCap = (d.route && d.route.geometry)
    ? `<div class="na" style="margin:10px 0 4px">🗺️ De rode lijn toont de rijroute van ${esc(d.depText||'je vertrekpunt')} naar ${esc(d.anchorName||d.destText)} (via OSRM). Stippen zijn bezienswaardigheden, eten en parkeren.</div>`
    : `<div class="na" style="margin:10px 0 4px">🗺️ Stippen tonen bezienswaardigheden, eten en parkeren rond ${esc(d.anchorName||d.destText)}.</div>`;
  return `<div class="travel-grid">${cards}</div>${mapCap}<div id="map"></div>`;
}
function transitDeeplink(d){
  const o=(d.startMode==='local') ? '' : (d.dep?`${d.dep.lat},${d.dep.lon}`:'');
  const tgt=d.anchor||d.dest;
  const dd=`${tgt.lat},${tgt.lon}`;
  const tm={car:'driving',ev:'driving',transit:'transit',bike:'bicycling',foot:'walking'}[d.mode];
  return `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${dd}&travelmode=${tm}`;
}

/* ---------- route proposal ---------- */
function poiName(e){ return e?.tags?.name || e?.name || 'Onbekende plek'; }
function poiTag(e){ return e?.tag || (e?.tags ? catLabel(e) : 'plek'); }
function poiAddress(e){ return e?.address || (e?.tags ? addr(e.tags) : '') || ''; }
function normalizeRoutePoint(e, role='stop'){
  if(!e) return null;
  return {
    id: favId(e),
    name: poiName(e),
    tag: poiTag(e),
    lat: Number(e.lat),
    lon: Number(e.lon),
    address: poiAddress(e),
    role
  };
}
function pointDistance(a,b){
  if(!a || !b || !isFinite(a.lat) || !isFinite(a.lon) || !isFinite(b.lat) || !isFinite(b.lon)) return null;
  return haversine(a,b);
}
function uniqueRoutePoints(points){
  const seen=new Set(), out=[];
  for(const p of points){
    if(!p || !isFinite(p.lat) || !isFinite(p.lon)) continue;
    const k=(p.id||p.name+'@'+Math.round(p.lat*10000)+','+Math.round(p.lon*10000)).toLowerCase();
    if(seen.has(k)) continue;
    seen.add(k); out.push(p);
  }
  return out;
}

function currentAnchorForRoute(d){
  return d?.anchor || d?.dest || null;
}
function localFavoriteCandidates(d){
  const anchor=currentAnchorForRoute(d);
  const favs=favorites.map(f=>normalizeRoutePoint(f,'tripselectie')).filter(Boolean);
  if(!anchor || !favs.length) return {local:favs, remote:[]};
  const local=[], remote=[];
  favs.forEach(f=>{
    const km=pointDistance(anchor,f);
    if(km==null || km<=MAX_ROUTE_FAVORITE_DISTANCE_KM) local.push({...f,_favDist:km});
    else remote.push({...f,_favDist:km});
  });
  return {local, remote};
}

function routeCandidates(d){
  routeFavoriteWarning=null;
  const scoped=localFavoriteCandidates(d);
  if(scoped.remote.length){
    routeFavoriteWarning={
      ignored:scoped.remote.length,
      used:scoped.local.length,
      maxKm:MAX_ROUTE_FAVORITE_DISTANCE_KM,
      names:scoped.remote.slice(0,5).map(f=>f.name)
    };
  }
  if(scoped.local.length) return uniqueRoutePoints(scoped.local).slice(0,8);
  if(!routeUseSuggestions) return [];

  const picks=[];
  (d.attractions||[]).slice(0,4).forEach(e=>picks.push(normalizeRoutePoint(e,'bezienswaardigheid')));
  if(state.eat && d.eats?.[0]) picks.push(normalizeRoutePoint(d.eats[0],'eten'));
  if(state.drink && d.drinks?.[0]) picks.push(normalizeRoutePoint(d.drinks[0], state.noAlcohol?'koffie/mocktail':'drinken'));
  return uniqueRoutePoints(picks).slice(0,7);
}
function routeStartPoint(d){
  if(d.startMode==='local') return {name:d.anchorName||d.destText, tag:'start/focusgebied', lat:d.anchor.lat, lon:d.anchor.lon, address:''};
  if((d.mode==='car'||d.mode==='ev') && d.parking?.[0]) return normalizeRoutePoint(d.parking[0],'start/parkeren');
  if(d.mode==='transit' && d.stops?.[0]) return normalizeRoutePoint(d.stops[0],'start/OV');
  if(d.dep) return {name:d.depText||'Vertrekpunt', tag:'start', lat:d.dep.lat, lon:d.dep.lon, address:''};
  return {name:d.anchorName||d.destText, tag:'start/focusgebied', lat:d.anchor.lat, lon:d.anchor.lon, address:''};
}
function greedyOrder(start, candidates){
  const remaining=[...candidates], ordered=[];
  let cur=start;
  while(remaining.length){
    let bestIx=-1, best=Infinity;
    remaining.forEach((p,i)=>{
      const d=pointDistance(cur,p);
      if(d!=null && d<best){ best=d; bestIx=i; }
    });
    if(bestIx<0) bestIx=0;           // geen meetbare afstand → neem de eerstvolgende i.p.v. vastlopen
    const next=remaining.splice(bestIx,1)[0];
    ordered.push(next);
    if(isFinite(next.lat)&&isFinite(next.lon)) cur=next;  // anker alleen verzetten bij geldige coördinaat
  }
  return ordered;
}
function buildRoutePlan(d){
  const start=routeStartPoint(d);
  const candidates=routeCandidates(d);
  const ordered=greedyOrder(start,candidates);
  const back = (d.mode==='car'||d.mode==='ev') && start ? start : null;
  const points=[start,...ordered];
  if(back && ordered.length) points.push({...back, role:'terug naar start'});
  let total=0, hops=[];
  for(let i=0;i<points.length-1;i++){
    const km=pointDistance(points[i],points[i+1]);
    if(km!=null){ total+=km; hops.push(km); } else hops.push(null);
  }
  return {start, stops:ordered, points, hops, totalKm:total, usesFavorites:ordered.some(p=>p.role==='tripselectie'), favoriteWarning:routeFavoriteWarning, usesSuggestions:routeUseSuggestions};
}
function routeMapsLink(routePlan,d){
  const pts=routePlan.points||[];
  if(pts.length<2) return transitDeeplink(d);
  const origin=`${pts[0].lat},${pts[0].lon}`;
  const destination=`${pts[pts.length-1].lat},${pts[pts.length-1].lon}`;
  const waypoints=pts.slice(1,-1).slice(0,7).map(p=>`${p.lat},${p.lon}`).join('|');
  const mode=(d.mode==='car'||d.mode==='ev')?'driving':d.mode==='bike'?'bicycling':'walking';
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=${mode}${waypoints?`&waypoints=${encodeURIComponent(waypoints)}`:''}`;
}
function routeHTML(routePlan,d){
  const pre = selectionSummaryHTML(d);

  if(!routePlan.points.length || routePlan.points.length<2){
    const scoped = localFavoriteCandidates(d);
    const allRemote = scoped.local.length===0 && scoped.remote.length>0;  // wél gekozen, maar alles buiten focus
    let msg, action;
    if(allRemote){
      msg = `Je gekozen plek(ken) liggen allemaal meer dan ${MAX_ROUTE_FAVORITE_DISTANCE_KM} km buiten dit focusgebied, dus er is geen logische route binnen ${esc(d.anchorName||d.destText)}. Kies plekken dichterbij, of verruim je focusgebied.`;
      action = `<button class="btn" type="button" onclick="useSuggestedRoute()">Gebruik suggesties voor dit gebied</button>`;
    } else if(routeUseSuggestions){
      msg = `Geen geschikte suggesties gevonden om een route van te maken. Kies zelf een paar plekken met <b>+</b>.`;
      action = `<button class="btn" type="button" onclick="useSelectionRoute()">Terug naar alleen mijn selectie</button>`;
    } else {
      msg = `Kies een paar plekken met <b>+</b> om een route te maken.`;
      action = `<button class="btn" type="button" onclick="useSuggestedRoute()">Gebruik suggesties toch</button>`;
    }
    return `${pre}<div class="note">${msg}<div class="actions" style="margin-top:10px">${action}</div></div>`;
  }

  const modeLabel=(d.mode==='car'||d.mode==='ev')?'route':'looproute';
  const intro=routePlan.usesFavorites
    ? 'Gebaseerd op jouw gekozen plekken voor deze trip.'
    : 'Gebaseerd op suggesties omdat je daarvoor hebt gekozen.';
  const warnings=[];
  if(routePlan.favoriteWarning?.ignored){
    warnings.push(`<div class="note" style="margin-bottom:10px">⚠️ ${routePlan.favoriteWarning.ignored} gekozen plek(ken) liggen meer dan ${routePlan.favoriteWarning.maxKm} km buiten dit focusgebied en zijn voor deze route genegeerd.${routePlan.favoriteWarning.names?.length?`<br><span class="na">Genegeerd: ${routePlan.favoriteWarning.names.map(esc).join(' · ')}</span>`:''}</div>`);
  }
  if(routePlan.totalKm > ROUTE_TOTAL_WARNING_KM){
    warnings.push(`<div class="note" style="margin-bottom:10px">⚠️ Deze route is indicatief ${distLabel(routePlan.totalKm)}. Dat is waarschijnlijk te lang als stadswandeling. Kies minder plekken of beperk het focusgebied.</div>`);
  }
  const rows=routePlan.points.map((p,i)=>{
    const hop = i<routePlan.hops.length && routePlan.hops[i]!=null
      ? `<div class="route-hop">↓ ${distLabel(routePlan.hops[i])} naar de volgende stop</div>` : '';
    return `<div class="route-step">
      <div class="route-num">${i+1}</div>
      <div><div class="name">${esc(p.name)}</div>
      <div class="meta">${esc(p.tag||'plek')}${p.address?` · ${esc(p.address)}`:''}</div></div>
    </div>${hop}`;
  }).join('');
  return `${pre}${warnings.join('')}<div class="note route-summary"><b>Geen strak tijdschema.</b> Dit is een praktische ${modeLabel}: ${intro} Totale indicatieve afstand: <b>${distLabel(routePlan.totalKm)}</b>.</div>
    <div class="route-list">${rows}</div>
    <div class="actions" style="margin-top:12px">
      <a class="btn solid" target="_blank" rel="noopener" href="${routeMapsLink(routePlan,d)}">🗺️ Open route in Maps</a>
      ${routePlan.usesSuggestions?`<button class="btn" type="button" onclick="useSelectionRoute()">Gebruik alleen mijn selectie</button>`:''}
      <button class="btn" onclick="window.print()" type="button">🖨️ Print reisdossier</button>
      <button class="btn" onclick="scrollToAIPrompt()" type="button">✨ AI-adviesprompt</button>
    </div>
    <div class="na" style="margin-top:8px">Afstanden zijn hemelsbreed/indicatief. Maps bepaalt de echte loop- of rijroute.</div>`;
}
function fmt(min){const h=Math.floor(min/60)%24,m=min%60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;}

function summarizePois(arr, n=8){
  return (arr||[]).slice(0,n).map((e,i)=>{
    const t=e.tags||{};
    const bits=[`${i+1}. ${t.name||'Onbekend'}`];
    const type=catLabel(e); if(type) bits.push(`type: ${type}`);
    const address=addr(t); if(address) bits.push(`adres: ${address}`);
    if(t.opening_hours) bits.push(`openingstijden: ${t.opening_hours}`);
    if(t.cuisine) bits.push(`keuken: ${t.cuisine}`);
    return bits.join(' — ');
  }).join('\n');
}

function loadDossiers(){
  try{ return JSON.parse(localStorage.getItem(DOSSIER_KEY)||'[]'); }catch(e){ return []; }
}
function saveDossiers(list){
  try{ localStorage.setItem(DOSSIER_KEY, JSON.stringify(list.slice(0,50))); }catch(e){}
}
function currentDossierTitle(d){
  return `${d.destText || 'Bestemming'}${d.anchorName && d.anchorName!==d.destText ? ' — '+d.anchorName : ''}`;
}
function dossierHTML(d){
  const selected = favorites.slice(0,30);
  const favCount = selected.length;
  const selList = selected.length
    ? `<div class="chips" style="margin-top:8px">${selected.map(f=>`<span class="chip on" style="cursor:default">✓ ${esc(f.name)}</span>`).join(' ')}</div>`
    : `<div class="na" style="margin-top:8px">Nog niets gekozen. Tik op <b>+</b> bij plekken die je wilt onthouden.</div>`;
  const poiMapBlock = `
    <div class="poi-map-block">
      <div class="na" id="poi-map-cap" style="margin:14px 0 4px"><b>🗺️ Jouw gekozen plekken op een eigen kaart</b></div>
      <div id="poi-map-empty" class="na" style="margin:2px 0 6px;display:${favCount?'none':'block'}">Tik op <b>+</b> bij interessante plekken — je selectie verschijnt hier los van de auto-route.</div>
      <div class="poi-legend" id="poi-legend" style="display:${favCount?'flex':'none'}">
        <span><i style="background:#1d6a5c"></i>bezienswaardigheid</span>
        <span><i style="background:#bd4a26"></i>eten</span>
        <span><i style="background:#c98a2b"></i>drinken</span>
        <span><i style="background:#888"></i>parkeren</span>
      </div>
      <div id="poi-map" style="display:${favCount?'block':'none'}"></div>
    </div>`;
  return `<div class="dossier-panel">
    <div class="note"><b>Reiskompas v2:</b> geen dagplanning. Bewaar alleen de plekken die interessant zijn voor deze stad/buurt.</div>
    ${selList}
    ${poiMapBlock}
    <label class="lbl" for="dossier-title" style="margin-top:12px">Dossiernaam</label>
    <input id="dossier-title" value="${escAttr(currentDossierTitle(d))}" />
    <label class="lbl" for="dossier-notes" style="margin-top:12px">Notitie</label>
    <textarea id="dossier-notes" rows="4" placeholder="Bijv. Parkeren bij Zuidpoort werkte prima. Volgende keer TU Delft bekijken."></textarea>
    <div class="actions" style="margin-top:12px">
      <button class="btn solid" type="button" onclick="saveCurrentDossier()">💾 Bewaar dossier</button>
      <button class="btn" type="button" onclick="resetTripSelection()">Reset selectie</button>
      <button class="btn" type="button" onclick="renderSavedDossiers()">📚 Toon bibliotheek</button>
    </div>
    <div id="saved-dossiers" class="saved-list"></div>
  </div>`;
}

function resetTripSelection(){
  favorites=[];
  document.querySelectorAll('.fav-btn').forEach(b=>{
    b.classList.remove('on'); b.textContent='+'; b.title='Neem mee in deze trip';
  });
  if(window.__dossier) renderAll(window.__dossier);
}

function saveCurrentDossier(){
  const d=window.__dossier;
  if(!d) return;
  const title=$('dossier-title')?.value?.trim() || currentDossierTitle(d);
  const notes=$('dossier-notes')?.value || '';
  const item={
    id:'d'+Date.now(),
    title,
    notes,
    date:d.date,
    destText:d.destText,
    anchorName:d.anchorName,
    radiusKm:d.radiusKm,
    startMode:d.startMode,
    selected:favorites.slice(0,30),
    savedAt:new Date().toISOString()
  };
  const list=loadDossiers();
  list.unshift(item);
  saveDossiers(list);
  renderSavedDossiers();
  renderSavedDossiers('library-list');
}
function deleteDossier(id){
  saveDossiers(loadDossiers().filter(d=>d.id!==id));
  renderSavedDossiers();
  renderSavedDossiers('library-list');
}
function renderSavedDossiers(targetId='saved-dossiers'){
  const box=$(targetId);
  if(!box) return;
  const list=loadDossiers();
  if(!list.length){ box.innerHTML='<div class="na">Nog geen opgeslagen dossiers.</div>'; return; }
  box.innerHTML=list.slice(0,20).map(d=>`<div class="saved-item">
    <b>${esc(d.title)}</b>
    <div class="na">${esc(d.destText||'')} · ${esc(d.anchorName||'')} · ${d.radiusKm||'?'} km · ${d.selected?.length||0} plekken</div>
    ${d.notes?`<div class="sub2" style="margin-top:6px">${esc(d.notes)}</div>`:''}
    ${d.selected?.length?`<div class="chips" style="margin-top:7px">${d.selected.slice(0,8).map(p=>`<span class="chip" style="cursor:default">${esc(p.name)}</span>`).join(' ')}</div>`:''}
    <div class="saved-actions">
      <button class="btn" type="button" onclick="deleteDossier('${escAttr(d.id)}')">Verwijder</button>
    </div>
  </div>`).join('');
}
function toggleLibrary(){
  const drawer=$('library-drawer');
  if(!drawer) return;
  drawer.classList.toggle('hidden');
  renderSavedDossiers('library-list');
}

function buildAIPrompt(d){
  const companions=[...state.companions].join(', ') || 'niet opgegeven';
  const interests=INTERESTS.filter(i=>state.interests.has(i.id)).map(i=>i.label).join(', ') || 'algemene stadsverkenning';
  const cuisines=[...state.cuisines].join(', ') || 'geen specifieke keuken';
  const weather=d.weather ? `${d.weather.max}°/${d.weather.min}°, ${wlabel(d.weather.code)[0]}, ${d.weather.precip!=null ? (d.weather.kind==='fc'?'neerslagkans ':'natte dagen ~')+d.weather.precip+'%' : 'neerslag onbekend'}` : 'geen weerdata';
  const area=d.anchorName || d.destText;
  const selectedTxt=favorites.length ? favorites.slice(0,20).map((f,i)=>`${i+1}. ${f.name}${f.tag?' ('+f.tag+')':''}${f.address?' — '+f.address:''}`).join('\n') : 'Nog niets gekozen.';
  return `Ik gebruik een kleine open-data stadsverkenner (“Reiskompas”) en wil graag dat je als praktische lokale gids meekijkt.

Bestemming:
- Stad/regio: ${d.destText}
- Focusgebied: ${area}
- Zoekstraal: ${d.radiusKm} km
- Datum: ${d.date}
- Startmodus: ${d.startMode==='local'?'ik ben al in de buurt':'ik reis erheen'}
- Vervoer: ${travelTitle(d.mode).replace('Reisadvies — ','')}
- Vertrekplaats: ${d.startMode==='local'?'niet nodig':(d.depText || 'niet opgegeven')}

Gezelschap:
- Reisgezelschap: ${companions}
- Kinderen: ${d.kids === 'none' ? 'nee' : d.kids}

Voorkeuren:
- Interesses: ${interests}
- Eten: ${state.eat ? 'ja' : 'nee'}
- Drinken: ${state.drink ? (state.noAlcohol ? 'ja, liefst alcoholvrij/mocktails' : 'ja') : 'nee'}
- Keukenvoorkeur: ${cuisines}

Weerindicatie:
- ${weather}

Voorgestelde bezienswaardigheden:
${summarizePois(d.attractions,12) || 'Geen resultaten.'}

Minder voor de hand liggende tips:
${summarizePois(hiddenGems(d.attractions, new Set((d.attractions||[]).slice(0,9).map(favId))),3) || 'Geen aparte verborgen parels gevonden.'}

Eten:
${summarizePois(d.eats,10) || 'Geen eetresultaten of eten niet geselecteerd.'}

Drinken:
${summarizePois(d.drinks,10) || 'Geen drinkresultaten of drinken niet geselecteerd.'}

Gekozen voor dit dossier:
${selectedTxt}

Maak hiervan géén uurplanning en géén itinerary. Geef in plaats daarvan:
1. Welke 3-5 plekken het meest de moeite waard lijken voor dit gezelschap.
2. Welke plekken goed bij elkaar passen qua ligging of thema.
3. Wat je zou bewaren voor een later bezoek.
4. Waar je moet letten op openingstijden, reserveren, weer of bereikbaarheid.
5. Eventuele lokale waarschuwingen rond verkeer, OV, evenementen of drukte.

Gebruik alleen de informatie hierboven als basis. Zeg expliciet waar iets onzeker is.`;
}
function aiPromptHTML(d){
  const prompt=esc(buildAIPrompt(d));
  return `<div class="ai-box">
    <div class="note"><b>Geen API, geen accountkoppeling.</b> Reiskompas maakt alleen een nette prompt. Kopieer die naar Gemini of ChatGPT voor optioneel stadsadvies.</div>
    <textarea id="aiPromptText" readonly>${prompt}</textarea>
    <div class="ai-tools">
      <button class="btn solid" type="button" onclick="copyAIPrompt()">📋 Kopieer prompt</button>
      <a class="btn" target="_blank" rel="noopener" href="https://gemini.google.com/app">Open Gemini →</a>
      <a class="btn" target="_blank" rel="noopener" href="https://chatgpt.com/">Open ChatGPT →</a>
      <a class="btn" target="_blank" rel="noopener" href="https://claude.ai/">Open Claude →</a>
    </div>
    <div class="ai-small">Tip: kopieer de prompt, open je AI-tool naar keuze en plak hem daar. Zo blijft deze GitHub Pages-app clean, lean en zonder API-keys.</div>
  </div>`;
}
async function copyAIPrompt(){
  const el=$('aiPromptText');
  if(!el) return;
  try{
    await navigator.clipboard.writeText(el.value);
    alert('AI-prompt gekopieerd.');
  }catch(e){
    el.focus(); el.select();
    document.execCommand('copy');
    alert('AI-prompt gekopieerd.');
  }
}
function scrollToAIPrompt(){
  const el=$('sec-ai');
  if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
}

function downloadICS(){
  const {plan,date,dest}=window.__plan||{};
  if(!plan) return;
  const pad=n=>String(n).padStart(2,'0');
  const dt=(min)=>{const d=new Date(date+'T00:00:00');d.setMinutes(min);
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;};
  let ics='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Reiskompas//NL\r\nCALSCALE:GREGORIAN\r\n';
  for(let i=0;i<plan.length-1;i++){
    const it=plan[i], end=plan[i+1].t;
    ics+='BEGIN:VEVENT\r\n'+
      `UID:reiskompas-${i}-${Date.now()}@local\r\n`+
      `DTSTART:${dt(it.t)}\r\nDTEND:${dt(end)}\r\n`+
      `SUMMARY:${(it.label||'').replace(/[,;]/g,' ')}\r\n`+
      (it.place?`LOCATION:${(it.place+', '+dest).replace(/[,;]/g,' ')}\r\n`:'')+
      'END:VEVENT\r\n';
  }
  ics+='END:VCALENDAR';
  const blob=new Blob([ics],{type:'text/calendar'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download=`reiskompas-${dest||'trip'}.ics`; a.click();
}

/* ---------- map ---------- */
let _map=null;
function initMap(d){
  const el=$('map'); if(!el||typeof L==='undefined') return;
  if(_map){_map.remove();_map=null;}
  _map=L.map('map',{scrollWheelZoom:false}).setView([d.anchor.lat,d.anchor.lon], d.tight?14:13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(_map);
  const rust='#bd4a26', teal='#1d6a5c', cream='#f3e9da';

  // route-lijn (auto/EV) — rust over de kaart, met een crème 'casing' eronder voor contrast
  const geo = d.route && d.route.geometry;
  let routeLayer=null;
  if(geo && geo.length>1){
    L.polyline(geo,{color:cream,weight:8,opacity:.9,lineJoin:'round'}).addTo(_map);
    routeLayer=L.polyline(geo,{color:rust,weight:4,opacity:1,lineJoin:'round'}).addTo(_map);
  }

  // bestemming/anker
  L.circleMarker([d.anchor.lat,d.anchor.lon],{radius:9,color:cream,weight:2,fillColor:rust,fillOpacity:1}).addTo(_map).bindPopup('<b>'+esc(d.anchorName||d.destText)+'</b>').openPopup();
  // vertrekpunt (als bekend en route getekend)
  if(d.dep && geo) L.circleMarker([d.dep.lat,d.dep.lon],{radius:8,color:cream,weight:2,fillColor:teal,fillOpacity:1}).addTo(_map).bindPopup('<b>'+esc(d.depText||'Vertrek')+'</b>');

  d.attractions.slice(0,12).forEach(e=>L.circleMarker([e.lat,e.lon],{radius:5,color:teal,fillColor:teal,fillOpacity:.7,weight:1}).addTo(_map).bindPopup(esc(e.tags.name)));
  d.eats.slice(0,8).forEach(e=>L.circleMarker([e.lat,e.lon],{radius:4,color:rust,fillColor:rust,fillOpacity:.7,weight:1}).addTo(_map).bindPopup('🍽️ '+esc(e.tags.name)));
  (d.parking||[]).slice(0,6).forEach(e=>L.circleMarker([e.lat,e.lon],{radius:4,color:'#444',fillColor:'#888',fillOpacity:.6,weight:1}).addTo(_map).bindPopup('🅿️ '+esc(e.tags.name||'Parkeren')));

  // toon de hele reis als er een route is, anders blijf op de bestemming
  if(routeLayer){
    try{ _map.fitBounds(routeLayer.getBounds().pad(0.12)); }catch(e){}
  }
  setTimeout(()=>_map.invalidateSize(),200);
}

/* ---------- POI-kaart (alleen de met + gekozen plekken) ---------- */
let _poiMap=null;
function poiMarkerColor(tag){
  const t=String(tag||'').toLowerCase();
  if(/drink|koffie|caf|bar|pub|mocktail/.test(t)) return '#c98a2b';   // amber — drinken
  if(/eten|eet|restaur|food|cuisine|lunch|diner/.test(t)) return '#bd4a26'; // rust — eten
  if(/park/.test(t)) return '#888';                                    // grijs — parkeren
  return '#1d6a5c';                                                    // teal — bezienswaardigheid/overig
}
function initPoiMap(){
  const el=$('poi-map'); if(!el || typeof L==='undefined') return;
  const empty=$('poi-map-empty'), legend=$('poi-legend');
  const pts=(favorites||[]).filter(f=>isFinite(+f.lat)&&isFinite(+f.lon)).map(f=>({...f,lat:+f.lat,lon:+f.lon}));

  if(_poiMap){ try{_poiMap.remove();}catch(e){} _poiMap=null; }

  if(!pts.length){
    el.style.display='none';
    if(empty) empty.style.display='block';
    if(legend) legend.style.display='none';
    return;
  }
  el.style.display='block';
  if(empty) empty.style.display='none';
  if(legend) legend.style.display='flex';

  _poiMap=L.map('poi-map',{scrollWheelZoom:false}).setView([pts[0].lat,pts[0].lon],14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(_poiMap);
  const cream='#f3e9da';
  const coords=[];
  pts.forEach(f=>{
    const color=poiMarkerColor(f.tag);
    const popup=`<b>${esc(f.name||'Plek')}</b>`
      + (f.tag?`<br><small>${esc(f.tag)}</small>`:'')
      + (f.address?`<br><small>${esc(f.address)}</small>`:'')
      + `<br><a href="${gmaps(f.lat,f.lon,f.name)}" target="_blank" rel="noopener">Open in Maps →</a>`;
    L.circleMarker([f.lat,f.lon],{radius:7,color:cream,weight:2,fillColor:color,fillOpacity:1}).addTo(_poiMap).bindPopup(popup);
    coords.push([f.lat,f.lon]);
  });

  setTimeout(()=>{
    if(!_poiMap) return;
    _poiMap.invalidateSize();
    if(coords.length>1){ try{ _poiMap.fitBounds(L.latLngBounds(coords).pad(0.2)); }catch(e){} }
    else { _poiMap.setView(coords[0],15); }
  },160);
}



function openAboutModal(){
  const m=$('aboutModal');
  if(m) m.classList.remove('hidden');
}
function closeAboutModal(){
  const m=$('aboutModal');
  if(m) m.classList.add('hidden');
}

function setupInstallPrompt(){
  const box=$('installPrompt'), btn=$('installDismiss');
  if(!box || localStorage.getItem(INSTALL_KEY)==='1') return;
  const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if(isiOS && !isStandalone) setTimeout(()=>box.classList.remove('hidden'), 1200);
  if(btn) btn.onclick=()=>{ localStorage.setItem(INSTALL_KEY,'1'); box.classList.add('hidden'); };
}

/* ---------- init ---------- */
let __rkDidInit = false;
function initReiskompas(){
  if(__rkDidInit) return;
  __rkDidInit = true;

  try{ sweepOldCaches(); }catch(e){ console.warn('cache sweep failed', e); }
  try{ migrateFavorites(); }catch(e){ console.warn('favorite migration skipped', e); }

  try{ buildChips(); }catch(e){ console.error('buildChips failed', e); }

  try{ setupAutocomplete('dest','dest-ac','dest'); }catch(e){ console.error('dest autocomplete failed', e); }
  try{ setupAutocomplete('dep','dep-ac','dep'); }catch(e){ console.error('dep autocomplete failed', e); }
  try{ setupAreaCustom(); }catch(e){ console.error('area custom failed', e); }

  const dateEl=$('date');
  if(dateEl && !dateEl.value){
    const t=new Date(); t.setDate(t.getDate()+1);
    dateEl.value=t.toISOString().split('T')[0];
  }

  const go=$('go');
  if(go) go.addEventListener('click',generate);

  // tripselecties via event-delegation — werkt ook voor namen met een apostrof (O'Briens, L'Escale)
  document.addEventListener('click',ev=>{
    const btn = ev.target.closest && ev.target.closest('.fav-btn');
    if(btn){ ev.preventDefault(); toggleFavorite(btn); }
  });

  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }

  try{ setupInstallPrompt(); }catch(e){}
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeAboutModal(); });
  const about=$('aboutModal');
  if(about) about.addEventListener('click',e=>{ if(e.target===about) closeAboutModal(); });
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initReiskompas, {once:true});
}else{
  initReiskompas();
}

// Extra vangnet voor iOS/PWA/Safari-cache edge cases.
window.addEventListener('load', initReiskompas, {once:true});
