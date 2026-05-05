(() => {
  const root = document.getElementById('globe-hero');
  const canvas = document.getElementById('globe-canvas');
  if (!root || !canvas || !window.THREE) return;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('load', () => {
    if (!window.location.hash) requestAnimationFrame(() => window.scrollTo(0, 0));
  });

  const stage = root.querySelector('.globe-stage') || root;
  const ui = {
    title: document.getElementById('globe-stage-title'),
    kicker: document.getElementById('globe-stage-kicker'),
    summary: document.getElementById('globe-stage-summary'),
    statline: document.getElementById('globe-statline'),
    tooltip: document.getElementById('globe-tooltip')
  };

  const REGIONS = {
    europe: {
      title: 'Europa',
      kicker: 'TFR · hijos por mujer',
      summary: 'Unión Europea, Suiza y países nórdicos incluidos.',
      center: { lat: 52, lon: 12 },
      cameraZ: 5.9,
      colorA: 0x2f6df6,
      colorB: 0xffd26a
    },
    east_asia: {
      title: 'Asia oriental',
      kicker: 'TFR · hijos por mujer',
      summary: 'Corea del Sur, China y Japón en la zona de fecundidad más baja del recorrido.',
      center: { lat: 36, lon: 126 },
      cameraZ: 5.6,
      colorA: 0x37d8ff,
      colorB: 0xff5f8f
    },
    united_states: {
      title: 'Estados Unidos',
      kicker: 'TFR estatal estimada · hijos por mujer',
      summary: 'Cada punto representa un estado o Washington D. C., calculado desde las tasas específicas por edad del panel.',
      center: { lat: 39, lon: -98 },
      cameraZ: 5.7,
      colorA: 0x5c7cff,
      colorB: 0xa5df92
    },
    title: {
      title: 'Del mapa al reportaje',
      kicker: 'Reportaje de datos',
      summary: 'El mapa deja paso al texto: ocio digital, tiempo fuera de casa y maternidad aplazada.',
      center: { lat: 32, lon: -25 },
      cameraZ: 6.6,
      colorA: 0x30c0c0,
      colorB: 0xffffff
    }
  };

  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1000);
  camera.position.set(0, 0, 6.2);

  const group = new THREE.Group();
  scene.add(group);

  scene.add(new THREE.AmbientLight(0x56677d, 1.05));
  const sun = new THREE.DirectionalLight(0xffffff, 1.45);
  sun.position.set(4, 2.4, 5);
  scene.add(sun);

  const R = 2.05;
  const earthMat = new THREE.MeshPhongMaterial({
    color: 0x0b1727,
    shininess: 18,
    emissive: 0x050912,
    emissiveIntensity: 0.35
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 72, 72), earthMat);
  group.add(earth);

  new THREE.TextureLoader().load('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg', tex => {
    tex.anisotropy = 4;
    earthMat.map = tex;
    earthMat.color.setHex(0xffffff);
    earthMat.needsUpdate = true;
  }, undefined, () => {});

  const wire = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.004, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x5ab8ff, wireframe: true, transparent: true, opacity: 0.09 })
  );
  group.add(wire);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.09, 72, 72),
    new THREE.MeshBasicMaterial({ color: 0x42d9ff, transparent: true, opacity: 0.08, side: THREE.BackSide, blending: THREE.AdditiveBlending })
  );
  group.add(glow);

  const pointGroup = new THREE.Group();
  const arcGroup = new THREE.Group();
  const pulseGroup = new THREE.Group();
  group.add(arcGroup, pulseGroup, pointGroup);

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
  let globalMin = 0.7;
  let globalMax = 2.1;
  const state = {
    activeRegion: 'europe',
    rows: [],
    points: [],
    pulses: [],
    targetRotation: regionRotation(REGIONS.europe.center),
    targetCameraZ: REGIONS.europe.cameraZ,
    pausedUntil: 0
  };
  group.rotation.set(state.targetRotation.x, state.targetRotation.y, 0);
  camera.position.z = state.targetCameraZ;

  function regionRotation(center) {
    return {
      x: Math.max(-0.75, Math.min(0.35, -center.lat * Math.PI / 520)),
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
    const t = (row.tfr - globalMin) / Math.max(globalMax - globalMin, 0.001);
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
    ui.summary.textContent = cfg.summary;
    ui.statline.innerHTML = topBottomText(rows);
  }

  function buildPoints() {
    clearGroup(pointGroup);
    state.points = [];
    state.rows.forEach(row => {
      const pos = latLonToVec(row.lat, row.lon, R * 1.035);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.037, 16, 16),
        new THREE.MeshPhongMaterial({
          color: 0x30c0c0,
          emissive: 0x30c0c0,
          emissiveIntensity: 1.9,
          transparent: true,
          opacity: 0.92
        })
      );
      mesh.position.copy(pos);
      mesh.userData.row = row;
      pointGroup.add(mesh);
      state.points.push(mesh);
    });
  }

  function rebuildArcs(rows) {
    clearGroup(arcGroup);
    clearGroup(pulseGroup);
    state.pulses = [];
    if (state.activeRegion === 'title' || rows.length < 2) return;

    const cfg = REGIONS[state.activeRegion] || REGIONS.europe;
    const sorted = [...rows].sort((a, b) => b.tfr - a.tfr);
    const top = sorted.slice(0, Math.min(7, sorted.length));
    const bottom = sorted.slice(-Math.min(7, sorted.length)).reverse();

    top.forEach((a, i) => {
      const b = bottom[i % bottom.length];
      if (!a || !b || a.id === b.id) return;
      const start = latLonToVec(a.lat, a.lon, R * 1.026);
      const end = latLonToVec(b.lat, b.lon, R * 1.026);
      const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(R * (1.42 + i * 0.03));
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const color = colorFor(a, cfg);
      const geom = new THREE.TubeGeometry(curve, 52, 0.008, 8, false);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false });
      arcGroup.add(new THREE.Mesh(geom, mat));

      const pulse = new THREE.Mesh(
        new THREE.SphereGeometry(0.034, 12, 12),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
      );
      pulse.userData.offset = i / Math.max(top.length, 1);
      pulseGroup.add(pulse);
      state.pulses.push({ curve, mesh: pulse });
    });
  }

  function updatePoints() {
    const cfg = REGIONS[state.activeRegion] || REGIONS.europe;
    const activeRows = rowsFor(state.activeRegion);
    const activeIds = new Set(activeRows.map(row => row.id));
    const showAll = state.activeRegion === 'title';

    state.points.forEach(mesh => {
      const row = mesh.userData.row;
      const active = showAll || activeIds.has(row.id);
      mesh.visible = active;
      if (!active) return;
      const color = colorFor(row, cfg);
      const t = (row.tfr - globalMin) / Math.max(globalMax - globalMin, 0.001);
      const base = row.type === 'state' ? 0.026 : 0.041;
      const scale = showAll ? 0.75 : 1 + Math.max(0, Math.min(1, t)) * 1.2;
      mesh.scale.setScalar(scale * base / 0.037);
      mesh.material.color.copy(color);
      mesh.material.emissive.copy(color);
      mesh.material.opacity = showAll ? 0.45 : 0.94;
    });

    updateHud();
    rebuildArcs(activeRows);
  }

  function activateRegion(region) {
    if (!REGIONS[region]) return;
    state.activeRegion = region;
    root.dataset.region = region;
    document.querySelectorAll('.globe-chapter').forEach(chapter => {
      chapter.classList.toggle('active', chapter.dataset.region === region);
    });
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

  function bindChapters() {
    const chapters = [...root.querySelectorAll('.globe-chapter')];
    if (!chapters.length) return;
    activateRegion(chapters[0].dataset.region || 'europe');
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) activateRegion(entry.target.dataset.region);
      });
    }, { threshold: 0.58, rootMargin: '-18% 0px -30% 0px' });

    chapters.forEach(chapter => observer.observe(chapter));
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

  function flashHover() {
    if (!hover) return;
    hover.scale.multiplyScalar(1.55);
    setTimeout(updatePoints, 240);
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
        group.rotation.x = Math.max(-1.05, Math.min(0.75, group.rotation.x + dy * 0.003));
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
    canvas.addEventListener('click', flashHover);
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
      const lerp = now > state.pausedUntil ? 0.035 : 0.02;
      group.rotation.x += (state.targetRotation.x - group.rotation.x) * lerp;
      group.rotation.y += (state.targetRotation.y - group.rotation.y) * lerp;
      camera.position.z += (state.targetCameraZ - camera.position.z) * 0.035;
    }
    stars.rotation.y += 0.00008;
    state.pulses.forEach((item, i) => {
      const t = ((now * 0.00016) + item.mesh.userData.offset) % 1;
      item.mesh.position.copy(item.curve.getPointAt(t));
      item.mesh.material.opacity = 0.35 + 0.55 * Math.sin(t * Math.PI);
    });
    updateHover();
    renderer.render(scene, camera);
  }

  async function init() {
    resize();
    bindPointer();
    window.addEventListener('resize', resize);
    try {
      const data = await fetch('data/tfr-globe-data.json?v=tfr-scrolly-1').then(r => r.json());
      state.rows = data.points || [];
      const values = state.rows.map(row => row.tfr).filter(Number.isFinite);
      globalMin = Math.min(...values);
      globalMax = Math.max(...values);
      buildPoints();
      bindChapters();
      updatePoints();
    } catch (err) {
      root.classList.add('globe-error');
      ui.summary.textContent = 'No se pudieron cargar los datos de fecundidad total.';
    }
    animate();
  }

  init();
})();
