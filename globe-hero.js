(() => {
  const root = document.getElementById('globe-hero');
  const svgNode = document.getElementById('globe-map');
  if (!root || !svgNode || !window.d3) return;

  function forceTop() {
    if (!window.location.hash && window.scrollY > 2) window.scrollTo(0, 0);
  }
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  forceTop();
  window.addEventListener('pageshow', forceTop);
  window.addEventListener('load', () => setTimeout(forceTop, 0));

  const svg = d3.select(svgNode);
  const stage = root.querySelector('.globe-stage') || root;
  const chapters = [...root.querySelectorAll('.globe-chapter')];
  const ui = {
    title: document.getElementById('globe-stage-title'),
    kicker: document.getElementById('globe-stage-kicker'),
    summary: document.getElementById('globe-stage-summary'),
    statline: document.getElementById('globe-statline'),
    tooltip: document.getElementById('globe-tooltip')
  };

  const COUNTRY_NAME = {
    AUT: 'Austria', BEL: 'Belgium', BGR: 'Bulgaria', HRV: 'Croatia', CYP: 'Cyprus', CZE: 'Czech Republic', DNK: 'Denmark', EST: 'Estonia', FIN: 'Finland', FRA: 'France', DEU: 'Germany', GRC: 'Greece', HUN: 'Hungary', IRL: 'Ireland', ITA: 'Italy', LVA: 'Latvia', LTU: 'Lithuania', LUX: 'Luxembourg', MLT: 'Malta', NLD: 'Netherlands', POL: 'Poland', PRT: 'Portugal', ROU: 'Romania', SVK: 'Slovakia', SVN: 'Slovenia', ESP: 'Spain', SWE: 'Sweden', CHE: 'Switzerland', NOR: 'Norway', ISL: 'Iceland', KOR: 'South Korea', CHN: 'China', JPN: 'Japan'
  };

  const REGIONS = {
    europe: {
      title: 'Europa',
      kicker: 'TFR · hijos por mujer',
      summary: 'Unión Europea, Suiza y países nórdicos incluidos.',
      colorA: '#2f6df6',
      colorB: '#ffd26a'
    },
    east_asia: {
      title: 'Asia oriental',
      kicker: 'TFR · hijos por mujer',
      summary: 'Corea del Sur, China y Japón en la zona de fecundidad más baja del recorrido.',
      colorA: '#37d8ff',
      colorB: '#ff5f8f'
    },
    united_states: {
      title: 'Estados Unidos',
      kicker: 'TFR estatal estimada · hijos por mujer',
      summary: 'Cada punto representa un estado o Washington D. C., calculado desde las tasas específicas por edad del panel.',
      colorA: '#5c7cff',
      colorB: '#a5df92'
    },
    title: {
      title: 'Del mapa al reportaje',
      kicker: 'Reportaje de datos',
      summary: 'El mapa deja paso al texto: ocio digital, tiempo fuera de casa y maternidad aplazada.',
      colorA: '#30c0c0',
      colorB: '#ffffff'
    }
  };

  const state = {
    activeRegion: 'europe',
    points: [],
    world: null,
    usStates: null,
    selectedFeatures: [],
    selectedFeatureNames: new Set(),
    globalMin: 0.7,
    globalMax: 2.1,
    width: 1000,
    height: 700
  };

  const g = {
    context: svg.append('g').attr('class', 'map-context'),
    selected: svg.append('g').attr('class', 'map-selected'),
    points: svg.append('g').attr('class', 'map-points')
  };

  const projection = d3.geoMercator();
  const path = d3.geoPath(projection);

  function regionRows(region) {
    if (region === 'title') return state.points;
    return state.points.filter(d => d.region === region);
  }

  function featureName(feature) {
    return feature.properties.name || feature.properties.NAME;
  }

  function featuresForRegion(region) {
    const rows = regionRows(region);
    if (region === 'united_states') {
      const names = new Set(rows.map(d => d.name));
      return state.usStates.features.filter(feature => names.has(feature.properties.NAME));
    }
    if (region === 'title') {
      const names = new Set(state.points.filter(d => d.type === 'country').map(d => COUNTRY_NAME[d.id]).filter(Boolean));
      return state.world.features.filter(feature => names.has(featureName(feature)));
    }
    const names = new Set(rows.map(d => COUNTRY_NAME[d.id] || d.name));
    return state.world.features.filter(feature => names.has(featureName(feature)));
  }

  function contextFeatures(region) {
    if (region === 'united_states') return state.usStates.features;
    if (region === 'title') return state.world.features;
    return state.world.features;
  }

  function fitProjection(features) {
    const collection = { type: 'FeatureCollection', features };
    const padX = state.width < 760 ? 24 : 92;
    const top = state.width < 760 ? 128 : 72;
    const bottom = state.width < 760 ? 95 : 86;
    projection.fitExtent([[padX, top], [state.width - padX, state.height - bottom]], collection);
  }

  function colorFor(row) {
    const cfg = REGIONS[state.activeRegion] || REGIONS.europe;
    const t = Math.max(0, Math.min(1, (row.tfr - state.globalMin) / Math.max(state.globalMax - state.globalMin, 0.001)));
    return d3.interpolateRgb(cfg.colorA, cfg.colorB)(t);
  }

  function pointRadius(row) {
    const t = Math.max(0, Math.min(1, (row.tfr - state.globalMin) / Math.max(state.globalMax - state.globalMin, 0.001)));
    return row.type === 'state' ? 4.4 + t * 3.6 : 6.2 + t * 5.4;
  }

  function topBottomText(rows) {
    if (!rows.length) return '';
    const sorted = [...rows].sort((a, b) => b.tfr - a.tfr);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    const mean = rows.reduce((sum, row) => sum + row.tfr, 0) / rows.length;
    return `<strong>${rows.length}</strong> puntos · media <strong>${mean.toFixed(2)}</strong> · máximo <strong>${top.name} ${top.tfr.toFixed(2)}</strong> · mínimo <strong>${bottom.name} ${bottom.tfr.toFixed(2)}</strong>`;
  }

  function updateHud(rows) {
    const cfg = REGIONS[state.activeRegion] || REGIONS.europe;
    ui.kicker.textContent = cfg.kicker;
    ui.title.textContent = cfg.title;
    ui.summary.textContent = cfg.summary;
    ui.statline.innerHTML = topBottomText(rows);
  }

  function updateTooltip(event, row) {
    ui.tooltip.innerHTML = `<strong>${row.name}</strong><span>TFR: ${row.tfr.toFixed(2)} hijos por mujer</span><small>${row.year} · ${row.group}</small>`;
    ui.tooltip.style.left = `${event.offsetX + 18}px`;
    ui.tooltip.style.top = `${event.offsetY + 18}px`;
    ui.tooltip.classList.add('show');
  }

  function render() {
    const region = state.activeRegion;
    const rows = regionRows(region);
    const activeRows = region === 'title' ? [] : rows;
    const selectedFeatures = featuresForRegion(region);
    state.selectedFeatures = selectedFeatures;
    state.selectedFeatureNames = new Set(selectedFeatures.map(featureName));

    root.dataset.region = region;
    fitProjection(selectedFeatures);
    updateHud(rows);

    g.context.selectAll('path')
      .data(contextFeatures(region), featureName)
      .join('path')
      .attr('d', path)
      .attr('class', d => state.selectedFeatureNames.has(featureName(d)) ? 'context-country muted-selected' : 'context-country')
      .transition().duration(420)
      .attr('opacity', d => state.selectedFeatureNames.has(featureName(d)) ? 0 : region === 'title' ? 0.08 : 0.16);

    g.selected.selectAll('path')
      .data(region === 'title' ? [] : selectedFeatures, featureName)
      .join(
        enter => enter.append('path').attr('class', 'selected-country').attr('d', path).attr('opacity', 0),
        update => update,
        exit => exit.transition().duration(220).attr('opacity', 0).remove()
      )
      .transition().duration(520)
      .attr('d', path)
      .attr('opacity', 1);

    const circles = g.points.selectAll('circle')
      .data(activeRows, d => d.id);

    circles.join(
      enter => enter.append('circle')
        .attr('class', 'tfr-point')
        .attr('r', 0)
        .attr('cx', d => projection([d.lon, d.lat])[0])
        .attr('cy', d => projection([d.lon, d.lat])[1])
        .on('mousemove', updateTooltip)
        .on('mouseenter', updateTooltip)
        .on('mouseleave', () => ui.tooltip.classList.remove('show')),
      update => update,
      exit => exit.transition().duration(180).attr('r', 0).attr('opacity', 0).remove()
    )
      .transition().duration(520)
      .attr('cx', d => projection([d.lon, d.lat])[0])
      .attr('cy', d => projection([d.lon, d.lat])[1])
      .attr('r', pointRadius)
      .attr('fill', colorFor)
      .attr('opacity', 0.96);
  }

  function activateRegion(region) {
    if (!REGIONS[region] || state.activeRegion === region) return;
    state.activeRegion = region;
    chapters.forEach(chapter => chapter.classList.toggle('active', chapter.dataset.region === region));
    render();
  }

  function updateFromScroll() {
    if (!chapters.length) return;
    if (window.scrollY < root.offsetTop + 60) {
      activateRegion('europe');
      return;
    }
    const anchor = window.innerHeight * 0.54;
    let best = chapters[0];
    let bestDistance = Infinity;
    chapters.forEach(chapter => {
      const rect = chapter.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const distance = Math.abs(center - anchor);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = chapter;
      }
    });
    activateRegion(best.dataset.region || 'europe');
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    state.width = Math.max(rect.width, 320);
    state.height = Math.max(rect.height, 520);
    svg.attr('viewBox', `0 0 ${state.width} ${state.height}`).attr('width', state.width).attr('height', state.height);
    render();
  }

  async function init() {
    try {
      const [tfr, world, usStates] = await Promise.all([
        fetch('data/tfr-globe-data.json?v=tfr-flatmap-1').then(r => r.json()),
        fetch('data/world-countries.geojson?v=tfr-flatmap-1').then(r => r.json()),
        fetch('us-states.json').then(r => r.json())
      ]);
      state.points = tfr.points || [];
      state.world = world;
      state.usStates = usStates;
      const values = state.points.map(row => row.tfr).filter(Number.isFinite);
      state.globalMin = Math.min(...values);
      state.globalMax = Math.max(...values);
      chapters.forEach(chapter => chapter.classList.toggle('active', chapter.dataset.region === 'europe'));
      resize();
      updateFromScroll();
      window.addEventListener('resize', resize);
      window.addEventListener('scroll', () => requestAnimationFrame(updateFromScroll), { passive: true });
    } catch (err) {
      root.classList.add('globe-error');
      ui.summary.textContent = 'No se pudieron cargar los datos del mapa de fecundidad total.';
    }
  }

  init();
})();
