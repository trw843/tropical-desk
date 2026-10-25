// Tropical Desk page renderer. Shared by the static site and the hosted File preview.
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TZ = typeof window !== 'undefined' && window.TD_TZ ? { timeZone: window.TD_TZ } : {};
export const fmt = (s, tz) => { if (!s) return 'unknown'; const d = new Date(s); if (isNaN(d)) return 'unknown'; return d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', ...(tz ? { timeZone: tz, timeZoneName: 'short' } : {}) }); };
const STALE_MS = 3 * 36e5;
const CLS = { TD: 'Tropical depression', TS: 'Tropical storm', HU: 'Hurricane', STD: 'Subtropical depression', STS: 'Subtropical storm', PTC: 'Potential tropical cyclone' };
const BASIN = { al: 'Atlantic', ep: 'Eastern Pacific', cp: 'Central Pacific' };
const COMP = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const mph = kt => Math.round(kt * 1.15078 / 5) * 5;
const cat = kt => kt >= 137 ? 'Category 5' : kt >= 113 ? 'Category 4' : kt >= 96 ? 'Category 3' : kt >= 83 ? 'Category 2' : kt >= 64 ? 'Category 1' : '';
const GROUPS = [
  { id: 'outlook', label: 'Outlook', maps: [['nhc-atl-2day.png', 'Atlantic 2-day'], ['nhc-atl-7day.png', 'Atlantic 7-day'], ['nhc-epac-2day.png', 'E. Pacific 2-day']] },
  { id: 'sat', label: 'Satellite', maps: [['goes-fulldisk.jpg', 'GOES-19 view'], ['nhc-atl-surface.gif', 'Surface map']] },
  { id: 'sea', label: 'Ocean and air', maps: [['sst-anomaly.png', 'Ocean heat'], ['olr-30day.gif', 'Storm activity']] },
  { id: 'radar', label: 'US radar', maps: [['radar-conus.gif', 'Radar']] },
];
const CREDIT = { 'sst-anomaly.png': 'NOAA OSPO', 'olr-30day.gif': 'NOAA Climate Prediction Center', 'goes-fulldisk.jpg': 'NOAA/NESDIS/STAR (experimental product, not an official operational product)', 'radar-conus.gif': 'NOAA National Weather Service', 'nhc-atl-surface.gif': 'NOAA National Hurricane Center, Tropical Analysis and Forecast Branch' };
const creditOf = f => CREDIT[f] || 'NOAA National Hurricane Center';

const polar = (a, r = 40) => { const t = a * Math.PI / 180; return [60 + r * Math.cos(t), 56 - r * Math.sin(t)]; };
const ARC = (() => { const s = polar(210), e = polar(-30); return `M${s[0].toFixed(1)} ${s[1].toFixed(1)} A40 40 0 1 1 ${e[0].toFixed(1)} ${e[1].toFixed(1)}`; })();
const arcGauge = (frac, color) => `<svg viewBox="0 0 120 84" class="gauge" aria-hidden="true"><path d="${ARC}" pathLength="100" fill="none" stroke="#e4ebe3" stroke-width="12" stroke-linecap="round"/><path d="${ARC}" pathLength="100" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${Math.max(2, Math.min(1, frac) * 100).toFixed(1)} 100"/></svg>`;
const compass = deg => `<svg viewBox="0 0 120 84" class="gauge" aria-hidden="true"><circle cx="60" cy="44" r="34" fill="#f4f8f3" stroke="#e4ebe3" stroke-width="3"/><text x="60" y="18" text-anchor="middle" font-size="9" fill="#6b7b8c">N</text><g transform="rotate(${+deg || 0} 60 44)"><path d="M60 22 L68 50 L60 45 L52 50 Z" fill="#1f7a7c"/></g></svg>`;
const windColor = kt => kt >= 96 ? '#d6402b' : kt >= 64 ? '#f08a3c' : kt >= 34 ? '#f2c14e' : '#6fc0b5';
const STORM_TAGS = { cone: 'Forecast cone', wind: 'Wind now', prob: 'Wind chance', keymsg: 'Key messages' };
const COAST = [['Buoys and ocean observations', 'NOAA National Data Buoy Center', 'https://www.ndbc.noaa.gov/'], ['Marine forecasts and waves', 'NOAA Ocean Prediction Center', 'https://ocean.weather.gov/'], ['Storm surge', 'NHC surge hazard and flooding maps', 'https://www.nhc.noaa.gov/surge/'], ['Rivers and flooding', 'NOAA National Water Prediction Service', 'https://water.noaa.gov/'], ['NOAA Weather Radio', 'Alerts on a dedicated radio, with station finder', 'https://www.weather.gov/nwr/'], ['Your local forecast office', 'weather.gov', 'https://www.weather.gov/'], ['Wind shear, vorticity, Saharan air', 'UW-CIMSS tropical page (third party)', 'https://tropic.ssec.wisc.edu/'], ['MJO and tropical outlook', 'NOAA Climate Prediction Center', 'https://www.cpc.ncep.noaa.gov/products/precip/CWlink/MJO/mjo.shtml'], ['Hurricane preparedness', 'NHC and NWS safety guidance', 'https://www.nhc.noaa.gov/prepare/']];
const MODELS = [['Tropical Tidbits', 'Model maps: GFS, Euro, CMC, ICON', 'https://www.tropicaltidbits.com/analysis/models/'], ['CSU tropical forecasts', 'Seasonal and two-week outlooks', 'https://tropical.colostate.edu/'], ['Univ. at Albany guidance', 'Track and intensity guidance', 'http://www.atmos.albany.edu/facstaff/tang/tcguidance/'], ['Weathernerds', 'Spaghetti plots and satellite', 'http://weathernerds.org/'], ['Google DeepMind Weather Lab', 'AI cyclone forecasts (experimental)', 'https://deepmind.google/science/weatherlab/'], ['CyclonicWx', 'Satellite and analysis', 'https://www.cyclonicwx.com/'], ['PolarWX tropical', 'Tropical dashboard', 'https://polarwx.com/tropical/'], ['NHC discussion', 'Official forecaster reasoning', 'https://www.nhc.noaa.gov/text/']];
const ALERT_URL = 'https://api.weather.gov/alerts/active?event=Hurricane%20Warning,Hurricane%20Watch,Tropical%20Storm%20Warning,Tropical%20Storm%20Watch,Storm%20Surge%20Warning,Storm%20Surge%20Watch,Extreme%20Wind%20Warning,Typhoon%20Warning,Typhoon%20Watch';
const REL = /^(Hurricane|Tropical Storm|Storm Surge|Typhoon) (Warning|Watch)$|^Extreme Wind Warning$/;
const ext = 'target="_blank" rel="noopener noreferrer"';
const links = items => `<div class="links">${items.map(m => `<a href="${m[2]}" ${ext}>${esc(m[0])}<span>${esc(m[1])}</span></a>`).join('')}</div>`;

// opts: { images, storms, imgUrl(file), mode: 'snapshot'|'live', tz, liveAlerts: bool, credits: html }
export function mount(root, opts) {
  const { images, storms, imgUrl, tz } = opts; const live = opts.mode === 'live';
  const by = Object.fromEntries(images.images.map(i => [i.file, i]));
  const now = Date.now(); const age = i => now - +new Date(i.fetchedAt);
  const stormList = storms.storms || [];
  const groups = [];
  for (const s of stormList) if ((s.graphics || []).length) groups.push({ id: 'storm-' + s.id, label: s.name, storm: true, maps: s.graphics.map(g => { const tag = (g.file.match(/-([a-z]+)\.png$/) || [])[1]; return [g.file, STORM_TAGS[tag] || g.title, g]; }) });
  for (const g of GROUPS) groups.push({ ...g, maps: g.maps.filter(m => by[m[0]]) });
  const entry = f => by[f] || stormList.flatMap(s => s.graphics || []).find(g => g.file === f);
  let gi = 0, mi = 0;
  const newestImg = Math.max(0, ...images.images.map(i => +new Date(i.fetchedAt)));
  const stormTime = +new Date(storms.fetchedAt);
  const stale = t => !t || now - t > STALE_MS;
  const stormChip = stormList.length ? stormList.map(s => { const kt = +s.intensity; return `<b>${esc(s.name)}</b> ${esc(CLS[s.classification] || s.classification)} · ${mph(kt)} mph` }).join('<br>') : 'None right now';
  const runNote = opts.run && opts.run.event ? (opts.run.event === 'schedule' ? ' by scheduled run' : ' by manual run') + (opts.run.runNumber ? ' #' + opts.run.runNumber : '') : '';
  const statusLine = live
    ? `Maps fetched ${fmt(newestImg, tz)}${runNote}${stale(newestImg) ? ' - OUT OF DATE, refresh has not succeeded recently' : ''}`
    : `Dated snapshot from ${fmt(newestImg, tz)}. Not updating on its own.`;
  const sourceInfo = (e, f) => `Source updated ${fmt(e.sourceModified, tz)} · fetched ${fmt(e.fetchedAt, tz)} · Credit: ${creditOf(f)}`;
  const stormCards = stormList.length ? stormList.map(s => { const kt = +s.intensity, sp = +s.movementSpeed, b = BASIN[s.id.slice(0, 2)] || ''; const dir = COMP[Math.round((+s.movementDir % 360) / 22.5) % 16]; const c = s.classification === 'HU' ? cat(kt) : ''; const pr = +s.pressure;
    return `<article class="storm ${s.classification === 'HU' ? 'hu' : ''}"><div class="storm-h"><span class="k">${esc(CLS[s.classification] || s.classification)}${c ? ' · ' + c : ''}</span><span class="basin">${esc(b)}</span></div><h3>${esc(s.name)}</h3><dl class="facts"><div><dt class="k">Top winds</dt><dd class="gv">${mph(kt)}<small> mph</small><span class="gs">${kt} kt${c ? ' · ' + c : ''}</span></dd></div>
    <div><dt class="k">Central pressure</dt><dd class="gv">${esc(s.pressure)}<small> mb</small></dd></div>
    <div><dt class="k">Moving</dt><dd class="gv">${dir}<small> ${sp} mph</small><span class="gs">toward ${esc(s.movementDir)}°</span></dd></div>
    <div><dt class="k">Position</dt><dd class="gv sm">${esc(s.latitude)}, ${esc(s.longitude)}</dd></div></dl>
    <p class="fine">NHC advisory ${esc(s.publicAdvisory?.advNum)}, ${fmt(s.lastUpdate, tz)}. Sustained 1-minute winds; NHC reports knots, mph is converted. <a href="${esc(s.publicAdvisory?.url || 'https://www.nhc.noaa.gov/')}" ${ext}>Official advisory</a></p></article>` }).join('')
    : `<article class="storm calm"><h3>No active tropical cyclones</h3><p class="fine">The National Hurricane Center lists none right now (list fetched ${fmt(stormTime, tz)}).</p></article>`;
  root.innerHTML = `
  <header class="top"><a class="brand" href="#top">Tropical Desk</a>
  <nav aria-label="Sections"><a href="#maps">Maps</a><a href="#storms">Storms</a><a href="#models">Models</a><a href="#sources">Sources</a></nav></header>
  <main id="top">
  <section class="glance" aria-label="At a glance">
    <div class="chip"><span class="k">Active storms</span><span class="n">${stormList.length}</span><span class="d">${stormChip}</span></div>
    <div class="chip"><span class="k">US tropical warnings and watches</span><span class="n ${opts.liveAlerts ? '' : 'sm'}" id="alert-n">${opts.liveAlerts ? '…' : 'Not shown here'}</span><span class="d" id="alert-d">${opts.liveAlerts ? 'Checking National Weather Service…' : 'Live on the deployed site only. <a href="https://www.weather.gov/" ' + ext + '>weather.gov</a>'}</span></div>
    <div class="chip ${live && stale(newestImg) ? 'bad' : ''}"><span class="k">Data</span><span class="n sm">${live ? 'Live' : 'Snapshot'}</span><span class="d">${esc(statusLine)}</span></div>
  <p class="gnote">${esc(statusLine)}${opts.liveAlerts ? ' · warnings checked live' : ''}</p></section>
  <section id="maps" class="stage" aria-label="Maps">
    <div class="groups" role="tablist" aria-label="Map groups">${groups.map((g, i) => `<button role="tab" class="g ${g.storm ? 'gs' : ''}" data-g="${i}">${g.storm ? '● ' : ''}${esc(g.label)}</button>`).join('')}</div>
    <div class="vw"><figure class="viewer"><a id="v-link" ${ext}><img id="v-img" alt=""></a><figcaption><div class="cap-t"><strong id="v-title"></strong><span id="v-stale" class="stale-tag" hidden>OUT OF DATE</span></div><div class="cap-s" id="v-src"></div><div class="cap-l"><a id="v-page" ${ext}>Official page</a><a id="v-full" ${ext}>Full-size image</a></div></figcaption></figure>
    <div class="thumbs" role="tablist" aria-label="Maps in this group" id="thumbs"></div></div>
  </section>
  <section id="storms" class="wrap"><h2>Storms</h2><div class="storms">${stormCards}</div>
    <div class="alerts"><h3>US tropical warnings and watches</h3><p class="fine" id="alert-note">${opts.liveAlerts ? 'Live from the National Weather Service, checked each time you open or refresh this page. This covers US areas only. Warnings issued by other countries, such as Mexico, are not shown: see the official advisory for each storm.' : 'Live warnings run only on the deployed site, not in this preview. For current warnings see weather.gov.'}</p><ul id="alerts"><li>${opts.liveAlerts ? 'Loading…' : 'Not shown in this preview.'}</li></ul><p class="fine">Official warnings come from the National Weather Service. Everything under Model guidance is research or enthusiast material, not an official forecast.</p></div></section>
  <section class="wrap"><h2>Coast and sea</h2>${links(COAST)}</section>
  <section id="models" class="wrap"><h2>Model guidance</h2><p class="fine">Models disagree with each other and with reality. These links open each source's own site. Not official forecasts.</p>${links(MODELS)}</section>
  <section id="sources" class="wrap"><h2>Sources, reuse and limits</h2>${opts.credits}</section>
  </main><footer>Tropical Desk. Not affiliated with or endorsed by NOAA or the National Weather Service. ${live ? '' : 'Private prototype.'}</footer>`;

  const $ = s => root.querySelector(s);
  const groupBtns = [...root.querySelectorAll('.g')];
  function show() {
    const g = groups[gi]; const m = g.maps[mi] || g.maps[0]; const e = entry(m[0]); if (!e) return;
    groupBtns.forEach((b, i) => b.setAttribute('aria-selected', i === gi));
    $('#thumbs').innerHTML = g.maps.map((x, i) => `<button role="tab" class="th" data-m="${i}" aria-selected="${i === mi}"><img src="${imgUrl(x[0])}" alt="" loading="lazy"><span>${esc(x[1])}</span></button>`).join('');
    const title = (g.storm ? g.label + ': ' : '') + (e.title || m[1]);
    const img = $('#v-img'); img.src = imgUrl(m[0]); img.alt = title;
    $('#v-title').textContent = title; $('#v-src').textContent = sourceInfo(e, m[0]);
    const st = $('#v-stale'); st.hidden = !(live && stale(+new Date(e.fetchedAt)));
    const pg = $('#v-page'); pg.href = e.page || '#'; $('#v-full').href = e.source || '#'; $('#v-link').href = e.source || '#';
    root.querySelectorAll('.th').forEach(b => b.onclick = () => { mi = +b.dataset.m; show(); });
  }
  groupBtns.forEach(b => b.onclick = () => { gi = +b.dataset.g; mi = 0; show(); });
  show();

  if (opts.liveAlerts) {
    fetch(ALERT_URL).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(j => {
      if (!j || !Array.isArray(j.features)) throw new Error('unexpected response');
      const f = j.features.filter(a => a.properties && REL.test(a.properties.event) && (!a.properties.expires || new Date(a.properties.expires) > new Date()));
      $('#alert-n').textContent = f.length; $('#alert-d').textContent = f.length ? 'See Storms section' : 'None for US areas as of ' + fmt(new Date().toISOString(), tz);
      $('#alerts').innerHTML = f.length ? f.slice(0, 25).map(a => `<li class="${/Warning/.test(a.properties.event) ? 'warn' : 'watch'}"><strong>${esc(a.properties.event)}</strong> ${esc(a.properties.areaDesc).slice(0, 160)} <span class="muted">until ${fmt(a.properties.expires, tz)}</span></li>`).join('') : '<li>None in effect for US areas.</li>';
      if (f.length) $('#alert-n').classList.add('hot');
    }).catch(() => { $('#alert-n').textContent = '?'; $('#alert-d').innerHTML = 'Could not load. Check <a href="https://www.weather.gov/" ' + ext + '>weather.gov</a>'; $('#alerts').innerHTML = '<li>Could not load. Check <a href="https://www.weather.gov/" ' + ext + '>weather.gov</a>.</li>'; });
  }
}
export const CREDITS = '<p>Every map is shown unaltered, with its credit and a link to its official page. National Hurricane Center, National Weather Service (including the Climate Prediction Center, whose pages point to the NWS policy) and NOAA OSPO products are public domain under those offices\' published policies. The policies allow free use if the content is not modified and presented as official government material, is not used to imply endorsement, and is not claimed as our own; OSPO asks for credit to NOAA. NOAA/NESDIS/STAR allows free use of its images with credit to STAR; its satellite images are experimental products, not official operational ones, and its pages can be interrupted at any time. This site is not affiliated with or endorsed by NOAA or the National Weather Service.</p><p class="fine">Policies: <a href="https://www.nhc.noaa.gov/disclaimer.shtml" ' + ext + '>NHC</a> · <a href="https://www.weather.gov/disclaimer" ' + ext + '>NWS</a> · <a href="https://ospo.noaa.gov/Organization/About/use.html" ' + ext + '>OSPO</a> · <a href="https://www.star.nesdis.noaa.gov/star/productdisclaimer.php" ' + ext + '>STAR</a></p><p>Model-guidance and other third-party sites are linked, not copied.</p>';
