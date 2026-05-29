
/* =========================================================================
   Reiskompas — keyless city-trip prep.
   Bronnen: Nominatim + Photon (geocoding), Open-Meteo (weer + klimatologie),
   Overpass/OpenStreetMap (POI's), OSRM (auto-route), Leaflet (kaart).
   Alles client-side, geen API-keys.
   ========================================================================= */

const $ = id => document.getElementById(id);

const APP_VERSION = '1.4.1';
const CACHE_PREFIX = 'reiskompas-cache-v'+APP_VERSION+':';  // afgeleid → kan niet uit sync raken
const FAV_KEY = 'reiskompas-favorites';            // de-versioned: favorieten blijven over releases heen
const INSTALL_KEY = 'reiskompas-install-dismissed'; // idem — gebruikersvoorkeur, geen cache
const TTL = { weather: 6*60*60*1000, poi: 7*24*60*60*1000, food: 3*24*60*60*1000, route: 6*60*60*1000 };
const sourceStatus = { overpass: 'live' };
let favorites = loadFavorites();

function cacheKey(type, parts){ return CACHE_PREFIX + type + ':' + parts.map(p=>String(p ?? '').toLowerCase()).join('|'); }
function cacheGet(type, parts, ttl){
  try{
    const raw = localStorage.getItem(cacheKey(type, parts));
    if(!raw) return null;
    const item = JSON.parse(raw);
    if(!item || Date.now() - item.t > ttl) return null;
    return item.v;
  }catch(e){ return null; }
}
function cacheSet(type, parts, val){
  try{ localStorage.setItem(cacheKey(type, parts), JSON.stringify({t:Date.now(), v:val})); }catch(e){}
}
function loadFavorites(){
  try{ return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); }catch(e){ return []; }
}
function saveFavorites(){ try{ localStorage.setItem(FAV_KEY, JSON.stringify(favorites.slice(0,50))); }catch(e){} }
function sweepOldCaches(){
  // ruim cache-sleutels van oudere versies op (Gemini-bevinding); keys eerst
  // verzamelen, dán wissen — anders verschuiven de indexen tijdens removeItem.
  try{
    const kill=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k && k.startsWith('reiskompas-cache-') && !k.startsWith(CACHE_PREFIX)) kill.push(k);
    }
    kill.forEach(k=>localStorage.removeItem(k));
  }catch(e){}
}
function migrateFavorites(){
  // eenmalige overname van favorieten uit oude versie-gebonden sleutels
  if(favorites.length) return;
  for(const k of ['reiskompas-favorites-v1.3','reiskompas-favorites-v1.2','reiskompas-favorites-v1.1']){
    try{ const old=JSON.parse(localStorage.getItem(k)||'[]'); if(Array.isArray(old)&&old.length){ favorites=old; saveFavorites(); break; } }catch(e){}
  }
}
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
    b.classList.toggle('on',on); b.textContent=on?'★':'☆';
    b.title=on?'Verwijder favoriet':'Bewaar als favoriet';
  });
}
function serializePoi(e, tag){ return encodeURIComponent(JSON.stringify({id:favId(e), name:e.tags.name, tag:tag||catLabel(e), lat:e.lat, lon:e.lon, address:addr(e.tags)})); }
function asNum(n){ return Math.round(Number(n)*1000)/1000; }


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
  dest:null, dep:null,
  companions:new Set(['Samen']),
  interests:new Set(),
  eat:false, drink:false, noAlcohol:false,
  cuisines:new Set(),
};

