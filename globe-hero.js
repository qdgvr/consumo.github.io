(() => {
  const root = document.getElementById('globe-hero');
  const canvas = document.getElementById('globe-canvas');
  if (!root || !canvas || !window.THREE) return;

  function forceTop() {
    if (!window.location.hash) window.scrollTo(0, 0);
  }
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  forceTop();
  window.addEventListener('DOMContentLoaded', forceTop);
  window.addEventListener('pageshow', forceTop);
  window.addEventListener('load', () => { forceTop(); setTimeout(forceTop, 60); setTimeout(forceTop, 220); });

  const stage = root.querySelector('.globe-stage') || root;
  const chapters = [...root.querySelectorAll('.globe-chapter')];
  const gateway = document.querySelector('.chapter-gateway');
  const ui = {
    title: document.getElementById('globe-stage-title'),
    kicker: document.getElementById('globe-stage-kicker'),
    selected: document.getElementById('globe-selected'),
    summary: document.getElementById('globe-stage-summary'),
    statline: document.getElementById('globe-statline'),
    tooltip: document.getElementById('globe-tooltip')
  };

  const COUNTRY_NAME = {
    AUT: 'Austria', BEL: 'Belgium', BGR: 'Bulgaria', HRV: 'Croatia', CYP: 'Cyprus', CZE: 'Czech Republic', DNK: 'Denmark', EST: 'Estonia', FIN: 'Finland', FRA: 'France', DEU: 'Germany', GRC: 'Greece', HUN: 'Hungary', IRL: 'Ireland', ITA: 'Italy', LVA: 'Latvia', LTU: 'Lithuania', LUX: 'Luxembourg', MLT: 'Malta', NLD: 'Netherlands', POL: 'Poland', PRT: 'Portugal', ROU: 'Romania', SVK: 'Slovakia', SVN: 'Slovenia', ESP: 'Spain', SWE: 'Sweden', CHE: 'Switzerland', NOR: 'Norway', ISL: 'Iceland', GBR: 'United Kingdom', UKR: 'Ukraine', BLR: 'Belarus', RUS: 'Russia', ALB: 'Albania', BIH: 'Bosnia and Herzegovina', XKX: 'Kosovo', MKD: 'Macedonia', MNE: 'Montenegro', SRB: 'Republic of Serbia', KOR: 'South Korea', CHN: 'China', JPN: 'Japan'
  };

  const REGIONS = {
    europe: {
      title: 'Europa',
      kicker: 'TFR · hijos por mujer',
      summary: 'Unión Europea, Reino Unido, Suiza, países nórdicos, Balcanes no comunitarios, Ucrania, Bielorrusia y Rusia.',
      center: { lat: 52, lon: 12 },
      cameraZ: 5.35,
      colorA: 0x264b83,
      colorB: 0x9fc3ed
    },
    east_asia: {
      title: 'El extremo asiático',
      kicker: 'TFR · hijos por mujer',
      summary: 'Corea del Sur, China y Japón en la zona de fecundidad más baja del recorrido.',
      center: { lat: 36, lon: 126 },
      cameraZ: 5.25,
      colorA: 0x264b83,
      colorB: 0x9fc3ed
    },
    united_states: {
      title: 'Estados Unidos',
      kicker: 'TFR estatal estimada · hijos por mujer',
      summary: 'Cada punto representa un estado o Washington D. C., calculado desde las tasas específicas por edad del panel.',
      center: { lat: 39, lon: -98 },
      cameraZ: 5.25,
      colorA: 0x264b83,
      colorB: 0x9fc3ed
    },
    title: {
      title: 'El retraso de la maternidad con la vida digital en Estados Unidos',
      kicker: 'Reportaje de datos',
      summary: 'Un recorrido visual por 20 años de cambios en el uso del tiempo y la fecundidad estadounidense.',
      center: { lat: 33, lon: -35 },
      cameraZ: 6.2,
      colorA: 0x264b83,
      colorB: 0x9fc3ed
    }
  };
  const INTRO = {
    startCenter: { lat: -10, lon: -155 },
    cameraZ: 6.45,
    duration: 3600,
    textAt: 0.86
  };

  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1000);
  camera.position.set(0, 0, INTRO.cameraZ);

  const group = new THREE.Group();
  scene.add(group);

  scene.add(new THREE.AmbientLight(0x56677d, 1.05));
  const sun = new THREE.DirectionalLight(0xffffff, 1.45);
  sun.position.set(4, 2.4, 5);
  scene.add(sun);

  const R = 2.05;
  const earthMat = new THREE.MeshPhongMaterial({ color: 0x0b1727, shininess: 18, emissive: 0x050912, emissiveIntensity: 0.35 });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 96), earthMat);
  group.add(earth);

  const fillMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.88, depthWrite: false });
  const fillLayer = new THREE.Mesh(new THREE.SphereGeometry(R * 1.006, 128, 128), fillMat);
  group.add(fillLayer);

  new THREE.TextureLoader().load('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg', tex => {
    tex.anisotropy = 4;
    earthMat.map = tex;
    earthMat.color.setHex(0xffffff);
    earthMat.needsUpdate = true;
  }, undefined, () => {});

  const wire = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.004, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x5ab8ff, wireframe: true, transparent: true, opacity: 0.08 })
  );
  group.add(wire);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.09, 72, 72),
    new THREE.MeshBasicMaterial({ color: 0x42d9ff, transparent: true, opacity: 0.08, side: THREE.BackSide, blending: THREE.AdditiveBlending })
  );
  group.add(glow);

  const borderGroup = new THREE.Group();
  group.add(borderGroup);

  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 3800; i++) {
    const radius = 36 + Math.random() * 48;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    starPos.push(radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.035, transparent: true, opacity: 0.72 }));
  scene.add(stars);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(99, 99);
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let dragDistance = 0;
  let hover = null;

  const state = {
    activeRegion: 'europe',
    rows: [],
    world: null,
    usStates: null,
    points: [],
    activeFeatureRows: [],
    rowByCountryName: new Map(),
    rowByStateName: new Map(),
    selectedRow: null,
    globalMin: 0.7,
    globalMax: 2.1,
    targetRotation: regionRotation(INTRO.startCenter),
    targetCameraZ: INTRO.cameraZ,
    introActive: true,
    introStartTime: 0,
    introFrom: regionRotation(INTRO.startCenter),
    introTo: regionRotation(REGIONS.europe.center),
    pausedUntil: 0
  };
  group.rotation.set(state.introFrom.x, state.introFrom.y, 0);

  function regionRotation(center) {
    return {
      x: Math.max(-1.05, Math.min(1.05, center.lat * Math.PI / 180)),
      y: -(center.lon + 90) * Math.PI / 180,
      z: 0
    };
  }

  function latLonToVec(lat, lon, radius = R) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lon + 180) * Math.PI / 180;
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  function colorFor(row, cfg) {
    const t = (row.tfr - state.globalMin) / Math.max(state.globalMax - state.globalMin, 0.001);
    const ca = new THREE.Color(cfg.colorA);
    const cb = new THREE.Color(cfg.colorB);
    return ca.lerp(cb, Math.max(0, Math.min(1, t)));
  }

  function clearGroup(target) {
    while (target.children.length) {
      const obj = target.children.pop();
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }
  }

  function rowsFor(region) {
    if (region === 'title') return state.rows;
    return state.rows.filter(row => row.region === region);
  }

  function featureName(feature) {
    return feature.properties.name || feature.properties.NAME;
  }

  function buildRowLookups() {
    state.rowByCountryName = new Map();
    state.rowByStateName = new Map();
    state.rows.forEach(row => {
      if (row.type === 'state') state.rowByStateName.set(row.name, row);
      if (row.type === 'country') state.rowByCountryName.set(COUNTRY_NAME[row.id] || row.name, row);
    });
  }

  function rowForFeature(feature) {
    const stateName = feature.properties && feature.properties.NAME;
    const countryName = featureName(feature);
    return state.rowByStateName.get(stateName) || state.rowByCountryName.get(countryName) || null;
  }

  function displayGroup(row) {
    if (row.region === 'east_asia') return 'El extremo asiático';
    return row.group;
  }

  function featuresForRegion(region) {
    const rows = rowsFor(region);
    if (region === 'united_states') {
      const names = new Set(rows.map(d => d.name));
      return state.usStates.features.filter(feature => names.has(feature.properties.NAME));
    }
    if (region === 'title') {
      const countryNames = new Set(state.rows.filter(d => d.type === 'country').map(d => COUNTRY_NAME[d.id]).filter(Boolean));
      const stateNames = new Set(state.rows.filter(d => d.type === 'state').map(d => d.name));
      return [
        ...state.world.features.filter(feature => countryNames.has(featureName(feature))),
        ...state.usStates.features.filter(feature => stateNames.has(feature.properties.NAME))
      ];
    }
    const names = new Set(rows.map(d => COUNTRY_NAME[d.id] || d.name));
    return state.world.features.filter(feature => names.has(featureName(feature)));
  }

  function featureRowsForRegion(region) {
    return featuresForRegion(region)
      .map(feature => ({ feature, row: rowForFeature(feature) }))
      .filter(item => item.row);
  }

  function forEachRing(geometry, cb) {
    if (!geometry) return;
    if (geometry.type === 'Polygon') geometry.coordinates.forEach(cb);
    if (geometry.type === 'MultiPolygon') geometry.coordinates.forEach(poly => poly.forEach(cb));
  }

  function buildBorders(features) {
    clearGroup(borderGroup);
    const positions = [];
    features.forEach(feature => {
      forEachRing(feature.geometry, ring => {
        const step = Math.max(1, Math.floor(ring.length / 260));
        for (let i = 0; i < ring.length - 1; i += step) {
          const a = ring[i];
          const b = ring[Math.min(i + step, ring.length - 1)];
          if (!a || !b) continue;
          if (Math.abs(a[0] - b[0]) > 120) continue;
          const va = latLonToVec(a[1], a[0], R * 1.012);
          const vb = latLonToVec(b[1], b[0], R * 1.012);
          positions.push(va.x, va.y, va.z, vb.x, vb.y, vb.z);
        }
      });
    });
    if (!positions.length) return;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({ color: 0xe7e7e7, transparent: true, opacity: state.activeRegion === 'title' ? 0.34 : 0.72, blending: THREE.AdditiveBlending });
    borderGroup.add(new THREE.LineSegments(geom, mat));
  }

  function buildFillTexture() {
    if (!window.d3 || !state.world || !state.usStates) return;
    const width = 4096;
    const height = 2048;
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    const projection = d3.geoEquirectangular()
      .translate([width / 2, height / 2])
      .scale(width / (Math.PI * 2))
      .precision(0.08);
    const path = d3.geoPath(projection, ctx);
    const features = [
      ...state.world.features.map(feature => ({ feature, row: rowForFeature(feature) })),
      ...state.usStates.features.map(feature => ({ feature, row: rowForFeature(feature) }))
    ].filter(item => item.row);

    features.forEach(({ feature, row }) => {
      const color = colorFor(row, REGIONS[row.region] || REGIONS.europe);
      ctx.beginPath();
      path(feature);
      ctx.fillStyle = `#${color.getHexString()}`;
      ctx.globalAlpha = row.type === 'state' ? 0.78 : 0.82;
      ctx.fill('evenodd');
      ctx.globalAlpha = 0.42;
      ctx.strokeStyle = 'rgba(255,255,255,.72)';
      ctx.lineWidth = row.type === 'state' ? 0.85 : 1.1;
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    if (fillMat.map) fillMat.map.dispose();
    fillMat.map = new THREE.CanvasTexture(c);
    fillMat.map.anisotropy = 4;
    fillMat.needsUpdate = true;
  }

  function topBottomText(rows) {
    if (!rows.length) return '';
    const sorted = [...rows].sort((a, b) => b.tfr - a.tfr);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    const mean = rows.reduce((sum, row) => sum + row.tfr, 0) / rows.length;
    return `<strong>${rows.length}</strong> puntos · media <strong>${mean.toFixed(2)}</strong> · máximo <strong>${top.name} ${top.tfr.toFixed(2)}</strong> · mínimo <strong>${bottom.name} ${bottom.tfr.toFixed(2)}</strong>`;
  }

  function updateHud() {
    const cfg = REGIONS[state.activeRegion] || REGIONS.europe;
    ui.kicker.textContent = cfg.kicker;
    ui.title.textContent = cfg.title;
    if (ui.summary) ui.summary.textContent = cfg.summary;
    if (ui.statline) ui.statline.innerHTML = topBottomText(rowsFor(state.activeRegion));
    if (ui.selected) {
      const row = state.selectedRow && (state.activeRegion === 'title' || state.selectedRow.region === state.activeRegion) ? state.selectedRow : null;
      ui.selected.innerHTML = row ? `<strong>${row.name}</strong><span>TFR ${row.tfr.toFixed(2)} hijos por mujer</span><small>${row.year} · ${displayGroup(row)}</small>` : '';
      ui.selected.classList.toggle('show', Boolean(row));
    }
  }

  function buildPoints() {
    state.points = [];
    buildFillTexture();
  }

  function updatePoints() {
    state.activeFeatureRows = featureRowsForRegion(state.activeRegion);
    buildBorders(state.activeFeatureRows.map(item => item.feature));
    updateHud();
  }

  function activateRegion(region) {
    if (!REGIONS[region]) return;
    state.activeRegion = region;
    if (state.selectedRow && region !== 'title' && state.selectedRow.region !== region) state.selectedRow = null;
    root.dataset.region = region;
    chapters.forEach(chapter => chapter.classList.toggle('active', chapter.dataset.region === region));

    const cfg = REGIONS[region];
    const nextRotation = regionRotation(cfg.center);
    while (nextRotation.y - group.rotation.y > Math.PI) nextRotation.y -= Math.PI * 2;
    while (nextRotation.y - group.rotation.y < -Math.PI) nextRotation.y += Math.PI * 2;
    state.targetRotation = nextRotation;
    state.targetCameraZ = cfg.cameraZ;
    state.pausedUntil = performance.now() + 900;
    if (ui.tooltip) ui.tooltip.classList.remove('show', 'fixed');
    updatePoints();
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function updateGlobeExit() {
    const rect = root.getBoundingClientRect();
    const viewport = Math.max(window.innerHeight || 1, 1);
    const start = viewport * 1.08;
    const end = viewport * 0.18;
    const progress = clamp01((start - rect.bottom) / Math.max(start - end, 1));
    const eased = easeInOutCubic(progress);
    root.style.setProperty('--globe-exit-opacity', (1 - eased * 0.95).toFixed(3));
    root.style.setProperty('--globe-exit-scale', (1 - eased * 0.22).toFixed(3));
    root.style.setProperty('--globe-exit-y', `${(-44 * eased).toFixed(1)}px`);
    root.style.setProperty('--globe-exit-blur', `${(11 * eased).toFixed(1)}px`);
  }

  function initChapterReveal() {
    if (!gateway) return;
    if (!('IntersectionObserver' in window)) {
      gateway.classList.add('is-visible');
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          gateway.classList.add('is-visible');
          observer.disconnect();
        }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -12% 0px' });
    observer.observe(gateway);
  }

  function startIntroSequence() {
    const from = regionRotation(INTRO.startCenter);
    const to = regionRotation(REGIONS.europe.center);
    while (to.y - from.y > Math.PI) to.y -= Math.PI * 2;
    while (to.y - from.y < -Math.PI) to.y += Math.PI * 2;

    state.introActive = true;
    state.introStartTime = performance.now();
    root.classList.add('globe-intro-ready');
    state.introFrom = from;
    state.introTo = to;
    state.activeRegion = 'europe';
    state.targetRotation = to;
    state.targetCameraZ = REGIONS.europe.cameraZ;
    root.dataset.region = 'europe';
    chapters.forEach(chapter => chapter.classList.toggle('active', chapter.dataset.region === 'europe'));
    group.rotation.set(from.x, from.y, 0);
    camera.position.z = INTRO.cameraZ;
    updatePoints();
  }

  function updateFromScroll() {
    updateGlobeExit();
    if (state.introActive) return;
    if (window.scrollY < root.offsetTop + 80) {
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

  function updateHover() {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(earth, false);
    hover = null;
    if (hits[0] && !dragging && window.d3) {
      const local = group.worldToLocal(hits[0].point.clone());
      const r = local.length();
      const lat = Math.asin(local.y / r) * 180 / Math.PI;
      let lon = Math.atan2(local.z, -local.x) * 180 / Math.PI - 180;
      if (lon < -180) lon += 360;
      if (lon > 180) lon -= 360;
      const hit = state.activeFeatureRows.find(item => d3.geoContains(item.feature, [lon, lat]));
      hover = hit ? hit.row : null;
    }
    state.hoverRow = hover;
    if (ui.tooltip) ui.tooltip.classList.remove('show', 'fixed');
  }

  function bindPointer() {
    canvas.addEventListener('pointerdown', event => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      dragging = true;
      dragDistance = 0;
      lastX = event.clientX;
      lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
      state.pausedUntil = performance.now() + 1800;
    });
    canvas.addEventListener('pointermove', event => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      if (dragging) {
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        dragDistance += Math.abs(dx) + Math.abs(dy);
        group.rotation.y += dx * 0.005;
        group.rotation.x = Math.max(-1.05, Math.min(1.05, group.rotation.x + dy * 0.003));
        state.targetRotation = { x: group.rotation.x, y: group.rotation.y, z: 0 };
        lastX = event.clientX;
        lastY = event.clientY;
      }
    });
    canvas.addEventListener('pointerup', event => {
      const wasClick = dragDistance < 8;
      dragging = false;
      if (wasClick) updateHover();
      if (wasClick && state.hoverRow) {
        state.selectedRow = state.hoverRow;
        updateHud();
        if (ui.tooltip) ui.tooltip.classList.remove('show', 'fixed');
      }
      try { canvas.releasePointerCapture(event.pointerId); } catch (_) {}
    });
    canvas.addEventListener('pointerleave', () => {
      dragging = false;
      if (ui.tooltip) ui.tooltip.classList.remove('show', 'fixed');
    });
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    const width = Math.max(rect.width, 320);
    const height = Math.max(rect.height, 520);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    updateGlobeExit();
  }

  function animate(now = 0) {
    requestAnimationFrame(animate);
    if (state.introActive && state.introStartTime) {
      const raw = Math.min(1, Math.max(0, (now - state.introStartTime) / INTRO.duration));
      const eased = easeInOutCubic(raw);
      group.rotation.x = state.introFrom.x + (state.introTo.x - state.introFrom.x) * eased;
      group.rotation.y = state.introFrom.y + (state.introTo.y - state.introFrom.y) * eased;
      camera.position.z = INTRO.cameraZ + (REGIONS.europe.cameraZ - INTRO.cameraZ) * eased;
      if (raw >= INTRO.textAt) root.classList.add('globe-intro-text');
      if (raw >= 1) {
        state.introActive = false;
        root.classList.remove('globe-intro');
        root.classList.add('globe-intro-complete');
        group.rotation.set(state.introTo.x, state.introTo.y, 0);
        camera.position.z = REGIONS.europe.cameraZ;
        updateFromScroll();
      }
    } else if (!dragging) {
      const lerp = now > state.pausedUntil ? 0.04 : 0.025;
      group.rotation.x += (state.targetRotation.x - group.rotation.x) * lerp;
      group.rotation.y += (state.targetRotation.y - group.rotation.y) * lerp;
      camera.position.z += (state.targetCameraZ - camera.position.z) * 0.035;
    }
    stars.rotation.y += 0.00008;
    updateHover();
    renderer.render(scene, camera);
  }

  async function init() {
    resize();
    initChapterReveal();
    bindPointer();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', () => requestAnimationFrame(updateFromScroll), { passive: true });
    try {
      const [tfr, world, usStates] = await Promise.all([
        fetch('data/tfr-globe-data.json?v=tfr-globe-europe-2').then(r => r.json()),
        fetch('data/world-countries.geojson?v=tfr-globe-boundaries-1').then(r => r.json()),
        fetch('us-states.json').then(r => r.json())
      ]);
      state.rows = tfr.points || [];
      state.world = world;
      state.usStates = usStates;
      buildRowLookups();
      const values = state.rows.map(row => row.tfr).filter(Number.isFinite);
      state.globalMin = Math.min(...values);
      state.globalMax = Math.max(...values);
      buildPoints();
      startIntroSequence();
    } catch (err) {
      root.classList.add('globe-error');
      if (ui.summary) ui.summary.textContent = 'No se pudieron cargar los datos de fecundidad total.';
    }
    animate();
  }

  init();
})();
