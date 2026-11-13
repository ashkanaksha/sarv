// 02 — The Multiverse of Me.
// Twelve glowing planets sit inside a field of stars. Their arrangement *is* the sarv mark: zoom out and the
// identity appears. A faint neural web of dotted paths runs through everything — one path out of millions was taken.
// Zooming into a planet shows one representative work.
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { THREE, PR, flyTo, killTweens, setBloom, toScreen, glowTexture, pointer, loadImage, sampleMask, isNarrow } from '../core.js';
import { WORLDS, EDGES, LOGO } from '../data.js';
import { $, el, fa, ICON, Labels, openGallery, closeGallery, hint, hideHint } from '../ui.js';

const TAG = 'mv';
const LOGO_H = 150;                    // height of the mark in world units
const LOGO_AR = 583 / 980;             // media/logo.png
const LOGO_W = LOGO_H * LOGO_AR;
const DUST = 52000;

// where each world sits on the sarv mark (u,v in the logo image, 0..1). The path grows like a cypress:
// up the left stem, around the loop, then up the long right stroke to its tip — the present.
const SPOTS = [
  [0.45, 0.91], [0.45, 0.73], [0.40, 0.51], [0.24, 0.45], [0.13, 0.58], [0.27, 0.73],
  [0.57, 0.91], [0.69, 0.77], [0.84, 0.62], [0.83, 0.44], [0.73, 0.28], [0.57, 0.08],
];
const toWorld = (u, v, z = 0) => new THREE.Vector3((u - 0.5) * LOGO_W, (0.5 - v) * LOGO_H, z);

/* ── star material (additive, twinkling, brightens as you zoom out) ── */
const starVS = `
uniform float uTime, uSize, uPR;
attribute float aRand; attribute vec3 color;
varying vec3 vC; varying float vA;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.65 + 0.35 * sin(uTime * (0.5 + aRand * 1.5) + aRand * 60.0);
  gl_PointSize = uSize * uPR * (0.35 + aRand * 0.8) * tw / max(-mv.z, 0.1);
  vC = color; vA = tw;
}`;
const starFS = `
uniform float uOpacity;
varying vec3 vC; varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  gl_FragColor = vec4(vC * pow(1.0 - d * 2.0, 1.7) * vA * uOpacity, 1.0);
}`;
function starPoints(pos, col, size) {
  const n = pos.length / 3, rnd = new Float32Array(n);
  for (let i = 0; i < n; i++) rnd[i] = Math.random();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSize: { value: size }, uPR: { value: PR }, uOpacity: { value: 1 } },
    vertexShader: starVS, fragmentShader: starFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const p = new THREE.Points(g, m); p.frustumCulled = false;
  return p;
}

