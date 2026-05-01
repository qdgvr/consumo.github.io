(() => {
  const root = document.getElementById("us-map-widget");
  if (!root || !window.d3) return;

  const mapWidth = 1000;
  const mapHeight = 600;
  const css = getComputedStyle(root);
  const palette = ["--palette-1", "--palette-2", "--palette-3", "--palette-4", "--palette-5"]
    .map(v => css.getPropertyValue(v).trim());
  const noDataColor = css.getPropertyValue("--no-data").trim() || "#444";

  const toNumber = (value) => {
    if (value == null) return NaN;
    const cleaned = String(value).trim().replace(",", ".");
    if (!cleaned || cleaned.includes("NULO")) return NaN;
    return +cleaned;
  };

  const outcomes = [
    { field: "GFR", title: "Fecundidad general", label: "Tasa general de fecundidad", suffix: "", digits: 1 },
    { field: "ASFR_15_19", title: "Fecundidad 15-19", label: "Tasa de fecundidad por edad 15-19", suffix: "", digits: 1 },
    { field: "ASFR_20_24", title: "Fecundidad 20-24", label: "Tasa de fecundidad por edad 20-24", suffix: "", digits: 1 },
    { field: "ASFR_25_29", title: "Fecundidad 25-29", label: "Tasa de fecundidad por edad 25-29", suffix: "", digits: 1 },
    { field: "ASFR_30_34", title: "Fecundidad 30-34", label: "Tasa de fecundidad por edad 30-34", suffix: "", digits: 1 },
    { field: "ASFR_35_39", title: "Fecundidad 35-39", label: "Tasa de fecundidad por edad 35-39", suffix: "", digits: 1 },
    { field: "ASFR_40_44", title: "Fecundidad 40-44", label: "Tasa de fecundidad por edad 40-44", suffix: "", digits: 2 },
    { field: "FirstBirthRate", title: "Primeros nacimientos", label: "Tasa de primeros nacimientos", suffix: "", digits: 1 },
    { field: "MeanMaternalAge", title: "Edad media materna", label: "Edad media de la madre", suffix: " años", digits: 2 },
    { field: "BirthShare_15_19", title: "Peso de nacimientos 15-19", label: "Porcentaje de nacimientos 15-19", multiplier: 100, suffix: "%", digits: 1 },
    { field: "BirthShare_20_24", title: "Peso de nacimientos 20-24", label: "Porcentaje de nacimientos 20-24", multiplier: 100, suffix: "%", digits: 1 },
    { field: "BirthShare_25_29", title: "Peso de nacimientos 25-29", label: "Porcentaje de nacimientos 25-29", multiplier: 100, suffix: "%", digits: 1 },
    { field: "BirthShare_30_34", title: "Peso de nacimientos 30-34", label: "Porcentaje de nacimientos 30-34", multiplier: 100, suffix: "%", digits: 1 },
    { field: "BirthShare_35_39", title: "Peso de nacimientos 35-39", label: "Porcentaje de nacimientos 35-39", multiplier: 100, suffix: "%", digits: 1 },
    { field: "BirthShare_40_44", title: "Peso de nacimientos 40-44", label: "Porcentaje de nacimientos 40-44", multiplier: 100, suffix: "%", digits: 2 }
  ];

  const fixedMetrics = {
    x: [{
      field: "DigitalOcio_hours",
      title: "Ocio digital diario",
      label: "Horas diarias de ocio digital",
      trendCopy: "Evolución media anual de las horas diarias de televisión, videojuegos y ordenador recreativo en todos los estados.",
      suffix: " h",
      digits: 2
    }],
    m: [{
      field: "M_minutes",
      title: "Minutos exteriores mediadores",
      label: "Minutos diarios",
      trendCopy: "Evolución media anual de los minutos diarios dedicados a actividades exteriores de trabajo, educación, comida, deporte y socialización básica.",
      suffix: " min",
      digits: 1
    }],
    y: outcomes
  };

  const numericFields = Array.from(new Set([
    "DigitalOcio_hours", "M_minutes", "M_share", ...outcomes.map(d => d.field)
  ]));

  const dataPromise = d3.dsv(";", "research-map-data.csv", d => {
    const row = { STATE: (d.STATE || "").trim(), YEAR: toNumber(d.YEAR) };
    numericFields.forEach(field => { row[field] = toNumber(d[field]); });
    return row;
  });
  const geoPromise = d3.json("us-states.json");

  Promise.all([dataPromise, geoPromise]).then(([data, us]) => {
    const validData = data.filter(d => d.STATE && Number.isFinite(d.YEAR));
    initMetric({ key: "x", metrics: fixedMetrics.x, data: validData, features: us.features });
    initMetric({ key: "m", metrics: fixedMetrics.m, data: validData, features: us.features });
    initMetric({ key: "y", metrics: fixedMetrics.y, data: validData, features: us.features, metricSelect: "metric-select-y" });
  }).catch(err => {
    const target = root.querySelector(".map-shell");
    if (target) target.insertAdjacentHTML("beforeend", `<p class="map-error">Map data could not be loaded.</p>`);
    console.error("Map data loading error:", err);
  });

  function ids(key) {
    return {
      mapTarget: `#map-${key}`,
      searchToggle: `search-toggle-${key}`,
      searchPanel: `search-panel-${key}`,
      searchInput: `search-input-${key}`,
      searchList: `search-list-${key}`,
      yearSelectBtn: `year-select-btn-${key}`,
      yearDropdown: `year-dropdown-${key}`,
      legendTitle: `legend-title-${key}`,
      zoomIn: `zoom-in-${key}`,
      zoomOut: `zoom-out-${key}`,
      legendRow: `legend-steps-row-${key}`,
      stateTitle: `state-title-${key}`,
      stateSubtitle: `state-subtitle-${key}`,
      stateLabel: `state-label-${key}`,
      stateValue: `state-value-${key}`,
      stateRank: `state-rank-${key}`,
      topList: `top-states-list-${key}`,
      bottomList: `bottom-states-list-${key}`,
      viewAllBtn: `view-all-btn-${key}`,
      modal: `all-states-modal-${key}`,
      modalClose: `modal-close-btn-${key}`,
      modalTitle: `modal-title-${key}`,
      tableBody: `all-states-table-body-${key}`,
      trendTarget: `#trend-chart-${key}`,
      trendTitle: `trend-title-${key}`,
      trendCopy: `trend-copy-${key}`
    };
  }

  function initMetric({ key, metrics, data, features, metricSelect }) {
    const id = ids(key);
    let metric = metrics[0];
    let selectedYear = null;
    let sortedData = [];
    let rankByState = new Map();
    let valueByState = new Map();
    let totalStates = 0;
    let color = null;
    let lastSelectedState = null;

    const svg = d3.select(id.mapTarget)
      .append("svg")
      .attr("viewBox", `0 0 ${mapWidth} ${mapHeight}`)
      .style("width", "100%")
      .style("height", "auto");

    const mapGroup = svg.append("g");
    const projection = d3.geoAlbersUsa().translate([mapWidth / 2, mapHeight / 2]).scale(1200);
    const path = d3.geoPath(projection);
    const tooltip = d3.select("body").append("div").attr("class", "us-map-tooltip");

    const stateTitleEl = document.getElementById(id.stateTitle);
    const stateSubtitleEl = document.getElementById(id.stateSubtitle);
    const stateLabelEl = document.getElementById(id.stateLabel);
    const stateValueEl = document.getElementById(id.stateValue);
    const stateRankEl = document.getElementById(id.stateRank);
    const searchToggleBtn = document.getElementById(id.searchToggle);
    const searchPanelEl = document.getElementById(id.searchPanel);
    const searchInputEl = document.getElementById(id.searchInput);
    const searchListSel = d3.select("#" + id.searchList);
    const yearSelectBtnEl = document.getElementById(id.yearSelectBtn);
    const yearDropdownEl = document.getElementById(id.yearDropdown);
    const legendTitleEl = document.getElementById(id.legendTitle);
    const topListSel = d3.select("#" + id.topList);
    const bottomListSel = d3.select("#" + id.bottomList);
    const viewAllBtnEl = document.getElementById(id.viewAllBtn);
    const modalEl = document.getElementById(id.modal);
    const modalCloseBtn = document.getElementById(id.modalClose);
    const modalTitleEl = document.getElementById(id.modalTitle);
    const allStatesTbody = d3.select("#" + id.tableBody);
    const trendTitleEl = document.getElementById(id.trendTitle);
    const trendCopyEl = document.getElementById(id.trendCopy);
    const metricSelectEl = metricSelect ? document.getElementById(metricSelect) : null;

    if (metricSelectEl) {
      metricSelectEl.innerHTML = "";
      metrics.forEach((m, i) => {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = m.title;
        metricSelectEl.appendChild(opt);
      });
      metricSelectEl.addEventListener("change", () => {
        metric = metrics[+metricSelectEl.value] || metrics[0];
        selectedYear = null;
        lastSelectedState = null;
        fullRefresh();
      });
    }

    const zoomBehavior = d3.zoom()
      .scaleExtent([1, 8])
      .translateExtent([[0, 0], [mapWidth, mapHeight]])
      .on("zoom", (event) => mapGroup.attr("transform", event.transform));
    svg.call(zoomBehavior);
    document.getElementById(id.zoomIn).addEventListener("click", () => svg.transition().duration(200).call(zoomBehavior.scaleBy, 1.2));
    document.getElementById(id.zoomOut).addEventListener("click", () => svg.transition().duration(200).call(zoomBehavior.scaleBy, 0.8));

    mapGroup.selectAll("path")
      .data(features)
      .join("path")
      .attr("class", "state")
      .attr("d", path)
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.6)
      .on("mouseover", function(event, d) {
        const stateName = d.properties.NAME;
        const v = valueByState.get(stateName);
        const rank = rankByState.get(stateName);
        d3.select(this).attr("stroke-width", 1.4);
        tooltip.style("opacity", 1).html(
          v == null || Number.isNaN(v)
            ? `<strong>${stateName}</strong><br>Sin datos del año`
            : `<strong>${stateName}</strong><br>Año ${selectedYear} ${metric.title}: ${formatValue(v, metric)}<br>Rank: ${rank} / ${totalStates}`
        );
      })
      .on("mousemove", event => tooltip.style("left", (event.pageX + 12) + "px").style("top", (event.pageY - 32) + "px"))
      .on("mouseout", function() {
        d3.select(this).attr("stroke-width", d => (lastSelectedState && d.properties.NAME === lastSelectedState) ? 2 : 0.6);
        tooltip.style("opacity", 0);
      })
      .on("click", (event, d) => selectStateByName(d.properties.NAME));

    searchToggleBtn.addEventListener("click", () => {
      const open = !searchPanelEl.classList.contains("open");
      searchPanelEl.classList.toggle("open", open);
      if (open) searchInputEl.focus();
    });

    const stateNames = Array.from(new Set(features.map(d => d.properties.NAME).filter(Boolean))).sort((a, b) => d3.ascending(a, b));
    searchInputEl.addEventListener("keydown", e => {
      if (e.key !== "Enter") return;
      const match = stateNames.find(name => name.toLowerCase() === e.target.value.trim().toLowerCase());
      if (match) selectStateByName(match);
    });
    searchListSel.selectAll("button").data(stateNames).join("button").text(d => d).on("click", (event, d) => selectStateByName(d));

    yearSelectBtnEl.addEventListener("click", () => yearDropdownEl.classList.toggle("open"));
    document.addEventListener("click", e => {
      if (!yearDropdownEl.contains(e.target) && e.target !== yearSelectBtnEl) yearDropdownEl.classList.remove("open");
    });

    viewAllBtnEl.addEventListener("click", () => {
      allStatesTbody.selectAll("tr")
        .data(sortedData)
        .join("tr")
        .each(function(d) {
          const tr = d3.select(this);
          tr.selectAll("*").remove();
          tr.append("td").append("button").attr("class", "modal-state-button").text(d.STATE).on("click", () => {
            selectStateByName(d.STATE);
            modalEl.classList.remove("open");
          });
          tr.append("td").attr("class", "td-right").text(rankByState.get(d.STATE));
          tr.append("td").attr("class", "td-right").text(formatValue(d._value, metric));
        });
      modalEl.classList.add("open");
    });
    modalCloseBtn.addEventListener("click", () => modalEl.classList.remove("open"));
    modalEl.addEventListener("click", e => { if (e.target === modalEl) modalEl.classList.remove("open"); });

    fullRefresh();

    function multiplier(m) { return m.multiplier == null ? 1 : m.multiplier; }

    function metricValue(row, m) { return row[m.field] * multiplier(m); }

    function availableYears() {
      return Array.from(new Set(
        data.filter(d => Number.isFinite(d[metric.field])).map(d => d.YEAR)
      )).sort((a, b) => b - a);
    }

    function prepareYearData(year) {
      const yearData = data
        .filter(d => d.YEAR === year && Number.isFinite(d[metric.field]))
        .map(d => ({ ...d, _value: metricValue(d, metric) }));
      sortedData = yearData.slice().sort((a, b) => b._value - a._value);
      totalStates = sortedData.length;
      rankByState = new Map();
      valueByState = new Map(sortedData.map(d => [d.STATE, d._value]));
      sortedData.forEach((d, i) => {
        rankByState.set(d.STATE, i + 1);
        d.rank = i + 1;
      });
      const values = Array.from(valueByState.values()).filter(Number.isFinite);
      const minVal = d3.min(values);
      const maxVal = d3.max(values);
      const domainMin = minVal == null ? 0 : minVal;
      const domainMax = maxVal == null ? domainMin + 1 : (maxVal === domainMin ? domainMin + 1 : maxVal);
      color = d3.scaleQuantize().domain([domainMin, domainMax]).range(palette);
    }

    function fullRefresh() {
      const years = availableYears();
      if (!selectedYear || !years.includes(selectedYear)) selectedYear = years[0] || 2024;
      renderYearDropdown(years);
      updateYear(selectedYear);
      drawTrendChart(id.trendTarget, trendData(), metric);
    }

    function updateYear(year) {
      selectedYear = year;
      yearSelectBtnEl.textContent = `${year} ▼`;
      prepareYearData(year);
      legendTitleEl.textContent = `Año ${year} · ${metric.title}`;
      stateLabelEl.textContent = metric.label;
      modalTitleEl.textContent = `${metric.title} por estado`;
      trendTitleEl.textContent = `Tendencia de ${metric.title.toLowerCase()} (Estados Unidos)`;
      trendCopyEl.textContent = metric.trendCopy || `Evolución media anual de ${metric.title.toLowerCase()} en todos los estados.`;
      renderLegend(id.legendRow, color, metric);
      refreshMapColors();
      updateRankLists();
      if (lastSelectedState) updateStateCard(lastSelectedState);
      else resetStateCard();
    }

    function renderYearDropdown(years) {
      yearDropdownEl.innerHTML = "";
      years.forEach(year => {
        const btn = document.createElement("button");
        btn.textContent = year;
        btn.addEventListener("click", () => {
          yearDropdownEl.classList.remove("open");
          updateYear(year);
        });
        yearDropdownEl.appendChild(btn);
      });
    }

    function refreshMapColors() {
      mapGroup.selectAll("path.state")
        .attr("fill", d => {
          const v = valueByState.get(d.properties.NAME);
          return (v == null || Number.isNaN(v)) ? noDataColor : color(v);
        })
        .attr("stroke-width", d => (lastSelectedState && d.properties.NAME === lastSelectedState) ? 2 : 0.6)
        .attr("stroke", d => (lastSelectedState && d.properties.NAME === lastSelectedState) ? "#1b2a3c" : "#ffffff");
    }

    function updateStateCard(stateName) {
      const value = valueByState.get(stateName);
      const rank = rankByState.get(stateName);
      stateTitleEl.textContent = stateName;
      if (value == null || Number.isNaN(value)) {
        stateSubtitleEl.textContent = `No hay datos del año ${selectedYear} para el estado seleccionado.`;
        stateValueEl.textContent = "-";
        stateRankEl.textContent = "-";
      } else {
        stateSubtitleEl.textContent = `Muestra ${metric.title} en ${selectedYear} y su posición dentro del conjunto de estados.`;
        stateValueEl.textContent = formatValue(value, metric);
        stateRankEl.textContent = rank + " / " + totalStates;
      }
    }

    function resetStateCard() {
      stateTitleEl.textContent = "United States";
      stateSubtitleEl.textContent = "Cuando seleccione un estado en el mapa de la izquierda o lo busque, el valor aparecerá en este recuadro.";
      stateValueEl.textContent = "-";
      stateRankEl.textContent = "-";
    }

    function selectStateByName(stateName) {
      if (!stateName) return;
      const cleanName = stateName.trim();
      if (!cleanName) return;
      updateStateCard(cleanName);
      mapGroup.selectAll("path.state")
        .attr("stroke-width", d => d.properties.NAME === cleanName ? 2 : 0.6)
        .attr("stroke", d => d.properties.NAME === cleanName ? "#1b2a3c" : "#ffffff");
      lastSelectedState = cleanName;
    }

    function updateRankLists() {
      renderRanking(topListSel, sortedData.slice(0, 5), rankByState, selectStateByName, metric);
      renderRanking(bottomListSel, sortedData.slice(-5), rankByState, selectStateByName, metric);
    }

    function trendData() {
      return d3.rollups(
        data.filter(d => Number.isFinite(d[metric.field])),
        v => d3.mean(v, d => metricValue(d, metric)),
        d => d.YEAR
      ).map(([year, value]) => ({ year: +year, value })).sort((a, b) => a.year - b.year);
    }
  }

  function formatValue(value, metric) {
    if (!Number.isFinite(value)) return "-";
    const digits = metric.digits == null ? 1 : metric.digits;
    const suffix = metric.suffix || "";
    const spacer = suffix && !suffix.startsWith("%") ? "" : "";
    return value.toFixed(digits) + spacer + suffix;
  }

  function renderLegend(rowId, colorScale, metric) {
    const thresholds = colorScale.thresholds();
    const domain = colorScale.domain();
    const steps = [];
    let prev = domain[0];
    thresholds.forEach(t => {
      steps.push([prev, t]);
      prev = t;
    });
    steps.push([prev, domain[1]]);
    const row = d3.select("#" + rowId);
    const stepSel = row.selectAll(".legend-step").data(steps.concat([["No Data", "No Data"]]));
    const enter = stepSel.enter().append("div").attr("class", "legend-step");
    enter.append("div").attr("class", "legend-chip");
    enter.append("div").attr("class", "legend-label");
    enter.merge(stepSel).each(function(d) {
      const chip = d3.select(this).select(".legend-chip");
      const label = d3.select(this).select(".legend-label");
      if (d[0] === "No Data") {
        chip.style("background", noDataColor);
        label.text("No Data");
      } else {
        chip.style("background", colorScale((d[0] + d[1]) / 2));
        label.text(`${formatValue(d[0], metric)} - ${formatValue(d[1], metric)}`);
      }
    });
    stepSel.exit().remove();
  }

  function renderRanking(listSel, arr, rankMap, onSelect, metric) {
    const items = listSel.selectAll("li").data(arr).join("li");
    items.selectAll("*").remove();
    items.each(function(d) {
      const li = d3.select(this);
      li.append("button").text(d.STATE).on("click", () => onSelect(d.STATE));
      li.append("span").attr("class", "ranking-rank").text(() => rankMap.get(d.STATE));
      li.append("span").attr("class", "ranking-value").text(() => formatValue(d._value, metric));
    });
  }

  function drawTrendChart(targetSelector, trendData, metric) {
    const container = d3.select(targetSelector);
    container.selectAll("*").remove();
    const margin = { top: 20, right: 24, bottom: 40, left: 64 };
    const width = 960;
    const height = 320;
    const svg = container.append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("width", "100%")
      .style("height", "auto");

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const filtered = trendData.filter(d => Number.isFinite(d.value));
    const years = filtered.map(d => d.year);
    const x = d3.scalePoint().domain(years).range([0, innerWidth]).padding(0.5);
    const minVal = d3.min(filtered, d => d.value);
    const maxVal = d3.max(filtered, d => d.value);
    const span = maxVal - minVal || 1;
    const y = d3.scaleLinear().domain([minVal - span * 0.08, maxVal + span * 0.1]).nice().range([innerHeight, 0]);

    const xAxis = d3.axisBottom(x).tickValues(years).tickFormat(d3.format("d"));
    const yAxis = d3.axisLeft(y).ticks(6).tickFormat(d => formatValue(d, metric));

    g.append("g")
      .attr("stroke", "#2a2a2a")
      .call(grid => grid.selectAll("line").data(y.ticks(6)).join("line").attr("x1", 0).attr("x2", innerWidth).attr("y1", d => y(d)).attr("y2", d => y(d)));

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .call(axis => axis.selectAll("text").attr("font-size", 11).attr("fill", "#cfcfcf"))
      .call(axis => axis.selectAll("path,line").attr("stroke", "#3a3a3a"));

    g.append("g")
      .call(yAxis)
      .call(axis => axis.selectAll("text").attr("font-size", 11).attr("fill", "#cfcfcf"))
      .call(axis => axis.selectAll("path,line").attr("stroke", "#3a3a3a"));

    const lineGen = d3.line().x(d => x(d.year)).y(d => y(d.value)).curve(d3.curveMonotoneX);
    g.append("path").datum(filtered).attr("fill", "none").attr("stroke", "#30c0c0").attr("stroke-width", 3).attr("d", lineGen);

    const tip = d3.select("body").append("div").attr("class", "us-trend-tooltip");
    g.selectAll(".trend-dot")
      .data(filtered)
      .join("circle")
      .attr("class", "trend-dot")
      .attr("r", 4)
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d.value))
      .attr("fill", "#30c0c0")
      .attr("stroke", "#0f0f0f")
      .attr("stroke-width", 1)
      .on("mouseover", (event, d) => tip.style("opacity", 1).html(`<strong>${d.year}</strong><br>${formatValue(d.value, metric)}`))
      .on("mousemove", event => tip.style("left", (event.pageX + 12) + "px").style("top", (event.pageY - 28) + "px"))
      .on("mouseout", () => tip.style("opacity", 0));
  }
})();
