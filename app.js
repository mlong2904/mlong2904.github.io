const config = {
  csvFile: "data/market_value_master_1991_2026_non_all_stars.csv",
  defaultRowsPerPage: 100,
};

const state = {
  headers: [],
  rows: [],
  filteredRows: [],
  currentPage: 1,
  rowsPerPage: config.defaultRowsPerPage,
  sortField: "undervalued_score",
  sortDirection: "desc",
};

const HEADER_LABELS = {
  season: "Season",
  player: "Player",
  player_id: "Player ID",
  lg: "League",
  mp: "Minutes Played",
  g: "Games",
  wins_above_average: "Wins Above Avg",
  mp_per_game: "Minutes Per Game",
  prev_wins_above_average: "Prev Wins Above Avg",
  prev_mp: "Prev Minutes",
  prev_g: "Prev Games",
  career_season_num: "Career Season #",
  season_idx: "Season Index",
  expected_wins_above_average: "Expected Wins Above Avg",
  value_residual: "Value Residual",
  undervalued_score: "Undervalued Score",
  season_residual_z: "Season Residual Z",
  is_all_star: "All Star",
};

const INTEGER_COLUMNS = new Set(["season", "g", "mp", "prev_mp", "season_idx", "career_season_num"]);

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

async function loadCsv(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load ${path}`);
  }

  const text = await response.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    throw new Error("CSV must include headers and at least one data row.");
  }

  return rows;
}

function renderTable(headers, rows, sourcePath) {
  const table = document.getElementById("csv-table");
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");
  const source = document.getElementById("csv-source");
  const stats = document.getElementById("csv-stats");
  const totalPages = Math.max(1, Math.ceil(rows.length / state.rowsPerPage));
  if (state.currentPage > totalPages) {
    state.currentPage = totalPages;
  }
  const start = (state.currentPage - 1) * state.rowsPerPage;
  const end = start + state.rowsPerPage;
  const pageRows = rows.slice(start, end);

  thead.innerHTML = `<tr>${headers
    .map((name) => {
      const isActiveDesc = state.sortField === name && state.sortDirection === "desc";
      const isActiveAsc = state.sortField === name && state.sortDirection === "asc";
      return `
        <th>
          <div class="th-wrap">
            <span>${formatHeaderLabel(name)}</span>
            <span class="th-sort">
              <button
                type="button"
                class="th-sort-btn ${isActiveDesc ? "is-active" : ""}"
                data-sort-header="${name}"
                data-sort-direction="desc"
                aria-label="Sort ${formatHeaderLabel(name)} high to low"
                title="High to low"
              >↓</button>
              <button
                type="button"
                class="th-sort-btn ${isActiveAsc ? "is-active" : ""}"
                data-sort-header="${name}"
                data-sort-direction="asc"
                aria-label="Sort ${formatHeaderLabel(name)} low to high"
                title="Low to high"
              >↑</button>
            </span>
          </div>
        </th>
      `;
    })
    .join("")}</tr>`;
  tbody.innerHTML = pageRows
    .map(
      (row) =>
        `<tr>${headers
          .map((header, index) => `<td>${formatCellValue(row[index], header)}</td>`)
          .join("")}</tr>`
    )
    .join("");

  source.textContent = `Loaded: ${sourcePath}`;
  stats.innerHTML = [
    `<span class="stat-pill">Filtered rows: ${rows.length}</span>`,
    `<span class="stat-pill">Rows per page: ${state.rowsPerPage}</span>`,
    `<span class="stat-pill">Showing: ${pageRows.length}</span>`,
    `<span class="stat-pill">Page: ${state.currentPage}/${totalPages}</span>`,
    `<span class="stat-pill">Columns: ${headers.length}</span>`,
  ].join("");

  renderPagination(totalPages, start + 1, Math.min(end, rows.length), rows.length);
}

function renderFallback(message) {
  const source = document.getElementById("csv-source");
  const stats = document.getElementById("csv-stats");
  const tbody = document.querySelector("#csv-table tbody");

  source.textContent = message;
  stats.innerHTML = '<span class="stat-pill">CSV not found</span>';
  tbody.innerHTML = "<tr><td>Unable to load dataset.</td></tr>";
}

function renderPagination(totalPages, startRow, endRow, totalRows) {
  const pageInfo = document.getElementById("page-info");
  const pageJump = document.getElementById("page-jump");
  const prevButton = document.getElementById("page-prev");
  const nextButton = document.getElementById("page-next");

  if (!pageInfo || !pageJump || !prevButton || !nextButton) {
    return;
  }

  if (totalRows === 0) {
    pageInfo.textContent = "No rows match your filters.";
    pageJump.value = "1";
    pageJump.max = "1";
    prevButton.disabled = true;
    nextButton.disabled = true;
    return;
  }

  pageInfo.textContent = `Showing ${startRow}-${endRow} of ${totalRows}`;
  pageJump.value = String(state.currentPage);
  pageJump.max = String(totalPages);
  prevButton.disabled = state.currentPage <= 1;
  nextButton.disabled = state.currentPage >= totalPages;
}

function formatHeaderLabel(header) {
  if (HEADER_LABELS[header]) {
    return HEADER_LABELS[header];
  }
  return header
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCellValue(value, header) {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    if (INTEGER_COLUMNS.has(header)) {
      return String(Math.round(numeric));
    }
    return numeric.toFixed(1);
  }
  return String(value);
}

function indexByName(name) {
  return state.headers.indexOf(name);
}

function numericValue(row, index) {
  if (index < 0) {
    return NaN;
  }
  const parsed = Number(row[index]);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function textValue(row, index) {
  if (index < 0) {
    return "";
  }
  return String(row[index] || "");
}

function playerSortKey(name) {
  const cleaned = String(name || "").trim().toLowerCase();
  if (!cleaned) {
    return "";
  }
  const parts = cleaned.split(/\s+/);
  const last = parts[parts.length - 1];
  return `${last} ${cleaned}`;
}

function getControlValue(id) {
  const element = document.getElementById(id);
  return element ? element.value : "";
}

function parseOptionalNumber(value) {
  const trimmed = String(value).trim();
  if (trimmed === "") {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function renderVisualizations(rows) {
  renderTopUndervaluedBars(rows);
  renderSeasonTrend(rows);
}

function renderTopUndervaluedBars(rows) {
  const container = document.getElementById("top-undervalued-bars");
  if (!container) {
    return;
  }

  const playerIndex = indexByName("player");
  const seasonIndex = indexByName("season");
  const scoreIndex = indexByName("undervalued_score");

  const topRows = rows
    .map((row) => ({
      player: textValue(row, playerIndex),
      season: numericValue(row, seasonIndex),
      score: numericValue(row, scoreIndex),
    }))
    .filter((row) => row.player && Number.isFinite(row.season) && Number.isFinite(row.score))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  if (!topRows.length) {
    container.innerHTML = '<p class="viz-meta">No rows available for this chart.</p>';
    return;
  }

  const maxScore = Math.max(...topRows.map((row) => row.score), 1);
  container.innerHTML = topRows
    .map((row) => {
      const width = (row.score / maxScore) * 100;
      return `
        <div class="bar-row">
          <div class="bar-label">${row.player} (${Math.round(row.season)})</div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${width.toFixed(1)}%"></div>
          </div>
          <div class="bar-value">${row.score.toFixed(1)}</div>
        </div>
      `;
    })
    .join("");
}

function renderSeasonTrend(rows) {
  const svg = document.getElementById("season-trend-chart");
  const meta = document.getElementById("season-trend-meta");
  if (!svg || !meta) {
    return;
  }

  const seasonIndex = indexByName("season");
  const scoreIndex = indexByName("undervalued_score");
  const seasonMap = new Map();

  rows.forEach((row) => {
    const season = numericValue(row, seasonIndex);
    const score = numericValue(row, scoreIndex);
    if (!Number.isFinite(season) || !Number.isFinite(score)) {
      return;
    }
    if (!seasonMap.has(season)) {
      seasonMap.set(season, { sum: 0, count: 0 });
    }
    const current = seasonMap.get(season);
    current.sum += score;
    current.count += 1;
  });

  const points = Array.from(seasonMap.entries())
    .map(([season, summary]) => ({
      season,
      avg: summary.sum / summary.count,
    }))
    .sort((a, b) => a.season - b.season);

  if (!points.length) {
    svg.innerHTML = "";
    meta.textContent = "No rows available for this chart.";
    return;
  }

  const width = 680;
  const height = 220;
  const pad = { top: 20, right: 24, bottom: 36, left: 40 };
  const minSeason = points[0].season;
  const maxSeason = points[points.length - 1].season;
  const minAvg = Math.min(...points.map((point) => point.avg));
  const maxAvg = Math.max(...points.map((point) => point.avg));
  const seasonSpan = Math.max(1, maxSeason - minSeason);
  const avgSpan = Math.max(0.001, maxAvg - minAvg);

  const scaleX = (season) =>
    pad.left + ((season - minSeason) / seasonSpan) * (width - pad.left - pad.right);
  const scaleY = (avg) =>
    height - pad.bottom - ((avg - minAvg) / avgSpan) * (height - pad.top - pad.bottom);

  const polyline = points.map((point) => `${scaleX(point.season)},${scaleY(point.avg)}`).join(" ");
  const circles = points
    .map(
      (point) =>
        `<circle cx="${scaleX(point.season).toFixed(2)}" cy="${scaleY(point.avg).toFixed(2)}" r="2.8"></circle>`
    )
    .join("");
  const midSeason = Math.round((minSeason + maxSeason) / 2);
  const xTicks = [Math.round(minSeason), midSeason, Math.round(maxSeason)];
  const yTicks = [minAvg, (minAvg + maxAvg) / 2, maxAvg];
  const xTickLabels = xTicks
    .map((season) => {
      const x = scaleX(season);
      return `
        <line x1="${x.toFixed(2)}" y1="${(height - pad.bottom).toFixed(2)}" x2="${x.toFixed(2)}" y2="${(
        height - pad.bottom + 6
      ).toFixed(2)}" class="trend-tick"></line>
        <text x="${x.toFixed(2)}" y="${(height - pad.bottom + 18).toFixed(2)}" text-anchor="middle" class="trend-label">${season}</text>
      `;
    })
    .join("");
  const yTickLabels = yTicks
    .map((value) => {
      const y = scaleY(value);
      return `
        <line x1="${(pad.left - 6).toFixed(2)}" y1="${y.toFixed(2)}" x2="${pad.left.toFixed(2)}" y2="${y.toFixed(
        2
      )}" class="trend-tick"></line>
        <text x="${(pad.left - 10).toFixed(2)}" y="${(y + 3).toFixed(2)}" text-anchor="end" class="trend-label">${value.toFixed(
        1
      )}</text>
      `;
    })
    .join("");

  svg.innerHTML = `
    <line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" class="trend-axis"></line>
    <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" class="trend-axis"></line>
    ${xTickLabels}
    ${yTickLabels}
    <polyline points="${polyline}" class="trend-line"></polyline>
    <g class="trend-dots">${circles}</g>
    <text x="${((pad.left + width - pad.right) / 2).toFixed(2)}" y="${(height - 4).toFixed(2)}" text-anchor="middle" class="trend-axis-title">Season</text>
    <text x="14" y="${((pad.top + height - pad.bottom) / 2).toFixed(2)}" text-anchor="middle" transform="rotate(-90 14 ${(
      (pad.top + height - pad.bottom) /
      2
    ).toFixed(2)})" class="trend-axis-title">Avg Undervalued Score</text>
  `;

  meta.textContent = `Seasons ${Math.round(minSeason)}-${Math.round(maxSeason)} | Avg score range ${minAvg.toFixed(1)} to ${maxAvg.toFixed(1)}`;
}

function applyFiltersAndSort() {
  if (!state.rows.length) {
    return;
  }

  const playerQuery = getControlValue("filter-player").trim().toLowerCase();
  const seasonMin = parseOptionalNumber(getControlValue("filter-season-min"));
  const seasonMax = parseOptionalNumber(getControlValue("filter-season-max"));
  const minUndervalued = parseOptionalNumber(getControlValue("filter-min-undervalued"));
  const sortField = getControlValue("sort-field") || state.sortField || "undervalued_score";
  const sortDirection = getControlValue("sort-direction") || state.sortDirection || "desc";
  state.sortField = sortField;
  state.sortDirection = sortDirection;

  const playerIndex = indexByName("player");
  const seasonIndex = indexByName("season");
  const undervaluedIndex = indexByName("undervalued_score");
  const sortIndex = indexByName(sortField);

  let filtered = state.rows.filter((row) => {
    if (playerQuery) {
      const player = textValue(row, playerIndex).toLowerCase();
      if (!player.includes(playerQuery)) {
        return false;
      }
    }

    if (seasonMin !== null) {
      const season = numericValue(row, seasonIndex);
      if (!Number.isFinite(season) || season < seasonMin) {
        return false;
      }
    }

    if (seasonMax !== null) {
      const season = numericValue(row, seasonIndex);
      if (!Number.isFinite(season) || season > seasonMax) {
        return false;
      }
    }

    if (minUndervalued !== null) {
      const score = numericValue(row, undervaluedIndex);
      if (!Number.isFinite(score) || score < minUndervalued) {
        return false;
      }
    }

    return true;
  });

  filtered = filtered.sort((a, b) => {
    const aNum = numericValue(a, sortIndex);
    const bNum = numericValue(b, sortIndex);

    if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
      return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
    }

    const aText =
      sortField === "player"
        ? playerSortKey(textValue(a, sortIndex))
        : textValue(a, sortIndex).toLowerCase();
    const bText =
      sortField === "player"
        ? playerSortKey(textValue(b, sortIndex))
        : textValue(b, sortIndex).toLowerCase();
    if (aText < bText) {
      return sortDirection === "asc" ? -1 : 1;
    }
    if (aText > bText) {
      return sortDirection === "asc" ? 1 : -1;
    }
    return 0;
  });

  state.filteredRows = filtered;
  renderTable(state.headers, state.filteredRows, config.csvFile);
  renderVisualizations(state.filteredRows);
}

function applyFiltersSortAndResetPage() {
  state.currentPage = 1;
  applyFiltersAndSort();
}

function changePage(direction) {
  const totalPages = Math.max(1, Math.ceil(state.filteredRows.length / state.rowsPerPage));
  state.currentPage = Math.min(totalPages, Math.max(1, state.currentPage + direction));
  renderTable(state.headers, state.filteredRows, config.csvFile);
}

function jumpToPage(pageValue) {
  const totalPages = Math.max(1, Math.ceil(state.filteredRows.length / state.rowsPerPage));
  const page = Number(pageValue);
  if (!Number.isFinite(page)) {
    return;
  }
  state.currentPage = Math.min(totalPages, Math.max(1, Math.floor(page)));
  renderTable(state.headers, state.filteredRows, config.csvFile);
}

function wireControls() {
  const controls = [
    "filter-player",
    "filter-season-min",
    "filter-season-max",
    "filter-min-undervalued",
    "sort-field",
    "sort-direction",
    "rows-per-page",
  ];

  controls.forEach((id) => {
    const element = document.getElementById(id);
    if (!element) {
      return;
    }
    const eventName = element.tagName === "SELECT" ? "change" : "input";
    element.addEventListener(eventName, () => {
      if (id === "rows-per-page") {
        const rowsPerPage = Number(element.value);
        state.rowsPerPage = Number.isFinite(rowsPerPage) ? rowsPerPage : config.defaultRowsPerPage;
      }
      applyFiltersSortAndResetPage();
    });
  });

  const resetButton = document.getElementById("reset-filters");
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      controls.forEach((id) => {
        const element = document.getElementById(id);
        if (!element) {
          return;
        }
        if (id === "sort-field") {
          element.value = "undervalued_score";
        } else if (id === "sort-direction") {
          element.value = "desc";
        } else if (id === "rows-per-page") {
          element.value = String(config.defaultRowsPerPage);
        } else {
          element.value = "";
        }
      });
      state.rowsPerPage = config.defaultRowsPerPage;
      applyFiltersSortAndResetPage();
    });
  }

  const prevButton = document.getElementById("page-prev");
  const nextButton = document.getElementById("page-next");
  const pageJump = document.getElementById("page-jump");

  if (prevButton) {
    prevButton.addEventListener("click", () => changePage(-1));
  }
  if (nextButton) {
    nextButton.addEventListener("click", () => changePage(1));
  }
  if (pageJump) {
    pageJump.addEventListener("change", () => {
      jumpToPage(pageJump.value);
    });
  }

  const thead = document.querySelector("#csv-table thead");
  if (thead) {
    thead.addEventListener("click", (event) => {
      const button = event.target.closest(".th-sort-btn");
      if (!button) {
        return;
      }
      const sortFieldSelect = document.getElementById("sort-field");
      const sortDirectionSelect = document.getElementById("sort-direction");
      if (sortFieldSelect) {
        sortFieldSelect.value = button.dataset.sortHeader || "undervalued_score";
      }
      if (sortDirectionSelect) {
        sortDirectionSelect.value = button.dataset.sortDirection || "desc";
      }
      applyFiltersSortAndResetPage();
    });
  }
}

async function initCsvPreview() {
  const table = document.getElementById("csv-table");
  if (!table) {
    return;
  }

  try {
    const data = await loadCsv(config.csvFile);
    const [headers, ...rows] = data;
    state.headers = headers;
    state.rows = rows;
    state.rowsPerPage = config.defaultRowsPerPage;
    wireControls();
    applyFiltersSortAndResetPage();
  } catch (_error) {
    renderFallback("Could not load CSV. Check the file path in app.js.");
  }
}

initCsvPreview();