/* ---------- build chips ---------- */
function buildChips(){
  const ic = $('interests');
  INTERESTS.forEach(it=>{
    const c=document.createElement('span');
    c.className='chip'; c.dataset.v=it.id;
    c.innerHTML=`<span class="em">${it.em}</span>${it.label}`;
    c.onclick=()=>{ c.classList.toggle('on'); toggleSet(state.interests,it.id,c); };
    ic.appendChild(c);
  });
  const cc=$('cuisines');
  CUISINES.forEach(cu=>{
    const c=document.createElement('span');
    c.className='chip'; c.dataset.v=cu.label; c.textContent=cu.label;
    c.onclick=()=>{ c.classList.toggle('on'); toggleSet(state.cuisines,cu.label,c); };
    cc.appendChild(c);
  });
  // companions
  $('companions').querySelectorAll('.chip').forEach(c=>{
    if(state.companions.has(c.dataset.v)) c.classList.add('on');
    c.onclick=()=>{ c.classList.toggle('on'); toggleSet(state.companions,c.dataset.v,c); };
  });
  // eat / drink
  document.querySelectorAll('[data-eat]').forEach(c=>{
    c.onclick=()=>{
      c.classList.toggle('on');
      const on=c.classList.contains('on');
      if(c.dataset.eat==='eat'){ state.eat=on; $('cuisine-wrap').classList.toggle('hidden',!on); }
      else { state.drink=on; $('drink-wrap').classList.toggle('hidden',!on); }
    };
  });
  $('nodrink-chip').onclick=function(){
    const on=this.dataset.on!=='true'; this.dataset.on=on;
    this.classList.toggle('on',on); state.noAlcohol=on;
  };
}
function toggleSet(set,v,el){ if(el.classList.contains('on'))set.add(v); else set.delete(v); }

