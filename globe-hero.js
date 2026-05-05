(() => {
  const root = document.getElementById('globe-hero');
  const canvas = document.getElementById('globe-canvas');
  if (!root || !canvas || !window.THREE) return;
  const stage = root.querySelector('.globe-stage') || root;

  const STATE_COORDS = {
    Alabama:[32.8067,-86.7911], Alaska:[61.3707,-152.4044], Arizona:[33.7298,-111.4312], Arkansas:[34.9697,-92.3731], California:[36.1162,-119.6816], Colorado:[39.0598,-105.3111], Connecticut:[41.5978,-72.7554], Delaware:[39.3185,-75.5071], 'District of Columbia':[38.9072,-77.0369], Florida:[27.7663,-81.6868], Georgia:[33.0406,-83.6431], Hawaii:[21.0943,-157.4983], Idaho:[44.2405,-114.4788], Illinois:[40.3495,-88.9861], Indiana:[39.8494,-86.2583], Iowa:[42.0115,-93.2105], Kansas:[38.5266,-96.7265], Kentucky:[37.6681,-84.6701], Louisiana:[31.1695,-91.8678], Maine:[44.6939,-69.3819], Maryland:[39.0639,-76.8021], Massachusetts:[42.2302,-71.5301], Michigan:[43.3266,-84.5361], Minnesota:[45.6945,-93.9002], Mississippi:[32.7416,-89.6787], Missouri:[38.4561,-92.2884], Montana:[46.9219,-110.4544], Nebraska:[41.1254,-98.2681], Nevada:[38.3135,-117.0554], 'New Hampshire':[43.4525,-71.5639], 'New Jersey':[40.2989,-74.5210], 'New Mexico':[34.8405,-106.2485], 'New York':[42.1657,-74.9481], 'North Carolina':[35.6301,-79.8064], 'North Dakota':[47.5289,-99.7840], Ohio:[40.3888,-82.7649], Oklahoma:[35.5653,-96.9289], Oregon:[44.5720,-122.0709], Pennsylvania:[40.5908,-77.2098], 'Rhode Island':[41.6809,-71.5118], 'South Carolina':[33.8569,-80.9450], 'South Dakota':[44.2998,-99.4388], Tennessee:[35.7478,-86.6923], Texas:[31.0545,-97.5635], Utah:[40.1500,-111.8624], Vermont:[44.0459,-72.7107], Virginia:[37.7693,-78.1700], Washington:[47.4009,-121.4905], 'West Virginia':[38.4912,-80.9545], Wisconsin:[44.2685,-89.6165], Wyoming:[42.7560,-107.3025]
  };

  const MODE = {
    digital: { label: 'Ocio digital', field: 'DigitalOcio_hours', unit: 'h', colorA: 0x2a75ff, colorB: 0x31f4e2, digits: 2, value: d => d.DigitalOcio_hours },
    outside: { label: 'Tiempo exterior', field: 'M_minutes', unit: 'h', colorA: 0x6b7cff, colorB: 0xf4c95d, digits: 2, value: d => d.M_minutes / 60 },
    fertility: { label: 'Fecundidad 20-24', field: 'ASFR_20_24', unit: '‰', colorA: 0x4450ff, colorB: 0xff5f8f, digits: 1, value: d => d.ASFR_20_24 },
    maternal: { label: 'Edad materna', field: 'MeanMaternalAge', unit: 'años', colorA: 0x35b7ff, colorB: 0xf8f0a6, digits: 1, value: d => d.MeanMaternalAge }
  };

  const ui = {
    modes: document.getElementById('globe-modes'),
    list: document.getElementById('globe-state-list'),
    year: document.getElementById('globe-year'),
    yearLabel: document.getElementById('globe-year-label'),
    tooltip: document.getElementById('globe-tooltip'),
    toggleEarth: document.getElementById('globe-toggle-earth'),
    toggleWire: document.getElementById('globe-toggle-wire'),
    toggleStars: document.getElementById('globe-toggle-stars'),
    toggleArcs: document.getElementById('globe-toggle-arcs'),
    togglePulse: document.getElementById('globe-toggle-pulse'),
    rotationSpeed: document.getElementById('globe-rotation-speed'),
    arcStrength: document.getElementById('globe-arc-strength'),
    pulseSpeed: document.getElementById('globe-pulse-speed'),
    pointSize: document.getElementById('globe-point-size'),
    reset: document.getElementById('globe-reset')
  };

  const state = {
    mode: 'digital',
    year: 2024,
    rows: [],
    byYear: new Map(),
    points: [],
    arcs: [],
    pulses: [],
    dragging: false,
    pausedUntil: 0,
    hover: null,
    selected: null
  };

  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1000);
  camera.position.set(0, 0, 7.2);

  const group = new THREE.Group();
  group.rotation.set(-0.15, -2.45, 0);
  scene.add(group);

  scene.add(new THREE.AmbientLight(0x4c607a, 1.05));
  const sun = new THREE.DirectionalLight(0xffffff, 1.35);
  sun.position.set(4, 2.5, 5);
  scene.add(sun);

  const R = 2.05;
  const earthMat = new THREE.MeshPhongMaterial({ color: 0x0b1727, shininess: 18, emissive: 0x050912, emissiveIntensity: 0.35 });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 72, 72), earthMat);
  group.add(earth);
  new THREE.TextureLoader().load('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg', tex => {
    tex.anisotropy = 4;
    earthMat.map = tex;
    earthMat.color.setHex(0xffffff);
    earthMat.needsUpdate = true;
  }, undefined, () => {});

  const wire = new THREE.Mesh(new THREE.SphereGeometry(R * 1.003, 48, 48), new THREE.MeshBasicMaterial({ color: 0x5ab8ff, wireframe: true, transparent: true, opacity: 0.11 }));
  group.add(wire);

  const glow = new THREE.Mesh(new THREE.SphereGeometry(R * 1.08, 72, 72), new THREE.MeshBasicMaterial({ color: 0x42d9ff, transparent: true, opacity: 0.08, side: THREE.BackSide, blending: THREE.AdditiveBlending }));
  group.add(glow);

  const pointGroup = new THREE.Group();
  const arcGroup = new THREE.Group();
  const pulseGroup = new THREE.Group();
  group.add(arcGroup, pulseGroup, pointGroup);

  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 3600; i++) {
    const radius = 36 + Math.random() * 46;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    starPos.push(radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.035, transparent: true, opacity: 0.72 }));
  scene.add(stars);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(99, 99);
  let lastX = 0;
  let lastY = 0;

  function latLonToVec(lat, lon, radius = R) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lon + 180) * Math.PI / 180;
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines.shift().split(';');
    return lines.map(line => {
      const parts = line.split(';');
      const row = {};
      headers.forEach((h, i) => {
        row[h] = i === 0 ? parts[i] : Number(parts[i]);
      });
      return row;
    }).filter(row => STATE_COORDS[row.STATE]);
  }

  function mixColor(a, b, t) {
    const ca = new THREE.Color(a);
    const cb = new THREE.Color(b);
    return ca.lerp(cb, Math.max(0, Math.min(1, t)));
  }

  function currentRows() {
    return state.byYear.get(Number(state.year)) || [];
  }

  function valueFor(row) {
    return MODE[state.mode].value(row);
  }

  function format(row) {
    const cfg = MODE[state.mode];
    return `${valueFor(row).toFixed(cfg.digits)} ${cfg.unit}`;
  }

  function updatePoints() {
    const rows = currentRows();
    if (!rows.length) return;
    const cfg = MODE[state.mode];
    const values = rows.map(valueFor).filter(Number.isFinite);
    if (!values.length) return;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = Math.max(max - min, 0.0001);
    const pointScale = Number(ui.pointSize.value || 1);
    const rowMap = new Map(rows.map(d => [d.STATE, d]));

    state.points.forEach(mesh => {
      const row = rowMap.get(mesh.userData.state);
      mesh.visible = !!row;
      if (!row) return;
      const t = (valueFor(row) - min) / spread;
      const color = mixColor(cfg.colorA, cfg.colorB, t);
      const base = 0.028 + t * 0.052;
      mesh.scale.setScalar((base * pointScale) / 0.035);
      mesh.material.color.copy(color);
      mesh.material.emissive.copy(color);
      mesh.userData.row = row;
      mesh.userData.value = valueFor(row);
    });

    updateList(rows, min, max);
    rebuildArcs(rows, min, max);
  }

  function updateList(rows) {
    const sorted = [...rows].sort((a, b) => valueFor(b) - valueFor(a)).slice(0, 7);
    ui.list.innerHTML = sorted.map((row, idx) => `<button data-state="${row.STATE}"><span>${idx + 1}</span><strong>${row.STATE}</strong><em>${format(row)}</em></button>`).join('');
    ui.list.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        state.selected = btn.dataset.state;
        flashState(state.selected);
      });
    });
  }

  function clearGroup(target) {
    while (target.children.length) {
      const obj = target.children.pop();
      obj.geometry && obj.geometry.dispose();
      obj.material && obj.material.dispose();
    }
  }

  function rebuildArcs(rows, min, max) {
    clearGroup(arcGroup);
    clearGroup(pulseGroup);
    state.arcs = [];
    state.pulses = [];
    const sorted = [...rows].sort((a, b) => valueFor(b) - valueFor(a));
    const top = sorted.slice(0, 8);
    const bottom = sorted.slice(-8).reverse();
    const cfg = MODE[state.mode];
    const strength = Number(ui.arcStrength.value || 0.6);

    top.forEach((a, i) => {
      const b = bottom[i % bottom.length];
      if (!a || !b || a.STATE === b.STATE) return;
      const start = latLonToVec(...STATE_COORDS[a.STATE], R * 1.025);
      const end = latLonToVec(...STATE_COORDS[b.STATE], R * 1.025);
      const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(R * (1.45 + i * 0.025));
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const geom = new THREE.TubeGeometry(curve, 54, 0.006 + strength * 0.006, 8, false);
      const color = mixColor(cfg.colorA, cfg.colorB, 0.72);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16 + strength * 0.46, blending: THREE.AdditiveBlending, depthWrite: false });
      const mesh = new THREE.Mesh(geom, mat);
      arcGroup.add(mesh);
      state.arcs.push({ curve, mesh });

      const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.027 + strength * 0.014, 12, 12), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }));
      pulse.userData.offset = i / top.length;
      pulseGroup.add(pulse);
      state.pulses.push({ curve, mesh: pulse });
    });
  }

  function buildPoints() {
    Object.entries(STATE_COORDS).forEach(([name, coord]) => {
      const pos = latLonToVec(coord[0], coord[1], R * 1.035);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 16, 16),
        new THREE.MeshPhongMaterial({ color: 0x31f4e2, emissive: 0x31f4e2, emissiveIntensity: 1.8, transparent: true, opacity: 0.92 })
      );
      mesh.position.copy(pos);
      mesh.userData.state = name;
      pointGroup.add(mesh);
      state.points.push(mesh);
    });
  }

  function flashState(name) {
    const mesh = state.points.find(p => p.userData.state === name);
    if (!mesh) return;
    const row = mesh.userData.row;
    if (row) {
      ui.tooltip.innerHTML = `<strong>${row.STATE}</strong><span>${MODE[state.mode].label}: ${format(row)}</span><small>${state.year}</small>`;
      ui.tooltip.classList.add('fixed');
      ui.tooltip.style.left = '50%';
      ui.tooltip.style.top = '50%';
    }
    mesh.scale.multiplyScalar(1.8);
    setTimeout(() => updatePoints(), 260);
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    const width = Math.max(rect.width, 320);
    const height = Math.max(rect.height, 520);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function resetCamera() {
    camera.position.set(0, 0, 7.2);
    group.rotation.set(-0.15, -2.45, 0);
    state.pausedUntil = performance.now() + 2500;
  }

  function updateVisibility() {
    earth.visible = ui.toggleEarth.checked;
    glow.visible = ui.toggleEarth.checked;
    wire.visible = ui.toggleWire.checked;
    stars.visible = ui.toggleStars.checked;
    arcGroup.visible = ui.toggleArcs.checked;
    pulseGroup.visible = ui.togglePulse.checked && ui.toggleArcs.checked;
  }

  function setYear(year) {
    const next = Number(year);
    if (!Number.isFinite(next)) return;
    state.year = next;
    ui.year.value = String(next);
    ui.yearLabel.textContent = String(next);
    updatePoints();
  }

  function setMode(mode) {
    if (!MODE[mode]) return;
    state.mode = mode;
    ui.modes.querySelectorAll('button').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
    updatePoints();
  }

  function bindUi() {
    ui.year.addEventListener('input', () => setYear(ui.year.value));
    ui.modes.addEventListener('click', event => {
      const btn = event.target.closest('button[data-mode]');
      if (!btn) return;
      setMode(btn.dataset.mode);
    });
    [ui.toggleEarth, ui.toggleWire, ui.toggleStars, ui.toggleArcs, ui.togglePulse].forEach(input => input.addEventListener('change', updateVisibility));
    ui.arcStrength.addEventListener('input', () => updatePoints());
    ui.pointSize.addEventListener('input', () => updatePoints());
    ui.reset.addEventListener('click', resetCamera);

    canvas.addEventListener('pointerdown', event => { state.dragging = true; lastX = event.clientX; lastY = event.clientY; canvas.setPointerCapture(event.pointerId); state.pausedUntil = performance.now() + 2400; });
    canvas.addEventListener('pointermove', event => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      if (state.dragging) {
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        group.rotation.y += dx * 0.005;
        group.rotation.x = Math.max(-1.05, Math.min(1.05, group.rotation.x + dy * 0.003));
        lastX = event.clientX;
        lastY = event.clientY;
      }
    });
    canvas.addEventListener('pointerup', event => { state.dragging = false; try { canvas.releasePointerCapture(event.pointerId); } catch (_) {} });
    canvas.addEventListener('pointerleave', () => { state.dragging = false; ui.tooltip.classList.remove('show'); });
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      camera.position.z = Math.max(4.2, Math.min(10.5, camera.position.z + event.deltaY * 0.004));
      state.pausedUntil = performance.now() + 2400;
    }, { passive: false });
    canvas.addEventListener('click', () => {
      if (state.hover && state.hover.userData.row) flashState(state.hover.userData.row.STATE);
    });
    window.addEventListener('resize', resize);
  }

  function bindChapters() {
    const chapters = [...root.querySelectorAll('.globe-chapter')];
    if (!chapters.length) return;

    const activate = chapter => {
      chapters.forEach(item => item.classList.toggle('active', item === chapter));
      setMode(chapter.dataset.mode);
      setYear(chapter.dataset.year);
      state.pausedUntil = performance.now() + 1600;
    };

    activate(chapters[0]);
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) activate(entry.target);
      });
    }, { threshold: 0.55, rootMargin: '-20% 0px -25% 0px' });

    chapters.forEach(chapter => observer.observe(chapter));
  }

  function updateHover() {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(state.points.filter(p => p.visible), false);
    const hit = hits[0] && hits[0].object;
    state.hover = hit || null;
    if (hit && hit.userData.row && !state.dragging) {
      const row = hit.userData.row;
      const rect = canvas.getBoundingClientRect();
      ui.tooltip.innerHTML = `<strong>${row.STATE}</strong><span>${MODE[state.mode].label}: ${format(row)}</span><small>${state.year}</small>`;
      ui.tooltip.style.left = `${(pointer.x + 1) * rect.width / 2 + 16}px`;
      ui.tooltip.style.top = `${(-pointer.y + 1) * rect.height / 2 + 16}px`;
      ui.tooltip.classList.add('show');
      ui.tooltip.classList.remove('fixed');
    } else if (!ui.tooltip.classList.contains('fixed')) {
      ui.tooltip.classList.remove('show');
    }
  }

  function animate(now = 0) {
    requestAnimationFrame(animate);
    if (!state.dragging && now > state.pausedUntil) {
      group.rotation.y += Number(ui.rotationSpeed.value || 0) * 0.0012;
    }
    stars.rotation.y += 0.00008;
    const ps = Number(ui.pulseSpeed.value || 1);
    state.pulses.forEach((item, i) => {
      const t = ((now * 0.00011 * ps) + item.mesh.userData.offset) % 1;
      item.mesh.position.copy(item.curve.getPointAt(t));
      item.mesh.material.opacity = 0.35 + 0.55 * Math.sin(t * Math.PI);
    });
    updateHover();
    renderer.render(scene, camera);
  }

  async function init() {
    resize();
    bindUi();
    bindChapters();
    buildPoints();
    updateVisibility();
    try {
      const text = await fetch('research-map-data.csv').then(r => r.text());
      state.rows = parseCsv(text);
      state.rows.forEach(row => {
        if (!state.byYear.has(row.YEAR)) state.byYear.set(row.YEAR, []);
        state.byYear.get(row.YEAR).push(row);
      });
      updatePoints();
    } catch (err) {
      root.classList.add('globe-error');
      ui.list.innerHTML = '<p>No se pudieron cargar los datos del prólogo.</p>';
    }
    animate();
  }

  init();
})();
