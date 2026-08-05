# mlong2904.github.io

Portfolio site for `https://mlong2904.github.io`.

## Site structure
- `index.html` - intro/home page
- `projects.html` - project menu page
- `project-undervalued-players.html` - detail page for NBA undervalued players project
- `project-aris-dcf.html` - detail page for the Aris Mining DCF valuation
- `styles.css` - shared site styles
- `app.js` - CSV preview logic for project detail pages
- `data/` - local datasets used by project pages

## Projects
- NBA Undervalued Players Analysis
  - datasets:
    - `data/market_value_war_master_1991_2026_non_all_stars.csv`
    - `data/market_value_war_master_1991_2026.csv`
- Aris Mining DCF Valuation
  - source model: https://github.com/mlong2904/dcfvaluations (`aris/`)
  - outputs mirrored under `data/aris/` (valuation summary, scenarios, FCFF, equity bridge,
    WACC, sensitivities, model checks, assumptions ledger, source register)
