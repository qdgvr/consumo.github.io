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
      center: { lat: 52, lon: 12 },
      cameraZ: 5.35,
      colorA: 0x2f6df6,
      colorB: 0xffd26a
    },
    east_asia: {
      title: 'Asia oriental',
      kicker: 'TFR · hijos por mujer',
      summary: 'Corea del Sur, China y Japón en la zona de fecundidad más baja del recorrido.',
      center: { lat: 36, lon: 126 },
      cameraZ: 5.25,
      colorA: 0x37d8ff,
      colorB: 0xff5f8f
    },
    united_states: {
      title: 'Estados Unidos',
      kicker: 'TFR estatal estimada · hijos por mujer',
      summary: 'Cada punto representa un estado o Washington D. C., calculado desde las tasas específicas por edad del panel.',
      center: { lat: 39, lon: -98 },
      cameraZ: 5.25,
      colorA: 0x5c7cff,
      colorB: 0xa5df92
    },
    title: {
      title: 'Del mapa al reportaje',
      kicker: 'Reportaje de datos',
      summary: 'El mapa deja paso al texto: ocio digital, tiempo fuera de casa y maternidad aplazada.',
      center: { lat: 33, lon: -35 },
      cameraZ: 6.2,
      colorA: 0x30c0c0,
      colorB: 0xffffff
    }
  };

  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1000);
  camera.position.set(0, 0, REGIONS.europe.cameraZ);

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
  const pointGroup = new THREE.Group();
  group.add(borderGroup, pointGroup);

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
  let hover = null;

  const state = {
    activeRegion: 'europe',
    rows: [],
    world: null,
    usStates: null,
    points: [],
    globalMin: 0.7,
    globalMax: 2.1,
    targetRotation: regionRotation(REGIONS.europe.center),
    targetCameraZ: REGIONS.europe.cameraZ,
    pausedUntil: 0
  };
  group.rotation.set(state.targetRotation.x, state.targetRotation.y, 0);

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

  function pointSize(row) {
    const t = (row.tfr - state.globalMin) / Math.max(state.globalMax - state.globalMin, 0.001);
    const base = row.type === 'state' ? 0.082 : 0.115;
    return base + Math.max(0, Math.min(1, t)) * 0.07;
  }

  function makeCircleTexture() {
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 96;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 96, 96);
    ctx.beginPath();
    ctx.arc(48, 48, 34, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(0,0,0,.92)';
    ctx.stroke();
    return new THREE.CanvasTexture(c);
  }
  const circleTexture = makeCircleTexture();

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
    const rows = rowsFor(state.activeRegion);
    ui.kicker.textContent = cfg.kicker;
    ui.title.textContent = cfg.title;
    if (ui.summary) ui.summary.textContent = cfg.summary;
    if (ui.statline) ui.statline.innerHTML = topBottomText(rows);
  }

  function buildPoints() {
    clearGroup(pointGroup);
    state.points = [];
    state.rows.forEach(row => {
      const pos = latLonToVec(row.lat, row.lon, R * 1.04);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: circleTexture,
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        depthWrite: false
      }));
      sprite.position.copy(pos);
      sprite.userData.row = row;
      pointGroup.add(sprite);
      state.points.push(sprite);
    });
  }

  function updatePoints() {
    const cfg = REGIONS[state.activeRegion] || REGIONS.europe;
    const activeRows = rowsFor(state.activeRegion);
    const activeIds = new Set(activeRows.map(row => row.id));
    const showAll = state.activeRegion === 'title';

    state.points.forEach(sprite => {
      const row = sprite.userData.row;
      const active = showAll || activeIds.has(row.id);
      sprite.visible = active;
      if (!active) return;
      const size = pointSize(row) * (showAll ? 0.75 : 1);
      sprite.scale.set(size, size, 1);
      sprite.material.color.copy(colorFor(row, cfg));
      sprite.material.opacity = showAll ? 0.62 : 0.96;
    });

    buildBorders(featuresForRegion(state.activeRegion));
    updateHud();
  }

  function activateRegion(region) {
    if (!REGIONS[region]) return;
    state.activeRegion = region;
    root.dataset.region = region;
    chapters.forEach(chapter => chapter.classList.toggle('active', chapter.dataset.region === region));

    const cfg = REGIONS[region];
    const nextRotation = regionRotation(cfg.center);
    while (nextRotation.y - group.rotation.y > Math.PI) nextRotation.y -= Math.PI * 2;
    while (nextRotation.y - group.rotation.y < -Math.PI) nextRotation.y += Math.PI * 2;
    state.targetRotation = nextRotation;
    state.targetCameraZ = cfg.cameraZ;
    state.pausedUntil = performance.now() + 900;
    ui.tooltip.classList.remove('show', 'fixed');
    updatePoints();
  }

  function updateFromScroll() {
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
    const hits = raycaster.intersectObjects(state.points.filter(p => p.visible), false);
    hover = hits[0] && hits[0].object ? hits[0].object : null;
    if (hover && hover.userData.row && !dragging) {
      const row = hover.userData.row;
      const rect = canvas.getBoundingClientRect();
      ui.tooltip.innerHTML = `<strong>${row.name}</strong><span>TFR: ${row.tfr.toFixed(2)} hijos por mujer</span><small>${row.year} · ${row.group}</small>`;
      ui.tooltip.style.left = `${(pointer.x + 1) * rect.width / 2 + 16}px`;
      ui.tooltip.style.top = `${(-pointer.y + 1) * rect.height / 2 + 16}px`;
      ui.tooltip.classList.add('show');
    } else {
      ui.tooltip.classList.remove('show');
    }
  }

  function bindPointer() {
    canvas.addEventListener('pointerdown', event => {
      dragging = true;
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
        group.rotation.y += dx * 0.005;
        group.rotation.x = Math.max(-1.05, Math.min(1.05, group.rotation.x + dy * 0.003));
        state.targetRotation = { x: group.rotation.x, y: group.rotation.y, z: 0 };
        lastX = event.clientX;
        lastY = event.clientY;
      }
    });
    canvas.addEventListener('pointerup', event => {
      dragging = false;
      try { canvas.releasePointerCapture(event.pointerId); } catch (_) {}
    });
    canvas.addEventListener('pointerleave', () => {
      dragging = false;
      ui.tooltip.classList.remove('show');
    });
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    const width = Math.max(rect.width, 320);
    const height = Math.max(rect.height, 520);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function animate(now = 0) {
    requestAnimationFrame(animate);
    if (!dragging) {
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
    bindPointer();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', () => requestAnimationFrame(updateFromScroll), { passive: true });
    try {
      const [tfr, world, usStates] = await Promise.all([
        fetch('data/tfr-globe-data.json?v=tfr-globe-boundaries-1').then(r => r.json()),
        fetch('data/world-countries.geojson?v=tfr-globe-boundaries-1').then(r => r.json()),
        fetch('us-states.json').then(r => r.json())
      ]);
      state.rows = tfr.points || [];
      state.world = world;
      state.usStates = usStates;
      const values = state.rows.map(row => row.tfr).filter(Number.isFinite);
      state.globalMin = Math.min(...values);
      state.globalMax = Math.max(...values);
      buildPoints();
      activateRegion('europe');
    } catch (err) {
      root.classList.add('globe-error');
      if (ui.summary) ui.summary.textContent = 'No se pudieron cargar los datos de fecundidad total.';
    }
    animate();
  }

  init();
})();
