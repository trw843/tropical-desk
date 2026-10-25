# Tropical Desk
Static site. `scripts/refresh.mjs` fetches NOAA data into `data/` and `img/`; `.github/workflows/refresh.yml` runs it every 30 minutes and deploys to GitHub Pages.
`data/config.json` ships as `{"mode":"snapshot"}`. The page only says "Live" when it is set to `live`. Change it to `live` ONLY after at least one scheduled (not manual) run has succeeded and the deployed page shows its fetch time; the page then also shows "by scheduled run #N" and flags any map older than 3 hours as OUT OF DATE.
