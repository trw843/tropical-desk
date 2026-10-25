import { mount, CREDITS } from './core.js';
const j = u => fetch(u).then(r => { if (!r.ok) throw new Error(u); return r.json(); });
Promise.all([j('data/images.json'), j('data/storms.json'), j('data/config.json').catch(() => ({ mode: 'snapshot' })), j('data/run.json').catch(() => null)]).then(([images, storms, cfg, run]) => {
  const credits = CREDITS + (cfg.mode === 'live' ? '<p>Maps are set to refresh about every 30 minutes by a scheduled job. Each map shows when its source last updated and when we last fetched it; a map older than 3 hours is marked out of date.</p>' : '<p>Update status: private prototype. Images are a dated snapshot and do not refresh by themselves. Automatic refresh about every 30 minutes is planned but not turned on.</p>');
  mount(document.getElementById('app'), { images, storms, imgUrl: f => 'img/' + f, mode: cfg.mode, run, liveAlerts: true, credits });
}).catch(() => { document.getElementById('app').innerHTML = '<p style="padding:24px">Could not load data. See <a href="https://www.nhc.noaa.gov/">nhc.noaa.gov</a>.</p>'; });