/* ── planets ─────────────────────────────────────────────── */
const planetVS = `
varying vec3 vN; varying vec3 vW; varying vec2 vUv;
void main(){
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const planetFS = `
uniform sampler2D uMap; uniform float uHasMap, uGlow, uDim, uHi;
uniform vec3 uTint;
varying vec3 vN; varying vec3 vW; varying vec2 vUv;
void main(){
  vec3 base = uHasMap > 0.5 ? texture2D(uMap, vUv).rgb : uTint * 0.35;
  base = mix(base, base * uTint * 1.3, 0.3);
  vec3 L = normalize(vec3(-0.45, 0.55, 0.7));
  float diff = max(dot(vN, L), 0.0);
  vec3 V = normalize(cameraPosition - vW);
  float rim = pow(1.0 - max(dot(vN, V), 0.0), 2.6);
  vec3 col = base * (0.14 + diff * 1.1) + uTint * rim * (uGlow * (0.9 + uHi * 1.4));
  gl_FragColor = vec4(col * uDim, 1.0);
}`;
function planetTexture(img) {
  const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const r = Math.max((W / 2) / img.naturalWidth, H / img.naturalHeight);
  const w = img.naturalWidth * r, h = img.naturalHeight * r;
  g.drawImage(img, (W / 2 - w) / 2, (H - h) / 2, w, h);
  g.save(); g.translate(W, 0); g.scale(-1, 1); g.drawImage(c, 0, 0, W / 2, H, 0, 0, W / 2, H); g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
  return t;
}
const TINTS = ['#f0c9a0', '#cfd8e8', '#e6b98f', '#d9c3a5', '#bcd3c6', '#e8d2b0', '#e7a98e', '#d8cbb8', '#b9b9c9', '#c7dccc', '#e5c0a8', '#d6d0c8'];
const RINGED = new Set(['music', 'bysarv', 'radikal', 'competition']);

function dashedLine(points, opacity, dash = 0.5, gap = 1.1, color = 0xf1e4d2) {
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineDashedMaterial({ color, dashSize: dash, gapSize: gap, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  l.computeLineDistances(); l.frustumCulled = false;
  return l;
}

export default {
  async init(progress) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 2000);
    this.controls = new OrbitControls(this.camera, $('#gl'));
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.06, enablePan: false, minDistance: 10, maxDistance: 320, rotateSpeed: 0.5, zoomSpeed: 0.7 });
    this.controls.enabled = false;

    let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;

    // 1 — star dust shaped like the mark (the identity only shows from far away)
    const logoImg = await loadImage(LOGO);
    const L = sampleMask(logoImg, DUST, LOGO_W, LOGO_H, { depth: 0, res: 600 });
    const dpos = new Float32Array(DUST * 3), dcol = new Float32Array(DUST * 3);
    const warm = new THREE.Color('#f2dcbc'), cool = new THREE.Color('#8494bb'), hot = new THREE.Color('#ffe9cf');
    for (let i = 0; i < DUST; i++) {
      const spread = 1.2 + Math.pow(rnd(), 3) * 7;
      dpos[i * 3] = L.pos[i * 3] + gauss() * spread;
      dpos[i * 3 + 1] = L.pos[i * 3 + 1] + gauss() * spread;
      dpos[i * 3 + 2] = gauss() * (5 + spread * 1.5);
      const c = (rnd() < 0.15 ? hot : warm).clone().lerp(cool, Math.pow(rnd(), 2) * 0.8);
      const k = 0.35 + rnd() * 0.65;
      dcol.set([c.r * k, c.g * k, c.b * k], i * 3);
    }
    this.dust = starPoints(dpos, dcol, 22);
    this.scene.add(this.dust);
    // far stars around everything
    const FAR = 9000, fpos = new Float32Array(FAR * 3), fcol = new Float32Array(FAR * 3);
    for (let i = 0; i < FAR; i++) {
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = 120 + rnd() * 500;
      fpos.set([Math.sqrt(1 - u * u) * Math.cos(th) * r, u * r, Math.sqrt(1 - u * u) * Math.sin(th) * r - 60], i * 3);
      const k = 0.2 + rnd() * 0.5; fcol.set([k, k * 0.96, k * 0.92], i * 3);
    }
    this.far = starPoints(fpos, fcol, 40);
    this.scene.add(this.far);

    // 2 — the neural web: a million possible paths, drawn barely visible and dotted
    const nodes = [];
    for (let i = 0; i < 900; i++) {
      if (i < 700) { const j = (rnd() * DUST) | 0; nodes.push(new THREE.Vector3(dpos[j * 3], dpos[j * 3 + 1], dpos[j * 3 + 2])); }
      else nodes.push(new THREE.Vector3((rnd() - .5) * 220, (rnd() - .5) * 220, (rnd() - .5) * 90));
    }
    const segs = [];
    nodes.forEach((a, i) => {
      nodes.map((b, j) => [j, a.distanceTo(b)]).filter(([j, d]) => j > i && d < 15).sort((x, y) => x[1] - y[1]).slice(0, 2)
        .forEach(([j]) => segs.push(a, nodes[j]));
    });
    const webG = new THREE.BufferGeometry().setFromPoints(segs);
    this.web = new THREE.LineSegments(webG, new THREE.LineDashedMaterial({ color: 0xe9dcc9, dashSize: 0.35, gapSize: 0.9, transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.web.computeLineDistances(); this.web.frustumCulled = false;
    this.scene.add(this.web);
    // web synapses (tiny bright nodes)
    const npos = new Float32Array(nodes.length * 3), ncol = new Float32Array(nodes.length * 3);
    nodes.forEach((v, i) => { npos.set([v.x, v.y, v.z], i * 3); ncol.set([0.5, 0.45, 0.4], i * 3); });
    this.syn = starPoints(npos, ncol, 34);
    this.scene.add(this.syn);

    // 3 — the twelve worlds as glowing planets placed on the mark
    this.planets = [];
    for (let i = 0; i < WORLDS.length; i++) {
      const w = WORLDS[i];
      const pos = toWorld(SPOTS[i][0], SPOTS[i][1], (rnd() - .5) * 8);
      const size = 2.1 + (EDGES.filter(e => e.from === i || e.to === i).length) * 0.12 + (i % 3) * 0.18;
      const tint = new THREE.Color(TINTS[i]);
      const map = w.heroItem ? planetTexture(await loadImage(w.heroItem.thumb)) : null;
      const mat = new THREE.ShaderMaterial({
        uniforms: { uMap: { value: map }, uHasMap: { value: map ? 1 : 0 }, uGlow: { value: 0.9 }, uDim: { value: 1 }, uHi: { value: 0 }, uTint: { value: tint } },
        vertexShader: planetVS, fragmentShader: planetFS,
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 48, 32), mat);
      mesh.rotation.z = 0.25 + (i % 4) * 0.1;
      const g = new THREE.Group(); g.position.copy(pos); g.add(mesh); this.scene.add(g);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: tint, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.scale.setScalar(size * 5); g.add(glow);
      if (RINGED.has(w.id)) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(size * 1.45, size * 2.1, 96),
          new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
        ring.rotation.x = Math.PI / 2 - 0.35; ring.rotation.y = 0.2; g.add(ring);
      }
      this.planets.push({ w, i, g, mesh, glow, mat, size, hi: 0 });
      // each planet is wired into the web
      nodes.map(n => [n, n.distanceTo(pos)]).sort((a, b) => a[1] - b[1]).slice(0, 4)
        .forEach(([n]) => this.scene.add(dashedLine([pos, n], 0.06, 0.3, 0.8)));
      progress && progress();
    }
    // quiet planets without names, scattered around the mark
    for (let k = 0; k < 12; k++) {
      const size = 0.5 + rnd() * 1.1;
      const tint = new THREE.Color().setHSL(0.07 + rnd() * 0.55, 0.12, 0.42);
      const mat = new THREE.ShaderMaterial({
        uniforms: { uMap: { value: null }, uHasMap: { value: 0 }, uGlow: { value: 0.25 }, uDim: { value: 0.8 }, uHi: { value: 0 }, uTint: { value: tint } },
        vertexShader: planetVS, fragmentShader: planetFS,
      });
      const m = new THREE.Mesh(new THREE.SphereGeometry(size, 24, 16), mat);
      const side = k % 2 ? 1 : -1;
      m.position.set(side * (LOGO_W * 0.55 + rnd() * 60), (rnd() - .5) * 170, -10 - rnd() * 60);
      this.scene.add(m);
    }

    // 4 — the path that was actually taken (chronological), and the influences — both faint and dotted
    this.path = new THREE.CatmullRomCurve3(this.planets.map(p => p.g.position.clone()), false, 'centripetal', 0.4);
    this.pathLine = dashedLine(this.path.getPoints(500), 0.16, 0.6, 1.0, 0xf3d9b6);
    this.scene.add(this.pathLine);
    this.pulse = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffe0b8, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.pulse.scale.setScalar(3.2); this.scene.add(this.pulse);
    this.links = EDGES.map(e => {
      const a = this.planets[e.from].g.position, b = this.planets[e.to].g.position;
      const mid = a.clone().add(b).multiplyScalar(0.5); mid.z += 6 + a.distanceTo(b) * 0.25;
      const curve = new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
      const line = dashedLine(curve.getPoints(60), 0.05, 0.4, 1.0, 0xe8c39a);
      this.scene.add(line);
      return { ...e, curve, line, op: 0.05 };
    });

    // labels + rail
    this.labels = new Labels($('#mvLabels'));
    this.planets.forEach(p => {
      p.label = this.labels.add(`<span class="n mono">${p.w.n}</span><span class="t">${p.w.en}</span>${fa(p.w.fa, 'f')}`, 'pl', () => this.enterWorld(p.i));
    });
    this.linkLabels = this.links.map(l => this.labels.add(`${l.k}<span class="sep">·</span>${fa(l.kFa)}`, 'el'));
    const rail = $('#mvRail');
    this.planets.forEach(p => {
      const li = el('li', '', `<button><span class="mono">${p.w.n}</span><span class="t">${p.w.en}</span></button>`);
      li.firstChild.onclick = () => this.enterWorld(p.i);
      li.firstChild.onmouseenter = () => { this.hoverRail = p.i; };
      li.firstChild.onmouseleave = () => { this.hoverRail = -1; };
      rail.append(li);
    });

    // zoom controls
    $('#zoomOut').innerHTML = `${ICON.zoomOut}<span class="zl">Zoom out<span class="sep">·</span>${fa('دور شدن')}</span>`;
    $('#zoomIn').innerHTML = `${ICON.zoomIn}<span class="zl">Zoom in<span class="sep">·</span>${fa('نزدیک شدن')}</span>`;
    $('#zoomOut').onclick = () => this.zoomOut();
    $('#zoomIn').onclick = () => this.zoomIn();

    this.mode = 'galaxy'; this.active = -1; this.hoverRail = -1; this.hoverPick = -1; this.tok = 0; this.dim = 0;
  },

  /* camera poses */
  overview() {
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const d = Math.max((LOGO_H / 2 + 8) / tanH, (LOGO_W / 2 + 10) / (tanH * this.camera.aspect)) * 1.08;
    return { pos: new THREE.Vector3(0, 0, d), target: new THREE.Vector3(0, 0, 0) };
  },
  closeView() {
    const k = Math.max(1, 1.4 / this.camera.aspect);
    return { pos: new THREE.Vector3(30, -38, 112).multiplyScalar(k), target: new THREE.Vector3(-4, -18, 0) };
  },

  enter() {
    setBloom(0.6, 0.5, 0.4);
    this.controls.enabled = true;
    document.body.classList.remove('mv-world');
    this.mode = 'galaxy'; this.active = -1; this.markRail();
    const v = this.closeView();
    this.camera.position.set(80, -160, 260);
    this.controls.target.copy(v.target);
    flyTo(this.camera, this.controls, v.pos, v.target, 3.2, TAG);
    setTimeout(() => document.body.dataset.section === '2' && this.mode === 'galaxy' &&
      hint(`Click a planet to zoom in · zoom out to see the whole <span class="sep">·</span>${fa('برای دیدن کل تصویر دور شوید')}`, 7000), 2600);
  },
  exit() {
    killTweens(TAG); this.tok++;
    this.controls.enabled = false;
    this.mode = 'galaxy'; this.active = -1;
    $('#worldPanel').classList.remove('on');
    $('#worldStage').classList.remove('on');
    document.body.classList.remove('mv-world');
    this.markRail();
  },
  markRail() { [...$('#mvRail').children].forEach((li, i) => li.classList.toggle('on', i === this.active)); },

  async zoomOut() {
    const tok = ++this.tok;
    if (this.mode === 'world') this.mode = 'leaving';
    hideHint();
    const v = this.overview();
    await flyTo(this.camera, this.controls, v.pos, v.target, 2.6, TAG);
    if (tok !== this.tok) return;
    this.mode = 'galaxy'; this.active = -1; this.markRail();
    this.controls.enabled = true;
  },
  zoomIn() {
    // the planet nearest the centre of the screen
    let best = 0, bd = 1e9;
    this.planets.forEach(p => {
      const s = toScreen(p.g.position, this.camera);
      const d = Math.hypot(s.x - innerWidth / 2, s.y - innerHeight / 2);
      if (s.visible && d < bd) { bd = d; best = p.i; }
    });
    this.enterWorld(best);
  },

  /* ── into one world: fly to the planet, then open every photo and film of it ── */
  async enterWorld(i, { fly = true } = {}) {
    if (i < 0 || i >= WORLDS.length) return;
    const tok = ++this.tok;
    this.mode = 'world'; this.active = i;
    this.controls.enabled = false;
    hideHint(); this.markRail();
    const p = this.planets[i];
    const pp = p.g.position.clone();
    const dir = new THREE.Vector3(0.18, 0.08, 1).normalize();
    const target = pp.clone();
    const d = p.size * 7;
    const go = flyTo(this.camera, this.controls, target.clone().add(dir.multiplyScalar(d)), target, fly ? 1.5 : 0.9, TAG);
    if (fly) await new Promise(r => setTimeout(r, 900));
    if (tok !== this.tok) return;
    if (!fly) return;
    openGallery(i, {
      inSpace: true,
      extra: `<span class="ml-text"><span>For more details, go to the next section</span>${fa('برای جزییات بیشتر به بخش بعدی بروید')}</span>
              <span class="ml-go"><span class="mono">03</span> Connecting the Dots ${ICON.arrowR}</span>`,
      onExtra: wi => window.dispatchEvent(new CustomEvent('goto-section', { detail: { section: 2, focus: wi } })),
      onNav: ni => { this.active = ni; this.markRail(); this.enterWorld(ni, { fly: false, reopen: false }); },
      onClose: () => { if (document.body.dataset.section === '2') this.zoomOut(); },
    });
    await go;
  },

  /* ── picking & input ──────────────────────────────────── */
  pxRadius(pos, r) {
    const dist = this.camera.position.distanceTo(pos);
    return r / (dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))) * innerHeight * 0.5;
  },
  pick() {
    let best = -1, bd = 1e9;
    this.planets.forEach(p => {
      const s = toScreen(p.g.position, this.camera);
      if (!s.visible) return;
      const d = Math.hypot(s.x - pointer.x, s.y - pointer.y);
      if (d < Math.max(this.pxRadius(p.g.position, p.size) * 1.4, 22) && d < bd) { bd = d; best = p.i; }
    });
    return best;
  },
  onPointerMove() {
    if (this.mode !== 'galaxy') return;
    this.hoverPick = this.pick();
    $('#gl').style.cursor = this.hoverPick >= 0 ? 'pointer' : '';
  },
  onClick() {
    if (this.mode !== 'galaxy') return;
    const h = this.pick();
    if (h >= 0) this.enterWorld(h);
  },
  onKey(e) {
    if (e.key === '-' || e.key === '_') { this.zoomOut(); return true; }
    if (e.key === '+' || e.key === '=') { this.zoomIn(); return true; }
    if (this.mode === 'world') {
      if (e.key === 'ArrowRight') { this.enterWorld(Math.min(WORLDS.length - 1, this.active + 1)); return true; }
      if (e.key === 'ArrowLeft') { this.enterWorld(Math.max(0, this.active - 1)); return true; }
      if (e.key === 'Escape') { closeGallery(); return true; }
    }
    if (this.mode === 'galaxy' && e.key === 'Enter') { this.enterWorld(0); return true; }
    return false;
  },

  /* ── frame ────────────────────────────────────────────── */
  update(dt, t) {
    this.controls.update();
    const dist = this.camera.position.distanceTo(this.controls.target);
    const far = THREE.MathUtils.smoothstep(dist, 70, 190);       // 0 close … 1 whole mark visible
    this.dim += ((this.mode === 'world' ? 1 : 0) - this.dim) * Math.min(1, dt * 2.5);
    [this.dust, this.far, this.syn].forEach(s => (s.material.uniforms.uTime.value = t));
    this.dust.material.uniforms.uOpacity.value = (0.55 + far * 0.9) * (1 - this.dim * 0.55);
    this.dust.material.uniforms.uSize.value = 22 + far * 26;
    this.far.material.uniforms.uOpacity.value = 1 - this.dim * 0.5;
    this.syn.material.uniforms.uOpacity.value = (0.6 - far * 0.3) * (1 - this.dim * 0.6);
    this.web.material.opacity = (0.07 - far * 0.03) * (1 - this.dim * 0.6);
    this.pathLine.material.opacity = (0.16 + far * 0.06) * (1 - this.dim * 0.5);

    const u = (t * 0.035) % 1;
    this.pulse.position.copy(this.path.getPointAt(u));
    this.pulse.material.opacity = 0.75 * Math.sin(u * Math.PI) * (1 - this.dim * 0.7);
    this.pulse.scale.setScalar(2.4 + far * 3);

    const focus = this.mode === 'world' ? this.active : (this.hoverRail >= 0 ? this.hoverRail : this.hoverPick);
    const nb = new Set();
    if (focus >= 0) { nb.add(focus); EDGES.forEach(e => { if (e.from === focus) nb.add(e.to); if (e.to === focus) nb.add(e.from); }); }

    this.planets.forEach(p => {
      p.hi += ((p.i === focus ? 1 : 0) - p.hi) * Math.min(1, dt * 6);
      p.mesh.rotation.y += dt * 0.12;
      p.mat.uniforms.uHi.value = p.hi;
      const vis = focus < 0 || nb.has(p.i) ? 1 : 0.4;
      const ud = p.mat.uniforms.uDim; ud.value += (vis - ud.value) * Math.min(1, dt * 5);
      p.glow.material.opacity = (0.5 + p.hi * 0.4) * ud.value;
      p.glow.scale.setScalar(p.size * (4.6 + p.hi * 1.6 + far * 1.2 + Math.sin(t * 1.6 + p.i) * 0.2));
      const s = toScreen(p.g.position, this.camera);
      const rpx = this.pxRadius(p.g.position, p.size);
      const a = s.visible && this.mode === 'galaxy' ? (focus < 0 || nb.has(p.i) ? 1 - far * 0.25 : 0.35) : 0;
      p.label.e.classList.toggle('hi', p.i === focus);
      p.label.e.classList.toggle('small', far > 0.6);
      this.labels.place(p.label, s.x + rpx + 10, s.y - 9, a);
    });

    this.links.forEach((l, k) => {
      const on = focus >= 0 && (l.from === focus || l.to === focus);
      const target = focus < 0 ? 0.05 : on ? 0.3 : 0.015;
      l.op += (target - l.op) * Math.min(1, dt * 5);
      l.line.material.opacity = l.op * (this.mode === 'world' ? 0.6 : 1);
      const ms = toScreen(l.curve.getPoint(0.5), this.camera);
      this.labels.place(this.linkLabels[k], ms.x, ms.y, on && this.mode === 'galaxy' && ms.visible ? 1 : 0);
    });
    $('#zoomCtl').classList.toggle('far', far > 0.9 && this.mode === 'galaxy');
  },
  resize() { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); },
};
