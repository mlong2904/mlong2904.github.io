# mlong2904.github.io

Portfolio site for `https://mlong2904.github.io`.

## Site structure
- `index.html` - intro/home page
- `projects.html` - project menu page
- `project-undervalued-players.html` - detail page for NBA undervalued players project
- `project-aris-dcf.html` - detail page for the Aris Mining DCF valuation
- `project-apparel-demand.html` - detail page for the apparel demand and inventory model
- `project-lockedin.html` - case study page for LockedIn
- `styles.css` - shared site styles
- `app.js` - CSV preview logic for the NBA project page
- `apparel-model.js` - demand model and inventory solver for the apparel project page
- `data/` - local datasets used by project pages

## Projects
- Undervalued NBA Players
  - source project: https://github.com/mlong2904/Undervalued-NBA-Players
  - scope: end-to-end team wins, player contribution, custom cWAR and value-ranking pipeline
  - datasets:
    - `data/market_value_war_master_1991_2026_non_all_stars.csv`
    - `data/market_value_war_master_1991_2026.csv`
- Aris Mining DCF Valuation
  - source model: https://github.com/mlong2904/dcfvaluations (`aris/`)
  - outputs mirrored under `data/aris/` (valuation summary, scenarios, FCFF, equity bridge,
    WACC, sensitivities, model checks, assumptions ledger, source register)
- Apparel Demand & Inventory Model
  - course project: MGMT 472, Advanced Spreadsheet and Modeling, Purdue University
  - scope: monthly apparel demand for the United States and Canada, driven by temperature.
    Berkeley Earth land temperatures (2000-02 to 2013-09) feed a two-arm demand curve, winter
    apparel rising as temperature falls and summer apparel as it climbs, each scaled by a
    market-size factor and a seasonal factor. `FORECAST.ETS` with a 12-month seasonality
    projects each country forward, and the resulting demand drives an inventory buffer policy
    priced against stockout and holding cost.
  - the project page charts both countries and includes an interactive solver for the buffer that
    minimises expected cost; `apparel-model.js` implements the model in the browser
  - datasets under `data/apparel/`:
    - `Apparel_Demand_Model.xlsx` (the Excel model, including the Berkeley Earth sheets)
    - `us_history.csv`, `canada_history.csv` (temperature history and modelled demand)
    - `us_forecast.csv`, `canada_forecast.csv` (forecast horizons)
    - `lookup_tables.csv` (country factors, season factors, model parameters)
