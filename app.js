const config = {
  csvFiles: {
    non_all_stars: "data/market_value_war_master_1991_2026_non_all_stars.csv",
    all_players: "data/market_value_war_master_1991_2026.csv",
  },
  defaultRowsPerPage: 100,
};

const state = {
  headers: [],
  rows: [],
  filteredRows: [],
  allPlayersHeaders: [],
  allPlayersRows: [],
  currentPage: 1,
  rowsPerPage: config.defaultRowsPerPage,
  datasetScope: "non_all_stars",
  csvFile: config.csvFiles.non_all_stars,
  controlsWired: false,
  selectedColumns: new Set(),
  sortField: "undervalued_score_war",
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
  team: "Team",
  cwar: "cWAR",
  prev_cwar: "Prev cWAR",
  expected_cwar: "Expected cWAR",
  undervalued_score_war: "Undervalued Score (WAR)",
};

const HEADER_DESCRIPTIONS = {
  season: "Season end year (example: 2026 means the 2025-26 season).",
  player: "Player name.",
  player_id: "Stable player identifier from the source dataset.",
  lg: "League code (usually NBA).",
  mp: "Total minutes played by the player in that season.",
  g: "Games played in that season.",
  wins_above_average: "Model-estimated wins above season/league average player contribution.",
  mp_per_game: "Minutes per game (mp / g).",
  prev_wins_above_average:
    "Prior season wins_above_average for the same player (0 if unavailable).",
  prev_mp: "Prior season minutes played for the same player (0 if unavailable).",
  prev_g: "Prior season games played for the same player (0 if unavailable).",
  career_season_num: "Player career season index in the dataset (1 = first season on record).",
  season_idx: "Numeric season offset from the dataset's first season (time feature).",
  expected_wins_above_average:
    "Expected value from the market-value proxy model given usage/history features.",
  value_residual: "wins_above_average - expected_wins_above_average.",
  undervalued_score: "value_residual * sqrt(mp / 1000); boosts strong residuals with meaningful minute load.",
  season_residual_z:
    "Z-score of value_residual within a season (how extreme the residual is that year).",
  is_all_star: "Present in _non_all_stars build; should be False for included rows.",
  team: "Team abbreviation for that season.",
  cwar: "Context-adjusted wins above replacement.",
  prev_cwar: "Prior season cWAR (0 if unavailable).",
  expected_cwar: "Expected cWAR from the WAR market-value model.",
  undervalued_score_war: "WAR-based undervalued score derived from value residual and minutes context.",
};

const INTEGER_COLUMNS = new Set(["season", "g", "mp", "prev_mp", "season_idx", "career_season_num"]);
const HIDDEN_COLUMNS = new Set(["season_idx", "mp", "player_id", "is_all_star", "lg"]);

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
  const visibleHeaders = getVisibleHeaders(headers);
  const visibleIndexes = visibleHeaders.map((header) => headers.indexOf(header));
  const playerIdIndex = headers.indexOf("player_id");
  const totalPages = Math.max(1, Math.ceil(rows.length / state.rowsPerPage));
  if (state.currentPage > totalPages) {
    state.currentPage = totalPages;
  }
  const start = (state.currentPage - 1) * state.rowsPerPage;
  const end = start + state.rowsPerPage;
  const pageRows = rows.slice(start, end);

  thead.innerHTML = `<tr>${visibleHeaders
    .map((name) => {
      const label = formatHeaderLabel(name);
      const description = escapeHtmlAttr(getHeaderDescription(name));
      const isActiveDesc = state.sortField === name && state.sortDirection === "desc";
      const isActiveAsc = state.sortField === name && state.sortDirection === "asc";
      return `
        <th>
          <div class="th-wrap">
            <span title="${description}">${label}</span>
            <span class="th-sort">
              <button
                type="button"
                class="th-sort-btn ${isActiveDesc ? "is-active" : ""}"
                data-sort-header="${name}"
                data-sort-direction="desc"
                aria-label="Sort ${label} high to low"
                title="High to low"
              >↓</button>
              <button
                type="button"
                class="th-sort-btn ${isActiveAsc ? "is-active" : ""}"
                data-sort-header="${name}"
                data-sort-direction="asc"
                aria-label="Sort ${label} low to high"
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
        `<tr>${visibleHeaders
          .map((header, index) => {
            const value = row[visibleIndexes[index]];
            if (header === "player") {
              const playerId = playerIdIndex >= 0 ? row[playerIdIndex] : "";
              return `<td>${formatPlayerCell(value, playerId)}</td>`;
            }
            return `<td>${formatCellValue(value, header)}</td>`;
          })
          .join("")}</tr>`
    )
    .join("");

  source.textContent = `Loaded: ${sourcePath}`;
  stats.innerHTML = [
    `<span class="stat-pill">Filtered rows: ${rows.length}</span>`,
    `<span class="stat-pill">Rows per page: ${state.rowsPerPage}</span>`,
    `<span class="stat-pill">Showing: ${pageRows.length}</span>`,
    `<span class="stat-pill">Page: ${state.currentPage}/${totalPages}</span>`,
    `<span class="stat-pill">Columns: ${visibleHeaders.length}</span>`,
  ].join("");

  renderPagination(totalPages, start + 1, Math.min(end, rows.length), rows.length);
}

