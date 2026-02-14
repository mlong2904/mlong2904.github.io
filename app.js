const config = {
  // Add your CSV files here in load order.
  csvFiles: ["data/market_value_master_1991_2026_non_all_stars.csv"],
  previewRows: 8,
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((value) => value.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

async function loadFirstAvailableCsv(paths) {
  for (const path of paths) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) {
        continue;
      }
      const text = await response.text();
      const rows = parseCsv(text);
      if (rows.length >= 2) {
        return { path, rows };
      }
    } catch (_error) {
      // Try the next file path.
    }
  }
  return null;
}

function renderTable(data, sourcePath) {
  const table = document.getElementById("csv-table");
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");
  const source = document.getElementById("csv-source");
  const stats = document.getElementById("csv-stats");

  const [headers, ...rows] = data;
  const preview = rows.slice(0, config.previewRows);

  thead.innerHTML = `<tr>${headers.map((name) => `<th>${name}</th>`).join("")}</tr>`;
  tbody.innerHTML = preview
    .map(
      (row) =>
        `<tr>${headers
          .map((_, index) => `<td>${row[index] ? row[index] : ""}</td>`)
          .join("")}</tr>`
    )
    .join("");

  source.textContent = `Loaded: ${sourcePath}`;
  stats.innerHTML = [
    `<span class="stat-pill">Rows: ${rows.length}</span>`,
    `<span class="stat-pill">Columns: ${headers.length}</span>`,
    `<span class="stat-pill">Preview: ${preview.length} rows</span>`,
  ].join("");
}

function renderFallback() {
  const source = document.getElementById("csv-source");
  const stats = document.getElementById("csv-stats");
  source.textContent = "Could not load CSV. Check file paths in app.js.";
  stats.innerHTML = '<span class="stat-pill">CSV not found</span>';
}

(async function init() {
  const loaded = await loadFirstAvailableCsv(config.csvFiles);
  if (!loaded) {
    renderFallback();
    return;
  }

  renderTable(loaded.rows, loaded.path);
})();
