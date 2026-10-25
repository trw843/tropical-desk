// Pulls US-government (NOAA/NWS/NHC) products into /img and /data. Run on a schedule.
import { writeFile, mkdir } from 'node:fs/promises';
const UA = { 'User-Agent': 'tropical-desk-refresh (contact: set-in-repo)' };
const IMAGES = [
  ['nhc-atl-2day.png', 'https://www.nhc.noaa.gov/xgtwo/resize/xgtwo_atl_2d0_w1024.png', 'NHC Tropical Weather Outlook, Atlantic, 2 days', 'https://www.nhc.noaa.gov/gtwo.php?basin=atlc'],
  ['nhc-atl-7day.png', 'https://www.nhc.noaa.gov/xgtwo/resize/xgtwo_atl_7d0_w1024.png', 'NHC Tropical Weather Outlook, Atlantic, 7 days', 'https://www.nhc.noaa.gov/gtwo.php?basin=atlc'],
  ['nhc-epac-2day.png', 'https://www.nhc.noaa.gov/xgtwo/resize/xgtwo_pac_2d0_w1024.png', 'NHC Tropical Weather Outlook, Eastern Pacific, 2 days', 'https://www.nhc.noaa.gov/gtwo.php?basin=epac'],
  ['sst-anomaly.png', 'https://www.ospo.noaa.gov/data/cb/ssta/ssta.daily.current.png', 'Sea surface temperature anomaly, NOAA OSPO', 'https://www.ospo.noaa.gov/products/ocean/sst/anomaly/'],
  ['olr-30day.gif', 'https://www.cpc.ncep.noaa.gov/products/precip/CWlink/MJO/olra_last30days-3plots.gif', 'Outgoing longwave radiation, last 30 days, NOAA CPC', 'https://www.cpc.ncep.noaa.gov/products/precip/CWlink/MJO/'],
  ['goes-fulldisk.jpg', 'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/678x678.jpg', 'GOES-19 GeoColor full disk, NOAA STAR', 'https://www.star.nesdis.noaa.gov/goes/'],
  ['nhc-atl-surface.gif', 'https://www.nhc.noaa.gov/tafb_latest/WATL_latest.gif', 'Surface analysis, SW North Atlantic, NHC Tropical Analysis and Forecast Branch', 'https://www.nhc.noaa.gov/tafb/'],
  ['radar-conus.gif', 'https://radar.weather.gov/ridge/standard/CONUS_0.gif', 'National radar mosaic, NWS', 'https://radar.weather.gov/'],
];
await mkdir('img', { recursive: true }); await mkdir('data', { recursive: true });
let prev = {}; try { prev = Object.fromEntries(JSON.parse(await (await import('node:fs/promises')).readFile('data/images.json','utf8')).images.map(i => [i.file, i])); } catch {}
const meta = [];
let failed = 0;
for (const [file, url, title, page] of IMAGES) {
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(r.status);
    await writeFile(`img/${file}`, Buffer.from(await r.arrayBuffer()));
    meta.push({ file, title, page, source: url, fetchedAt: new Date().toISOString(), sourceModified: r.headers.get('last-modified') });
  } catch (e) { failed++; console.error('image failed', file, String(e)); if (prev[file]) meta.push(prev[file]); } // keep previous file; manifest keeps old entry below
}
if (failed > IMAGES.length / 2) { console.error('Too many image failures; leaving data unchanged'); process.exit(1); }
let storms = null;
try { const sr = await fetch('https://www.nhc.noaa.gov/CurrentStorms.json', { headers: UA, signal: AbortSignal.timeout(30000) }); if (!sr.ok) throw new Error(sr.status); storms = await sr.json(); if (!Array.isArray(storms.activeStorms)) throw new Error('unexpected shape'); } catch (e) { console.error('storms feed failed; leaving storms.json unchanged', String(e)); }
// Per-storm graphics: discovered from the official graphics page that NHC lists in CurrentStorms.json.
const WANT = [['5day_cone_sm', 'cone', 'Forecast cone, 5 days'], ['current_wind_sm', 'wind', 'Current wind field'], ['wind_probs_34_F120_sm', 'prob', 'Chance of 34-kt winds'], ['key_messages_sm', 'keymsg', 'Key messages']];
if (storms) for (const st of storms.activeStorms) {
  st.graphics = [];
  try {
    const page = await (await fetch(st.forecastGraphics.url, { headers: UA })).text();
    for (const [needle, tag, title] of WANT) {
      const m = page.match(new RegExp('src="(/storm_graphics/[^"]*' + needle + '\\+png/[^"]+\\.png)"'));
      if (!m) continue;
      const url = new URL(m[1].replace(/_sm(?=\+png|\.png)/g, ''), 'https://www.nhc.noaa.gov').href; // full-size image sits beside the thumbnail on the official page
      const r = await fetch(url, { headers: UA }); if (!r.ok) continue;
      const file = `storm-${st.id}-${tag}.png`;
      await writeFile(`img/${file}`, Buffer.from(await r.arrayBuffer()));
      st.graphics.push({ file, title, source: url, page: st.forecastGraphics.url, sourceModified: r.headers.get('last-modified'), fetchedAt: new Date().toISOString() });
    }
  } catch (e) { console.error('storm graphics failed', st.id, String(e)); }
}
if (storms) {
  await writeFile('data/storms.json', JSON.stringify({ fetchedAt: new Date().toISOString(), storms: storms.activeStorms }, null, 1));
  const keep = new Set(storms.activeStorms.flatMap(s => (s.graphics || []).map(g => g.file)));
  const { readdir, unlink } = await import('node:fs/promises');
  for (const f of await readdir('img')) if (f.startsWith('storm-') && !keep.has(f)) await unlink('img/' + f);
}
await writeFile('data/images.json', JSON.stringify({ fetchedAt: new Date().toISOString(), images: meta }, null, 1));

await writeFile('data/run.json', JSON.stringify({ event: process.env.GITHUB_EVENT_NAME || null, runNumber: process.env.GITHUB_RUN_NUMBER || null, at: new Date().toISOString() }));