function getVisibleHeaders(headers) {
  const baseHeaders = headers.filter((header) => !HIDDEN_COLUMNS.has(header));
  if (!state.selectedColumns.size) {
    return baseHeaders;
  }
  const selected = baseHeaders.filter((header) => state.selectedColumns.has(header));
  return selected.length ? selected : baseHeaders;
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

function getHeaderDescription(header) {
  return HEADER_DESCRIPTIONS[header] || `Definition for ${formatHeaderLabel(header)}.`;
}

function escapeHtmlAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getBasketballReferenceUrl(playerId) {
  const id = String(playerId || "").trim().toLowerCase();
  if (!id || !/^[a-z0-9]+$/.test(id)) {
    return "";
  }
  return `https://www.basketball-reference.com/players/${id[0]}/${id}.html`;
}

function formatPlayerCell(playerName, playerId) {
  const safeName = escapeHtml(playerName || "");
  const url = getBasketballReferenceUrl(playerId);
  if (!url) {
    return safeName;
  }
  return `<a class="player-link" href="${url}" target="_blank" rel="noreferrer">${safeName}</a>`;
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

function firstExistingHeader(candidates) {
  for (const candidate of candidates) {
    if (state.headers.includes(candidate)) {
      return candidate;
    }
  }
  return "";
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
  renderTopValuableBars(rows);
  renderTopUndervaluedBars(rows);
  renderTopOvervaluedBars(rows);
  renderTopLeastValuableBars(rows);
}

function filterRowsForVisualizations(headers, rows) {
  const playerIndex = headers.indexOf("player");
  const seasonIndex = headers.indexOf("season");
  const undervaluedHeader = headers.includes("undervalued_score_war")
    ? "undervalued_score_war"
    : "undervalued_score";
  const undervaluedIndex = headers.indexOf(undervaluedHeader);

  const playerQuery = getControlValue("filter-player").trim().toLowerCase();
  const seasonMin = parseOptionalNumber(getControlValue("filter-season-min"));
  const seasonMax = parseOptionalNumber(getControlValue("filter-season-max"));
  const minUndervalued = parseOptionalNumber(getControlValue("filter-min-undervalued"));

  return rows.filter((row) => {
    if (playerQuery) {
      const player = playerIndex >= 0 ? String(row[playerIndex] || "").toLowerCase() : "";
      if (!player.includes(playerQuery)) {
        return false;
      }
    }

    if (seasonMin !== null) {
      const season = seasonIndex >= 0 ? Number(row[seasonIndex]) : NaN;
      if (!Number.isFinite(season) || season < seasonMin) {
        return false;
      }
    }

    if (seasonMax !== null) {
      const season = seasonIndex >= 0 ? Number(row[seasonIndex]) : NaN;
      if (!Number.isFinite(season) || season > seasonMax) {
        return false;
      }
    }

    if (minUndervalued !== null) {
      const score = undervaluedIndex >= 0 ? Number(row[undervaluedIndex]) : NaN;
      if (!Number.isFinite(score) || score < minUndervalued) {
        return false;
      }
    }

    return true;
  });
}

function renderVisualizationsFromAllPlayers() {
  if (!state.allPlayersRows.length || !state.allPlayersHeaders.length) {
    return;
  }
  const activeHeaders = state.headers;
  const activeRows = state.rows;
  state.headers = state.allPlayersHeaders;
  const vizRows = filterRowsForVisualizations(state.allPlayersHeaders, state.allPlayersRows);
  renderVisualizations(vizRows);
  state.headers = activeHeaders;
  state.rows = activeRows;
}

function renderTopUndervaluedBars(rows) {
  const scoreHeader = firstExistingHeader(["undervalued_score_war", "undervalued_score"]);
  renderRankedBars(rows, {
    containerId: "top-undervalued-bars",
    metricHeader: scoreHeader,
    count: 10,
    mode: "largest",
  });
}

function renderTopValuableBars(rows) {
  const metricHeader = firstExistingHeader(["cwar", "wins_above_average"]);
  renderRankedBars(rows, {
    containerId: "top-valuable-bars",
    metricHeader,
    count: 10,
    mode: "largest",
  });
}

function renderTopOvervaluedBars(rows) {
  renderRankedBars(rows, {
    containerId: "top-overvalued-bars",
    metricHeader: "value_residual",
    count: 10,
    mode: "smallest",
  });
}

function renderTopLeastValuableBars(rows) {
  const metricHeader = firstExistingHeader(["cwar", "wins_above_average"]);
  renderRankedBars(rows, {
    containerId: "top-least-valuable-bars",
    metricHeader,
    count: 10,
    mode: "smallest",
  });
}

function renderRankedBars(rows, options) {
  const container = document.getElementById(options.containerId);
  if (!container || !options.metricHeader) {
    return;
  }
  const playerIndex = indexByName("player");
  const playerIdIndex = indexByName("player_id");
  const seasonIndex = indexByName("season");
  const metricIndex = indexByName(options.metricHeader);

  let chartRows = rows
    .map((row) => ({
      player: textValue(row, playerIndex),
      playerId: textValue(row, playerIdIndex),
      season: numericValue(row, seasonIndex),
      metric: numericValue(row, metricIndex),
    }))
    .filter((row) => row.player && Number.isFinite(row.season) && Number.isFinite(row.metric));

  chartRows = chartRows.sort((a, b) =>
    options.mode === "smallest" ? a.metric - b.metric : b.metric - a.metric
  );
  chartRows = chartRows.slice(0, options.count || 10);

  if (!chartRows.length) {
    container.innerHTML = '<p class="viz-meta">No rows available for this chart.</p>';
    return;
  }

  const widthBase = Math.max(...chartRows.map((row) => Math.abs(row.metric)), 1);
  container.innerHTML = chartRows
    .map((row, index) => {
      const width = (Math.abs(row.metric) / widthBase) * 100;
      const safePlayer = escapeHtml(row.player);
      const playerUrl = getBasketballReferenceUrl(row.playerId);
      const playerLabel = playerUrl
        ? `<a class="player-link" href="${playerUrl}" target="_blank" rel="noreferrer">${safePlayer}</a>`
        : safePlayer;
      return `
        <div class="bar-row">
          <div class="bar-label">${playerLabel} (${Math.round(row.season)})</div>
          <div class="bar-track">
            <div class="bar-fill" style="--target-width: ${width.toFixed(1)}%; --bar-delay: ${
        index * 40
      }ms;"></div>
          </div>
          <div class="bar-value">${row.metric.toFixed(1)}</div>
        </div>
      `;
    })
    .join("");
}

function applyFiltersAndSort() {
  if (!state.rows.length) {
    return;
  }

  const playerQuery = getControlValue("filter-player").trim().toLowerCase();
  const seasonMin = parseOptionalNumber(getControlValue("filter-season-min"));
  const seasonMax = parseOptionalNumber(getControlValue("filter-season-max"));
  const minUndervalued = parseOptionalNumber(getControlValue("filter-min-undervalued"));
  const fallbackSortField = firstExistingHeader([
    "undervalued_score_war",
    "undervalued_score",
    "value_residual",
    "expected_cwar",
    "expected_wins_above_average",
  ]);
  const sortField = getControlValue("sort-field") || state.sortField || fallbackSortField;
  const sortDirection = getControlValue("sort-direction") || state.sortDirection || "desc";
  state.sortField = sortField;
  state.sortDirection = sortDirection;

  const playerIndex = indexByName("player");
  const seasonIndex = indexByName("season");
  const undervaluedHeader = firstExistingHeader(["undervalued_score_war", "undervalued_score"]);
  const undervaluedIndex = indexByName(undervaluedHeader);
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
  renderTable(state.headers, state.filteredRows, state.csvFile);
  renderVisualizationsFromAllPlayers();
}

function applyFiltersSortAndResetPage() {
  state.currentPage = 1;
  applyFiltersAndSort();
}

function changePage(direction) {
  const totalPages = Math.max(1, Math.ceil(state.filteredRows.length / state.rowsPerPage));
  state.currentPage = Math.min(totalPages, Math.max(1, state.currentPage + direction));
  renderTable(state.headers, state.filteredRows, state.csvFile);
}

function jumpToPage(pageValue) {
  const totalPages = Math.max(1, Math.ceil(state.filteredRows.length / state.rowsPerPage));
  const page = Number(pageValue);
  if (!Number.isFinite(page)) {
    return;
  }
  state.currentPage = Math.min(totalPages, Math.max(1, Math.floor(page)));
  renderTable(state.headers, state.filteredRows, state.csvFile);
}

async function loadSelectedDataset() {
  state.csvFile = config.csvFiles[state.datasetScope] || config.csvFiles.non_all_stars;
  const data = await loadCsv(state.csvFile);
  const [headers, ...rows] = data;
  state.headers = headers;
  state.rows = rows;
  state.filteredRows = [];
  state.selectedColumns = new Set(headers.filter((header) => !HIDDEN_COLUMNS.has(header)));
  renderColumnSelector();
}

async function loadAllPlayersDataset() {
  const data = await loadCsv(config.csvFiles.all_players);
  const [headers, ...rows] = data;
  state.allPlayersHeaders = headers;
  state.allPlayersRows = rows;
}

function renderColumnSelector() {
  const container = document.getElementById("column-chooser");
  if (!container) {
    return;
  }
  const baseHeaders = state.headers.filter((header) => !HIDDEN_COLUMNS.has(header));
  container.innerHTML = baseHeaders
    .map((header) => {
      const checked = state.selectedColumns.has(header) ? "checked" : "";
      return `
        <label class="column-option">
          <input type="checkbox" data-column-toggle="${header}" ${checked} />
          <span>${formatHeaderLabel(header)}</span>
        </label>
      `;
    })
    .join("");
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
          element.value = firstExistingHeader([
            "undervalued_score_war",
            "undervalued_score",
            "value_residual",
          ]);
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

  const datasetScope = document.getElementById("dataset-scope");
  if (datasetScope) {
    datasetScope.addEventListener("change", async () => {
      state.datasetScope = datasetScope.value in config.csvFiles ? datasetScope.value : "non_all_stars";
      const sortFieldSelect = document.getElementById("sort-field");
      if (sortFieldSelect) {
        sortFieldSelect.value = "undervalued_score_war";
      }
      const sortDirectionSelect = document.getElementById("sort-direction");
      if (sortDirectionSelect) {
        sortDirectionSelect.value = "desc";
      }
      const rowsPerPageSelect = document.getElementById("rows-per-page");
      if (rowsPerPageSelect) {
        rowsPerPageSelect.value = String(config.defaultRowsPerPage);
      }
      ["filter-player", "filter-season-min", "filter-season-max", "filter-min-undervalued"].forEach(
        (id) => {
          const element = document.getElementById(id);
          if (element) {
            element.value = "";
          }
        }
      );
      state.rowsPerPage = config.defaultRowsPerPage;
      state.currentPage = 1;
      await loadSelectedDataset();
      applyFiltersSortAndResetPage();
    });
  }

  const columnChooser = document.getElementById("column-chooser");
  if (columnChooser) {
    columnChooser.addEventListener("change", (event) => {
      const checkbox = event.target.closest("input[data-column-toggle]");
      if (!checkbox) {
        return;
      }
      const header = checkbox.dataset.columnToggle;
      if (!header) {
        return;
      }
      if (checkbox.checked) {
        state.selectedColumns.add(header);
      } else {
        state.selectedColumns.delete(header);
      }
      renderTable(state.headers, state.filteredRows, state.csvFile);
    });
  }

  const allColumnsButton = document.getElementById("columns-all");
  if (allColumnsButton) {
    allColumnsButton.addEventListener("click", () => {
      state.selectedColumns = new Set(state.headers.filter((header) => !HIDDEN_COLUMNS.has(header)));
      renderColumnSelector();
      renderTable(state.headers, state.filteredRows, state.csvFile);
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
        sortFieldSelect.value =
          button.dataset.sortHeader ||
          firstExistingHeader(["undervalued_score_war", "undervalued_score", "value_residual"]);
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
    await Promise.all([loadSelectedDataset(), loadAllPlayersDataset()]);
    state.rowsPerPage = config.defaultRowsPerPage;
    if (!state.controlsWired) {
      wireControls();
      state.controlsWired = true;
    }
    applyFiltersSortAndResetPage();
  } catch (_error) {
    renderFallback("Could not load CSV. Check the file path in app.js.");
  }
}

initCsvPreview();