/* ---------- geocoding ---------- */
function setupAutocomplete(inputId,listId,key){
  const inp=$(inputId), list=$(listId);
  let timer=null;
  inp.addEventListener('input',()=>{
    state[key]=null;
    const q=inp.value.trim();
    clearTimeout(timer);
    if(q.length<2){ list.classList.remove('open'); return; }
    timer=setTimeout(async()=>{
      try{
        const r=await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=en`);
        const d=await r.json();
        list.innerHTML='';
        (d.features||[]).forEach(f=>{
          const p=f.properties||{};
          const city=p.name||p.city||'';
          const ctx=[p.state,p.country].filter(Boolean).join(', ');
          const it=document.createElement('div');
          it.className='ac-item';
          it.innerHTML=`${city}<small>${ctx}</small>`;
          it.onclick=()=>{
            inp.value=city + (p.country?`, ${p.country}`:'');
            state[key]={lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0],
                        name:city,country:p.country||'',cc:(p.countrycode||'').toLowerCase()};
            list.classList.remove('open');
          };
          list.appendChild(it);
        });
        list.classList.toggle('open',(d.features||[]).length>0);
      }catch(e){ list.classList.remove('open'); }
    },260);
  });
  document.addEventListener('click',e=>{ if(!inp.contains(e.target)&&!list.contains(e.target)) list.classList.remove('open'); });
}
// fallback resolve via Nominatim if user typed but didn't pick
async function resolveCity(text){
  try{
    const r=await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=1&addressdetails=1`,
      {headers:{'Accept-Language':'nl'}});
    const d=await r.json();
    if(!d.length) return null;
    const p=d[0];
    return {lat:+p.lat,lon:+p.lon,name:(p.display_name||text).split(',')[0],
            country:p.address?.country||'',cc:(p.address?.country_code||'').toLowerCase()};
  }catch(e){ return null; }
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
  return `<div class="poi">
    <button class="fav-btn ${on?'on':''}" data-fav="${escAttr(id)}" data-poi="${serializePoi(e,tag)}" title="${on?'Verwijder favoriet':'Bewaar als favoriet'}" type="button">${on?'★':'☆'}</button>
    ${tag?`<div class="tag">${esc(tag)}</div>`:''}
    <div class="nm">${esc(t.name)}</div>
    ${ad}${oh}${extra}
    <a class="lk" href="${gmaps(e.lat,e.lon)}" target="_blank" rel="noopener">Open in kaart →</a>
  </div>`;
}
function esc(s){return (s||'').replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));}
function escAttr(s){return (s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

/* ---------- routing (OSRM, auto) ---------- */
async function osrmRoute(o,d){
  try{
    const u=`https://router.project-osrm.org/route/v1/driving/${o.lon},${o.lat};${d.lon},${d.lat}?overview=false&steps=true`;
    const r=await(await fetch(u)).json();
    if(!r.routes||!r.routes.length) return null;
    const rt=r.routes[0];
    const refs=[];
    (rt.legs||[]).forEach(l=>(l.steps||[]).forEach(s=>{
      if(s.ref) s.ref.split(';').forEach(x=>{ x=x.trim(); if(x&&!refs.includes(x))refs.push(x); });
    }));
    return {km:(rt.distance/1000).toFixed(0),min:Math.round(rt.duration/60),roads:refs.slice(0,8)};
  }catch(e){ return null; }
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
    .sort((a,b)=> b.s-a.s || a.i-b.i)
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
  const depText=$('dep').value.trim();
  const date=$('date').value;
  const time=$('time').value||'10:00';
  const mode=$('mode').value;
  const kids=$('kids').value;

  if(!destText||!date){ alert('Vul minstens een bestemming en datum in.'); return; }

  $('empty').style.display='none';
  $('content').classList.remove('on');
  $('loading').classList.add('on');
  const setStatus=s=>$('status').textContent=s;

  setStatus('Bestemming opzoeken…');
  let dest=state.dest|| await resolveCity(destText);
  let dep = depText ? (state.dep|| await resolveCity(depText)) : null;
  if(!dest){ setStatus(''); $('loading').classList.remove('on'); $('empty').style.display='block';
    alert('Bestemming niet gevonden — kies een suggestie uit de lijst of probeer een andere spelling.'); return; }

  const C=dest; // center

  // weer
  setStatus('Weer ophalen…');
  const weather=await getWeather(C.lat,C.lon,date);

  // attracties op interesses
  setStatus('Bezienswaardigheden zoeken…');
  let clauses=[];
  const chosen=INTERESTS.filter(it=>state.interests.has(it.id));
  (chosen.length?chosen:INTERESTS.filter(it=>['musea','arch','view'].includes(it.id)))
    .forEach(it=>clauses.push(...it.osm));
  if(kids !== 'none') clauses.push('nwr["leisure"="playground"]','nwr["tourism"="zoo"]','nwr["amenity"="ice_cream"]');
  clauses=[...new Set(clauses)];
  let attractions=dedupe(await overpass(clauses,C.lat,C.lon,4500,100,'poi'));
  attractions = rankPlaces(attractions, chosen, kids, state.companions);

  // eten / drinken
  let eats=[],drinks=[];
  if(state.eat||state.drink){
    setStatus('Eet- en drinkgelegenheden zoeken…');
    const food=dedupe(await overpass(
      ['nwr["amenity"~"restaurant|cafe|fast_food|bar|pub|biergarten|ice_cream"]'],C.lat,C.lon,3500,120,'food'));
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
    if(kids !== 'none') eats.sort((a,b)=> childScore(b,kids)-childScore(a,kids));
    // gezelschap stuurt de volgorde van drinkplekken (vrienden → bars/pubs vooraan)
    drinks.sort((a,b)=> companionScore(b,state.companions)-companionScore(a,state.companions));
    if(state.noAlcohol){ // alcoholvrij: cafés/koffie vooraan, bars achteraan
      drinks.sort((a,b)=> (a.tags.amenity==='cafe'?-1:1)-(b.tags.amenity==='cafe'?-1:1));
    }
    eats=eats.slice(0,9); drinks=drinks.slice(0,9);
  }

  // vervoer
  setStatus('Reisinformatie samenstellen…');
  let route=null, parking=[], charging=[], stops=[];
  if((mode==='car'||mode==='ev')){
    if(dep) route=await osrmRoute(dep,C);
    parking=dedupe(await overpass(['nwr["amenity"="parking"]'],C.lat,C.lon,2500,40,'parking'));
    if(mode==='ev') charging=dedupe(await overpass(['nwr["amenity"="charging_station"]'],C.lat,C.lon,4000,40,'charging'));
  } else if(mode==='transit'){
    stops=dedupe(await overpass(
      ['nwr["public_transport"="station"]','nwr["railway"="station"]','nwr["railway"="tram_stop"]','nwr["station"="subway"]'],
      C.lat,C.lon,2000,30,'transit'));
  }

  renderAll({dest:C,dep,destText,depText,date,time,mode,kids,weather,attractions,eats,drinks,route,parking,charging,stops});

  $('loading').classList.remove('on');
  $('content').classList.add('on');
}

/* ---------- render ---------- */
function stagger(){ document.querySelectorAll('#content .sec').forEach((s,i)=>{ s.style.animationDelay=(i*70)+'ms'; s.style.animation='none'; s.offsetHeight; s.style.animation=''; }); }

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
  const doHTML = d.attractions.length
    ? sourceBadges()+`<div class="grid">${d.attractions.slice(0,9).map(e=>poiCard(e,catLabel(e))).join('')}</div>`
    : `<div class="note">Weinig gemapte plekken gevonden binnen deze straal. Probeer een grotere stad of meer interesses aan te vinken — OpenStreetMap-dekking varieert per regio.</div>`;
  sec('sec-do','Zien & doen','②',doHTML, d.attractions.length?`${Math.min(9,d.attractions.length)} plekken`:'');

  // hidden gems — sluit de al getoonde 9 uit
  const shownIds = new Set(d.attractions.slice(0,9).map(favId));
  const gems = hiddenGems(d.attractions, shownIds);
  if(gems.length){
    sec('sec-gems','Niet iedereen kent deze','②b',`<div class="grid">${gems.map(e=>poiCard(e,catLabel(e))).join('')}</div>`,`${gems.length} tips`);
  } else clearSec('sec-gems');

  // eat
  if(state.eat){
    const eatHTML = d.eats.length
      ? `<div class="grid">${d.eats.map(e=>poiCard(e,(e.tags.cuisine||'eten').split(';')[0],priceTag(e))).join('')}</div>`
      : `<div class="note">Geen eetgelegenheden gevonden bij deze keuze${state.cuisines.size?' / keuken':''}. Probeer een andere keuken of vink er meer aan.</div>`;
    sec('sec-eat','Eten','③',eatHTML, d.eats.length?`${d.eats.length}`:'');
  } else clearSec('sec-eat');

  // drink
  if(state.drink){
    const note=state.noAlcohol?`<div class="note" style="margin-bottom:11px">Alcoholvrij gekozen — koffiebars en cafés staan vooraan. OSM markeert mocktailbars niet apart, dus kies gerust op naam.</div>`:'';
    const drHTML = d.drinks.length
      ? note+`<div class="grid">${d.drinks.map(e=>poiCard(e,e.tags.amenity)).join('')}</div>`
      : `<div class="note">Geen drinkgelegenheden gevonden in de buurt.</div>`;
    sec('sec-drink','Drinken','④',drHTML, d.drinks.length?`${d.drinks.length}`:'');
  } else clearSec('sec-drink');

  // travel
  sec('sec-travel', travelTitle(d.mode),'⑤', travelHTML(d), '');

  // plan
  const plan=buildPlan(d);
  sec('sec-plan','Dagplanning','⑥', planHTML(plan,d), '');
  window.__plan={plan,date:d.date,dest:d.destText};

  // colophon
  $('colophon').innerHTML=`<b>Bronnen:</b> OpenStreetMap (Overpass) · Open-Meteo · OSRM · Nominatim/Photon · Leaflet.
    Live data waar mogelijk, met lokale cache en Overpass-failover. Geen API-keys. Prijzen, live verkeersdrukte en exacte OV-tijden zitten niet in gratis open bronnen — daarvoor staan doorkliks naar de officiële planners.
    <div class="regen"><button class="btn" onclick="document.getElementById('go').scrollIntoView({behavior:'smooth'})">↺ Plan aanpassen</button></div>`;

  // map
  setTimeout(()=>initMap(d),120);
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
    cards+=`<div class="tcard"><h4>🅿️ Parkeren bij bestemming</h4>${
      d.parking.length? d.parking.slice(0,4).map(p=>{
        const fee=p.tags.fee==='yes'?'betaald':p.tags.fee==='no'?'gratis':'tarief n.b.';
        const cap=p.tags.capacity?` · ${p.tags.capacity} plaatsen`:'';
        return `<div style="margin-bottom:7px"><b>${esc(p.tags.name||'Parkeergelegenheid')}</b>
          <div class="sub2">${fee}${cap} · <a class="lk" href="${gmaps(p.lat,p.lon)}" target="_blank" rel="noopener">kaart →</a></div></div>`;
      }).join('') : `<div class="na">Geen parkeerdata gevonden.</div>`}
      <div class="na" style="margin-top:6px">Exacte tarieven staan niet in OSM.</div>
    </div>`;
    if(m==='ev'){
      cards+=`<div class="tcard"><h4>⚡ Laadpunten</h4>${
        d.charging.length? d.charging.slice(0,4).map(c=>`<div style="margin-bottom:6px"><b>${esc(c.tags.name||c.tags.operator||'Laadpunt')}</b>
          <div class="sub2">${c.tags.socket?Object.keys(c.tags).filter(k=>k.startsWith('socket')).length+' aansluitingen':'aansluiting n.b.'} · <a class="lk" href="${gmaps(c.lat,c.lon)}" target="_blank" rel="noopener">kaart →</a></div></div>`).join('')
          :`<div class="na">Geen laadpunten gevonden in OSM.</div>`}
        <div class="na" style="margin-top:6px">Voor laadplanning onderweg: <a class="lk" style="display:inline" href="https://abetterrouteplanner.com" target="_blank" rel="noopener">A Better Routeplanner →</a></div>
      </div>`;
    }
  } else if(m==='transit'){
    cards+=`<div class="tcard"><h4>🚋 OV-knooppunten bij bestemming</h4>${
      d.stops.length? d.stops.slice(0,5).map(s=>`<div style="margin-bottom:5px"><b>${esc(s.tags.name)}</b>
        <div class="sub2">${(s.tags.railway||s.tags.station||s.tags.public_transport||'halte').replace('_',' ')}</div></div>`).join('')
        :`<div class="na">Geen OV-knooppunten gevonden in de buurt.</div>`}</div>`;
    cards+=`<div class="tcard"><h4>🕐 Tijden & route</h4>
      <div class="sub2">Live OV-tijden, perrons en overstappen zitten niet in gratis open bronnen. Plan de exacte reis via de officiële planner:</div>
      <div class="actions" style="margin-top:11px">
        <a class="btn solid" target="_blank" rel="noopener" href="${transitDeeplink(d)}">Reis plannen (Google) →</a>
        ${d.dest.cc==='nl'?`<a class="btn" target="_blank" rel="noopener" href="https://9292.nl">9292 →</a>`:''}
      </div></div>`;
  } else { // bike / foot
    const dist=d.dep?haversine(d.dep,d.dest):null;
    const speed=m==='bike'?15:4.8;
    const mins=dist?Math.round(dist/speed*60):null;
    cards+=`<div class="tcard"><h4>${m==='bike'?'🚲 Fietsen':'🚶 Lopen'}</h4>
      ${dist?`<div class="big">± ${mins} min</div><div class="sub2">hemelsbreed ± ${dist.toFixed(1)} km · werkelijke route langer</div>`
        :`<div class="sub2">Ideaal binnen de stad. Vul een vertrekpunt in voor een schatting.</div>`}
      <div class="actions" style="margin-top:11px"><a class="btn solid" target="_blank" rel="noopener" href="${transitDeeplink(d)}">Route in kaart →</a></div>
    </div>`;
    cards+=`<div class="tcard"><h4>💡 Tip</h4><div class="sub2">${m==='bike'?'Veel steden hebben deelfietsen of OV-fiets bij stations. Check de lokale aanbieder.':'Comfortabele schoenen en een waterflesje. Plan pauzes als je kinderen meeneemt.'}</div></div>`;
  }
  return `<div class="travel-grid">${cards}</div><div id="map"></div>`;
}
function transitDeeplink(d){
  const o=d.dep?`${d.dep.lat},${d.dep.lon}`:'';
  const dd=`${d.dest.lat},${d.dest.lon}`;
  const tm={car:'driving',ev:'driving',transit:'transit',bike:'bicycling',foot:'walking'}[d.mode];
  return `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${dd}&travelmode=${tm}`;
}

/* ---------- itinerary ---------- */
function buildPlan(d){
  const items=[];
  let [h,m]=d.time.split(':').map(Number);
  let cur=h*60+(m||0);
  const push=(label,dur,place)=>{ items.push({t:cur,label,place}); cur+=dur; };
  const kids=d.kids!=='none';
  const act=d.attractions.slice(0,kids?2:3);
  const eat=d.eats, drink=d.drinks;

  push('Aankomst in '+d.destText, 20);
  if(state.eat && cur<11*60) push('Ontbijt / koffie', 45, drink.find(x=>x.tags.amenity==='cafe')?.tags.name);
  if(act[0]) push(act[0].tags.name, kids?75:90, act[0].tags.name);
  if(state.eat) push('Lunch', 60, eat[0]?.tags.name);
  if(act[1]) push(act[1].tags.name, kids?75:90, act[1].tags.name);
  if(kids) push('Pauze in een park / ijsje', 40);
  if(act[2]) push(act[2].tags.name, 75, act[2].tags.name);
  if(state.eat) push('Diner', 90, eat[1]?.tags.name||eat[0]?.tags.name);
  if(state.drink) push(state.noAlcohol?'Afsluiter — mocktail / koffie':(state.companions.has('Vrienden')?'Borrel met vrienden':'Borrel'), 60, drink[0]?.tags.name);
  push('Vertrek / terugreis', 0);
  return items;
}
function fmt(min){const h=Math.floor(min/60)%24,m=min%60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;}
function planHTML(items,d){
  const rows=items.map(it=>`<div class="tl"><div class="tm">${fmt(it.t)}</div><div class="ti">${esc(it.label)}</div>${it.place&&it.place!==it.label?`<div class="tp">${esc(it.place)}</div>`:''}</div>`).join('');
  return `<div class="timeline">${rows}</div>
    <div class="actions">
      <button class="btn solid" onclick="downloadICS()">📅 Exporteer naar agenda (.ics)</button>
      <a class="btn" target="_blank" rel="noopener" href="${transitDeeplink(d)}">🗺️ Route in Maps</a>
      <button class="btn" onclick="window.print()" type="button">🖨️ Print reisdossier</button>
    </div>
    ${favorites.length?`<div class="note" style="margin-top:11px"><b>⭐ Favorieten:</b> ${favorites.slice(0,8).map(f=>esc(f.name)).join(' · ')}</div>`:''}
    <div class="na" style="margin-top:8px">Indicatief schema op basis van je interesses en aankomsttijd — schuif gerust met de tijden.</div>`;
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
  _map=L.map('map',{scrollWheelZoom:false}).setView([d.dest.lat,d.dest.lon],13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(_map);
  const ink='#bd4a26', teal='#1d6a5c';
  L.circleMarker([d.dest.lat,d.dest.lon],{radius:9,color:'#f3e9da',weight:2,fillColor:'#bd4a26',fillOpacity:1}).addTo(_map).bindPopup('<b>'+esc(d.destText)+'</b>').openPopup();
  d.attractions.slice(0,12).forEach(e=>L.circleMarker([e.lat,e.lon],{radius:5,color:teal,fillColor:teal,fillOpacity:.7,weight:1}).addTo(_map).bindPopup(esc(e.tags.name)));
  d.eats.slice(0,8).forEach(e=>L.circleMarker([e.lat,e.lon],{radius:4,color:ink,fillColor:ink,fillOpacity:.7,weight:1}).addTo(_map).bindPopup('🍽️ '+esc(e.tags.name)));
  (d.parking||[]).slice(0,6).forEach(e=>L.circleMarker([e.lat,e.lon],{radius:4,color:'#444',fillColor:'#888',fillOpacity:.6,weight:1}).addTo(_map).bindPopup('🅿️ '+esc(e.tags.name||'Parkeren')));
  setTimeout(()=>_map.invalidateSize(),200);
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
window.addEventListener('DOMContentLoaded',()=>{
  sweepOldCaches();
  migrateFavorites();
  buildChips();
  setupAutocomplete('dest','dest-ac','dest');
  setupAutocomplete('dep','dep-ac','dep');
  const t=new Date(); t.setDate(t.getDate()+1);
  $('date').value=t.toISOString().split('T')[0];
  $('go').addEventListener('click',generate);
  // favorieten via event-delegation — werkt ook voor namen met een apostrof (O'Briens, L'Escale)
  document.addEventListener('click',ev=>{
    const btn = ev.target.closest && ev.target.closest('.fav-btn');
    if(btn){ ev.preventDefault(); toggleFavorite(btn); }
  });
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }

  setupInstallPrompt();

});
