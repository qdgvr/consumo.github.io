(() => {
  const mapWidth = 1000;
  const mapHeight = 600;
  const root = document.getElementById("us-map-widget");
  if (!root || !window.d3) return;

  const css = getComputedStyle(root);
  const palette = [
    css.getPropertyValue("--palette-1").trim(),
    css.getPropertyValue("--palette-2").trim(),
    css.getPropertyValue("--palette-3").trim(),
    css.getPropertyValue("--palette-4").trim(),
    css.getPropertyValue("--palette-5").trim()
  ];
  const noDataColor = css.getPropertyValue("--no-data").trim() || "#444";

  const toNumber = (value) => {
    if (value == null) return NaN;
    const cleaned = String(value).trim().replace(",", ".");
    if (!cleaned || cleaned.includes("NULO")) return NaN;
    return +cleaned;
  };

  const dataPromise = d3.dsv(";", "data.csv", d => ({
    YEAR: toNumber(d.YEAR),
    STATE: (d.STATE || "").trim(),
    GRPIP_mean: toNumber(d.GRPIP_mean),
    Prevalence_FrequentMentalDistress: toNumber(d.Prevalence_FrequentMentalDistress),
    Promedio_POORHLTH: toNumber(d.Promedio_POORHLTH)
  }));

  const geoPromise = d3.json("us-states.json");

  Promise.all([dataPromise, geoPromise]).then(([data, us]) => {
    const validData = data.filter(d => d.STATE && !Number.isNaN(d.YEAR));
    initMetric({
      title: "GRPIP_mean",
      valueField: "GRPIP_mean",
      data: validData,
      features: us.features,
      mapTarget: "#map-grpip",
      searchToggle: "search-toggle-grpip",
      searchPanel: "search-panel-grpip",
      searchInput: "search-input-grpip",
      searchList: "search-list-grpip",
      yearSelectBtn: "year-select-btn-grpip",
      yearDropdown: "year-dropdown-grpip",
      legendTitleId: "legend-title-grpip",
      zoomIn: "zoom-in-grpip",
      zoomOut: "zoom-out-grpip",
      legendRow: "legend-steps-row-grpip",
      stateTitle: "state-title-grpip",
      stateSubtitle: "state-subtitle-grpip",
      stateValue: "state-value-grpip",
      stateRank: "state-rank-grpip",
      topList: "top-states-list-grpip",
      bottomList: "bottom-states-list-grpip",
      viewAllBtn: "view-all-btn",
      modal: "all-states-modal",
      modalClose: "modal-close-btn",
      tableBody: "all-states-table-body",
      trendTarget: "#trend-chart"
    });

    initMetric({
      title: "Prevalence_FrequentMentalDistress",
      valueField: "Prevalence_FrequentMentalDistress",
      data: validData,
      features: us.features,
      mapTarget: "#map-fmd",
      searchToggle: "search-toggle-fmd",
      searchPanel: "search-panel-fmd",
      searchInput: "search-input-fmd",
      searchList: "search-list-fmd",
      yearSelectBtn: "year-select-btn-fmd",
      yearDropdown: "year-dropdown-fmd",
      legendTitleId: "legend-title-fmd",
      zoomIn: "zoom-in-fmd",
      zoomOut: "zoom-out-fmd",
      legendRow: "legend-steps-row-fmd",
      stateTitle: "state-title-fmd",
      stateSubtitle: "state-subtitle-fmd",
      stateValue: "state-value-fmd",
      stateRank: "state-rank-fmd",
      topList: "top-states-list-fmd",
      bottomList: "bottom-states-list-fmd",
      viewAllBtn: "view-all-btn-fmd",
      modal: "all-states-modal-fmd",
      modalClose: "modal-close-btn-fmd",
      tableBody: "all-states-table-body-fmd",
      trendTarget: "#trend-chart-fmd",
      multiplier: 100
    });

    initMetric({
      title: "Promedio_POORHLTH",
      valueField: "Promedio_POORHLTH",
      data: validData,
      features: us.features,
      mapTarget: "#map-poorhlth",
      searchToggle: "search-toggle-poorhlth",
      searchPanel: "search-panel-poorhlth",
      searchInput: "search-input-poorhlth",
      searchList: "search-list-poorhlth",
      yearSelectBtn: "year-select-btn-poorhlth",
      yearDropdown: "year-dropdown-poorhlth",
      legendTitleId: "legend-title-poorhlth",
      zoomIn: "zoom-in-poorhlth",
      zoomOut: "zoom-out-poorhlth",
      legendRow: "legend-steps-row-poorhlth",
      stateTitle: "state-title-poorhlth",
      stateSubtitle: "state-subtitle-poorhlth",
      stateValue: "state-value-poorhlth",
      stateRank: "state-rank-poorhlth",
      topList: "top-states-list-poorhlth",
      bottomList: "bottom-states-list-poorhlth",
      viewAllBtn: "view-all-btn-poorhlth",
      modal: "all-states-modal-poorhlth",
      modalClose: "modal-close-btn-poorhlth",
      tableBody: "all-states-table-body-poorhlth",
      trendTarget: "#trend-chart-poorhlth"
    });
  }).catch(err => {
    const target = root.querySelector(".map-shell");
    if (target) target.insertAdjacentHTML("beforeend", `<p class="map-error">Map data could not be loaded.</p>`);
    console.error("Map data loading error:", err);
  });

  function initMetric(opts) {
    const {
      title,
      valueField,
      data,
      features,
      mapTarget,
      searchToggle,
      searchPanel,
      searchInput,
      searchList,
      yearSelectBtn,
      yearDropdown,
      legendTitleId,
      zoomIn,
      zoomOut,
      legendRow,
      stateTitle,
      stateSubtitle,
      stateValue,
      stateRank,
      topList,
      bottomList,
      viewAllBtn,
      modal,
      modalClose,
      tableBody,
      trendTarget,
      multiplier = 1
    } = opts;

    const svg = d3.select(mapTarget)
      .append("svg")
      .attr("viewBox", `0 0 ${mapWidth} ${mapHeight}`)
      .style("width", "100%")
      .style("height", "auto");

    const mapGroup = svg.append("g");
    const projection = d3.geoAlbersUsa()
      .translate([mapWidth / 2, mapHeight / 2])
      .scale(1200);
    const path = d3.geoPath(projection);
    const tooltip = d3.select("body").append("div").attr("class", "us-map-tooltip");

    const stateTitleEl = document.getElementById(stateTitle);
    const stateSubtitleEl = document.getElementById(stateSubtitle);
    const stateValueEl = document.getElementById(stateValue);
    const stateRankEl = document.getElementById(stateRank);
    const searchToggleBtn = document.getElementById(searchToggle);
    const searchPanelEl = document.getElementById(searchPanel);
    const searchInputEl = document.getElementById(searchInput);
    const searchListSel = d3.select("#" + searchList);
    const yearSelectBtnEl = document.getElementById(yearSelectBtn);
    const yearDropdownEl = document.getElementById(yearDropdown);
    const legendTitleEl = document.getElementById(legendTitleId);
    const topListSel = d3.select("#" + topList);
    const bottomListSel = d3.select("#" + bottomList);
    const viewAllBtnEl = document.getElementById(viewAllBtn);
    const modalEl = document.getElementById(modal);
    const modalCloseBtn = document.getElementById(modalClose);
    const allStatesTbody = d3.select("#" + tableBody);

    let rankByState = new Map();
    let valueByState = new Map();
    let totalStates = 0;
    let lastSelectedState = null;
    let sortedData = [];
    let color = null;
    let currentTransform = d3.zoomIdentity;

    const availableYears = Array.from(
      new Set(data.filter(d => !Number.isNaN(d[valueField])).map(d => d.YEAR))
    ).sort((a, b) => b - a);
    let selectedYear = availableYears[0] || 2023;

    function prepareYearData(year) {
      const yearData = data
        .filter(d => d.YEAR === year && !Number.isNaN(d[valueField]))
        .map(d => ({ ...d, _value: d[valueField] * multiplier }));

      sortedData = yearData.slice().sort((a, b) => b._value - a._value);
      totalStates = sortedData.length;
      rankByState = new Map();
      valueByState = new Map(sortedData.map(d => [d.STATE, d._value]));
      sortedData.forEach((d, i) => {
        rankByState.set(d.STATE, i + 1);
        d.rank = i + 1;
      });

      const values = Array.from(valueByState.values()).filter(v => !Number.isNaN(v));
      const minVal = d3.min(values);
      const maxVal = d3.max(values);
      const domainMin = minVal == null ? 0 : minVal;
      const domainMax = maxVal == null ? domainMin + 1 : (maxVal === domainMin ? domainMin + 1 : maxVal);
      color = d3.scaleQuantize().domain([domainMin, domainMax]).range(palette);
    }

    const zoomBehavior = d3.zoom()
      .scaleExtent([1, 8])
      .translateExtent([[0, 0], [mapWidth, mapHeight]])
      .on("zoom", (event) => {
        mapGroup.attr("transform", event.transform);
        currentTransform = event.transform;
      });

    svg.call(zoomBehavior);

    document.getElementById(zoomIn).addEventListener("click", () => {
      svg.transition().duration(200).call(zoomBehavior.scaleBy, 1.2);
    });
    document.getElementById(zoomOut).addEventListener("click", () => {
      svg.transition().duration(200).call(zoomBehavior.scaleBy, 0.8);
    });

    function updateStateCard(stateName) {
      const value = valueByState.get(stateName);
      const rank = rankByState.get(stateName);
      stateTitleEl.textContent = stateName;
      if (value == null || Number.isNaN(value)) {
        stateSubtitleEl.textContent = `No hay datos del año ${selectedYear} para el estado seleccionado.`;
        stateValueEl.textContent = "-";
        stateRankEl.textContent = "-";
      } else {
        stateSubtitleEl.textContent = `Muestra el ${title} del año ${selectedYear} y su posición dentro del conjunto de estados.`;
        stateValueEl.textContent = value.toFixed(1) + " %";
        stateRankEl.textContent = rank + " / " + totalStates;
      }
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

    function refreshMapColors() {
      mapGroup.selectAll("path.state")
        .attr("fill", d => {
          const v = valueByState.get(d.properties.NAME);
          return (v == null || Number.isNaN(v)) ? noDataColor : color(v);
        })
        .attr("stroke-width", d => (lastSelectedState && d.properties.NAME === lastSelectedState) ? 2 : 0.6)
        .attr("stroke", d => (lastSelectedState && d.properties.NAME === lastSelectedState) ? "#1b2a3c" : "#ffffff");
    }

    function renderLegend(rowId, colorScale) {
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
          label.text(`${d[0].toFixed(1)} - ${d[1].toFixed(1)}%`);
        }
      });
      stepSel.exit().remove();
    }

    function renderRanking(listSel, arr, rankMap, onSelect) {
      const items = listSel.selectAll("li").data(arr).join("li");
      items.selectAll("*").remove();
      items.each(function(d) {
        const li = d3.select(this);
        li.append("button").text(d.STATE).on("click", () => onSelect(d.STATE));
        li.append("span").attr("class", "ranking-rank").text(() => rankMap.get(d.STATE));
        li.append("span").attr("class", "ranking-value").text(() => d._value.toFixed(1) + " %");
      });
    }

    function updateRankLists() {
      renderRanking(topListSel, sortedData.slice(0, 5), rankByState, selectStateByName);
      renderRanking(bottomListSel, sortedData.slice(-5), rankByState, selectStateByName);
    }

    function updateYear(year) {
      selectedYear = year;
      yearSelectBtnEl.textContent = `${year} ▼`;
      legendTitleEl.textContent = `Año ${year} ${title}`;
      prepareYearData(year);
      renderLegend(legendRow, color);
      refreshMapColors();
      updateRankLists();
      if (lastSelectedState) {
        updateStateCard(lastSelectedState);
      } else {
        stateTitleEl.textContent = "United States";
        stateSubtitleEl.textContent = `Cuando seleccione un estado en el mapa de la izquierda o lo busque, el valor aparecerá en este recuadro.`;
        stateValueEl.textContent = "-";
        stateRankEl.textContent = "-";
      }
    }

    function renderYearDropdown() {
      yearDropdownEl.innerHTML = "";
      availableYears.forEach(year => {
        const btn = document.createElement("button");
        btn.textContent = year;
        btn.addEventListener("click", () => {
          yearDropdownEl.classList.remove("open");
          updateYear(year);
        });
        yearDropdownEl.appendChild(btn);
      });
    }

    prepareYearData(selectedYear);

    mapGroup.selectAll("path")
      .data(features)
      .join("path")
      .attr("class", "state")
      .attr("d", path)
      .attr("fill", d => {
        const v = valueByState.get(d.properties.NAME);
        return (v == null || Number.isNaN(v)) ? noDataColor : color(v);
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.6)
      .on("mouseover", function(event, d) {
        const stateName = d.properties.NAME;
        const v = valueByState.get(stateName);
        const rank = rankByState.get(stateName);
        d3.select(this).attr("stroke-width", 1.4);
        if (v == null || Number.isNaN(v)) {
          tooltip.style("opacity", 1).html(`<strong>${stateName}</strong><br>Sin datos del año`);
        } else {
          tooltip
            .style("opacity", 1)
            .html(`<strong>${stateName}</strong><br>Año ${selectedYear} ${title}: ${v.toFixed(1)} %<br>Rank: ${rank} / ${totalStates}`);
        }
      })
      .on("mousemove", function(event) {
        tooltip.style("left", (event.pageX + 12) + "px").style("top", (event.pageY - 32) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).attr("stroke-width", d => (lastSelectedState && d.properties.NAME === lastSelectedState) ? 2 : 0.6);
        tooltip.style("opacity", 0);
      })
      .on("click", function(event, d) {
        selectStateByName(d.properties.NAME);
      });

    searchToggleBtn.addEventListener("click", () => {
      const open = !searchPanelEl.classList.contains("open");
      searchPanelEl.classList.toggle("open", open);
      if (open) searchInputEl.focus();
    });

    const stateNames = Array.from(new Set(data.map(d => d.STATE).filter(Boolean))).sort((a, b) => d3.ascending(a, b));
    searchInputEl.addEventListener("keydown", e => {
      if (e.key !== "Enter") return;
      const typed = e.target.value;
      if (!typed) return;
      const match = stateNames.find(name => name.toLowerCase() === typed.trim().toLowerCase());
      if (match) selectStateByName(match);
    });
    searchListSel.selectAll("button")
      .data(stateNames)
      .join("button")
      .text(d => d)
      .on("click", (event, d) => selectStateByName(d));

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
          tr.append("td").attr("class", "td-right").text(d._value.toFixed(1) + " %");
        });
      modalEl.classList.add("open");
    });
    modalCloseBtn.addEventListener("click", () => modalEl.classList.remove("open"));
    modalEl.addEventListener("click", e => { if (e.target === modalEl) modalEl.classList.remove("open"); });

    renderYearDropdown();
    updateYear(selectedYear);

    const byYear = d3.rollups(
      data.filter(d => !Number.isNaN(d[valueField])),
      v => d3.mean(v, d => d[valueField] * multiplier),
      d => d.YEAR
    );
    const trendData = byYear.map(([year, value]) => ({ year: +year, value })).sort((a, b) => a.year - b.year);
    drawTrendChart(trendTarget, trendData, title);
  }

  function drawTrendChart(targetSelector, trendData, title) {
    const margin = { top: 20, right: 24, bottom: 40, left: 56 };
    const width = 960;
    const height = 320;
    const svg = d3.select(targetSelector)
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("width", "100%")
      .style("height", "auto");

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const filtered = trendData.filter(d => d.year !== 2020 && !Number.isNaN(d.value));
    const years = filtered.map(d => d.year);
    const x = d3.scalePoint().domain(years).range([0, innerWidth]).padding(0.5);
    const yMin = title === "GRPIP_mean" ? 30 : 0;
    const yMax = d3.max(filtered, d => d.value) || yMin + 1;
    const y = d3.scaleLinear().domain([yMin, yMax * 1.1]).nice().range([innerHeight, 0]);

    const xAxis = d3.axisBottom(x).tickValues(years).tickFormat(d3.format("d"));
    const yAxis = d3.axisLeft(y).ticks(6).tickFormat(d => d.toFixed(1) + " %");

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

    const lineGen = d3.line()
      .x(d => x(d.year))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(filtered)
      .attr("class", "trend-line")
      .attr("fill", "none")
      .attr("stroke", "#30c0c0")
      .attr("stroke-width", 3)
      .attr("d", lineGen);

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
      .on("mouseover", function(event, d) {
        tip.style("opacity", 1).html(`<strong>${d.year}</strong><br>${d.value.toFixed(1)} %`);
      })
      .on("mousemove", function(event) {
        tip.style("left", (event.pageX + 12) + "px").style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        tip.style("opacity", 0);
      });
  }
})();
