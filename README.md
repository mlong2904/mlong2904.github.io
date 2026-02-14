# mlong2904.github.io

Portfolio site for `https://mlong2904.github.io`.

## Files
- `index.html` - portfolio layout
- `styles.css` - site styles
- `app.js` - CSV loader + preview table

## Add your NBA CSV data
1. Put your files inside `data/` (example: `data/nba_success.csv`).
2. Open `app.js` and edit `config.csvFiles` with your file names.
3. Commit and push.

The site loads the first CSV file that exists and shows row/column stats with a table preview.

## Publish on GitHub Pages
1. Push this repository to GitHub.
2. In GitHub, open **Settings -> Pages**.
3. Under **Build and deployment**, set:
   - **Source:** Deploy from a branch
   - **Branch:** `main` and `/ (root)`
4. Wait for deployment, then open `https://mlong2904.github.io`.
