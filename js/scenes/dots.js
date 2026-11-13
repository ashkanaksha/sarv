// 03 — Connecting the Dots.
// The worlds sit on a line of time (past → present). Each influence rises as an arc from the earlier world
// to the later one: the dots only connect looking backwards. Click a dot to see what shaped it and what it led to,
// or play the story to walk through every connection one by one.
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { THREE, Cloud, sampleDust, sampleSphere, loadImage, flyTo, tween, killTweens, setBloom, toScreen, glowTexture, pointer, isNarrow, EASE } from '../core.js';
import { WORLDS, EDGES } from '../data.js';
import { $, el, fa, ICON, Labels, openGallery, hint, hideHint } from '../ui.js';

const TAG = 'dots';
const SEG = 90;
const FPE = 6;                       // flowing particles per arc
const STORY = [...EDGES].sort((a, b) => a.to - b.to || a.from - b.from);

function nodePos(i) {
  const n = WORLDS.length;
  const x = (i - (n - 1) / 2) * 10.5;
  return new THREE.Vector3(x, Math.sin(i * 0.95) * 3.2 - 6, Math.cos(i * 0.7) * 4);
}

function discTexture(img, label) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.save(); g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 10, 0, Math.PI * 2); g.clip();
  if (img) {
    const r = Math.max(S / img.naturalWidth, S / img.naturalHeight);
    g.drawImage(img, (S - img.naturalWidth * r) / 2, (S - img.naturalHeight * r) / 2, img.naturalWidth * r, img.naturalHeight * r);
  } else {
    g.fillStyle = '#101010'; g.fillRect(0, 0, S, S);
    g.fillStyle = 'rgba(236,232,225,.7)'; g.font = '300 42px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(label, S / 2, S / 2);
  }
  g.restore();
  g.strokeStyle = 'rgba(245,238,228,.9)'; g.lineWidth = 3;
  if (!img) g.setLineDash([10, 9]);
  g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 8, 0, Math.PI * 2); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export default {
  async init(progress) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 800);
    this.controls = new OrbitControls(this.camera, $('#gl'));
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.06, enablePan: false, minDistance: 12, maxDistance: 220, rotateSpeed: 0.45, zoomSpeed: 0.6 });
    this.controls.enabled = false;

    const dust = new Cloud(7000, { size: 6, noise: 0.5, additive: true });
    dust.set(sampleDust(7000, 260, 150, 200, { alpha: 0.45 }));
    this.dust = dust; this.scene.add(dust.points);

    // time axis: dotted line through the dots
    this.P = WORLDS.map((_, i) => nodePos(i));
    this.axisEnds = [this.P[0].clone().add(new THREE.Vector3(-14, 0, 0)), this.P[11].clone().add(new THREE.Vector3(14, 0, 0))];
    const axis = new THREE.CatmullRomCurve3([this.axisEnds[0], ...this.P, this.axisEnds[1]]);
    const axisLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(axis.getPoints(400)),
      new THREE.LineDashedMaterial({ color: 0xf1e4d2, dashSize: 0.5, gapSize: 0.8, transparent: true, opacity: 0.22, depthWrite: false }));
    axisLine.computeLineDistances(); this.scene.add(axisLine);

    // dots
    this.nodes = [];
    for (let i = 0; i < WORLDS.length; i++) {
      const w = WORLDS[i];
      const deg = EDGES.filter(e => e.from === i || e.to === i).length;
      const img = w.heroItem ? await loadImage(w.heroItem.thumb) : null;
      const g = new THREE.Group(); g.position.copy(this.P[i]); this.scene.add(g);
      const size = 3 + deg * 0.2;
      const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTexture(img, 'listen :)'), transparent: true, depthWrite: false }));
      disc.scale.setScalar(size); disc.renderOrder = 2; g.add(disc);
      const halo = new Cloud(600, { size: 5, noise: 0.22, additive: true });
      halo.set(sampleSphere(600, size * 0.9, { color: [1, 0.86, 0.7], alpha: 0.4, gauss: false }));
      g.add(halo.points);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffe3c4, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.scale.setScalar(size * 2.6); g.add(glow);
      this.nodes.push({ g, disc, halo, glow, size, vis: 1, show: 1, deg });
      progress && progress();
    }

    // influence arcs: rise from the earlier world to the later one
    this.edges = EDGES.map((e, k) => {
      const a = this.P[e.from], b = this.P[e.to];
      const span = Math.abs(e.to - e.from);
      const side = k % 2 ? 1 : -1;
      const mid = a.clone().add(b).multiplyScalar(0.5).add(new THREE.Vector3(0, 5 + span * 3.2, side * (2 + span * 1.1)));
      const curve = new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(SEG));
      const col = new Float32Array((SEG + 1) * 3);
      for (let j = 0; j <= SEG; j++) { const v = 0.35 + 0.65 * (j / SEG); col.set([v, v * 0.88, v * 0.74], j * 3); }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
      line.frustumCulled = false; this.scene.add(line);
      return { ...e, k, curve, line, geo, op: 0.35, drawn: 1, mid: curve.getPoint(0.5) };
    });
    this.flowN = this.edges.length * FPE;
    this.flowG = new THREE.BufferGeometry();
    this.flowG.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.flowN * 3), 3));
    this.flowG.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.flowN * 3), 3));
    const flow = new THREE.Points(this.flowG, new THREE.PointsMaterial({ size: 0.75, map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    flow.frustumCulled = false; this.scene.add(flow);

    // labels
    this.labels = new Labels($('#dotLabels'));
    this.nodes.forEach((nd, i) => {
      const w = WORLDS[i];
      nd.label = this.labels.add(`<span class="n mono">${w.n}${w.year ? ' · ' + w.year : ''}</span><span class="t">${w.en}</span>`, 'nl', () => this.focusNode(i));
    });
    this.edges.forEach(ed => { ed.label = this.labels.add(`${ed.k}<span class="sep">·</span>${fa(ed.kFa)}`, 'el'); });
    this.endLabels = [
      this.labels.add(`<span class="mono">past</span><span class="sep">·</span>${fa('گذشته')}`, 'tl'),
      this.labels.add(`<span class="mono">present</span><span class="sep">·</span>${fa('اکنون')}`, 'tl'),
    ];

    this.focus = -1; this.hover = -1; this.showAll = false; this.story = -1;
    this.storyBtn(false);
    $('#btnAllEdges').innerHTML = `${ICON.link}<span>All links</span>`;
    $('#btnMatrix').innerHTML = `${ICON.grid}<span>Side by side</span>`;
    $('#btnStory').onclick = () => (this.story >= 0 ? this.stopStory() : this.storyStep(0));
    $('#btnAllEdges').onclick = () => { this.showAll = !this.showAll; $('#btnAllEdges').classList.toggle('on', this.showAll); };
    $('#btnMatrix').onclick = () => this.openMatrix();
  },

  storyBtn(on) {
    const b = $('#btnStory');
    b.classList.toggle('on', on);
    b.innerHTML = on ? `${ICON.close}<span>End story</span>` : `${ICON.play}<span>Play the story</span>${fa('روایت', 'bfa')}`;
  },

  home() {
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const d = Math.max(42 / tanH, 72 / (tanH * this.camera.aspect));
    return { pos: new THREE.Vector3(0, 10, d), target: new THREE.Vector3(0, 6, 0) };
  },

  enter() {
    setBloom(0.45, 0.4, 0.8);
    this.controls.enabled = true;
    const h = this.home();
    this.camera.position.copy(h.pos).add(new THREE.Vector3(0, 30, 60));
    this.controls.target.copy(h.target);
    flyTo(this.camera, this.controls, h.pos, h.target, 2.6, TAG);
    // reveal: dots appear one by one along time, then the arcs draw themselves in
    this.nodes.forEach(nd => (nd.show = 0));
    this.edges.forEach(ed => { ed.drawn = 0; ed.geo.setDrawRange(0, 0); });
    this.nodes.forEach((nd, i) => tween(0.6, v => (nd.show = v), { delay: 0.5 + i * 0.12, tag: TAG, ease: EASE.out }));
    STORY.forEach((s, k) => {
      const e = this.edges.find(x => x.from === s.from && x.to === s.to);
      tween(1.1, v => { e.drawn = v; e.geo.setDrawRange(0, Math.ceil(v * (SEG + 1))); }, { delay: 2.2 + k * 0.09, tag: TAG, ease: EASE.inOut });
    });
    if (this.pendingFocus != null) {
      const i = this.pendingFocus; this.pendingFocus = null;
      setTimeout(() => document.body.dataset.section === '3' && this.focusNode(i), 2300);
    } else {
      setTimeout(() => document.body.dataset.section === '3' && this.focus < 0 && this.story < 0 &&
        hint(`Click any dot · or play the story <span class="sep">·</span>${fa('روی هر نقطه کلیک کنید')}`, 6000), 3600);
    }
  },
  exit() {
    killTweens(TAG);
    this.controls.enabled = false;
    this.stopStory(true);
    this.unfocus(true);
    $('#matrix').classList.remove('on');
    this.edges.forEach(ed => { ed.drawn = 1; ed.geo.setDrawRange(0, SEG + 1); });
    this.nodes.forEach(nd => (nd.show = 1));
  },

  neighbours(i) {
    const s = new Set([i]);
    EDGES.forEach(e => { if (e.from === i) s.add(e.to); if (e.to === i) s.add(e.from); });
    return s;
  },

  /* frame a set of points, leaving room for the panel on the right */
  frame(points, dur = 1.5, panelSide = true) {
    const c = points.reduce((a, v) => a.add(v), new THREE.Vector3()).divideScalar(points.length);
    const r = Math.max(8, ...points.map(v => v.distanceTo(c)));
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const side = panelSide && !isNarrow();
    const usable = side ? 0.58 : 1;
    const d = Math.max((r + 6) / tanH, (r + 6) / (tanH * this.camera.aspect * usable)) * 1.05;
    const shift = side ? d * tanH * this.camera.aspect * 0.32 : 0;
    const down = isNarrow() ? (panelSide ? -r * 0.7 : -r * 0.4) : (panelSide ? 0 : -r * 0.25);
    const target = c.clone().add(new THREE.Vector3(shift, down, 0));
    const dir = new THREE.Vector3(0, 0.22, 1).normalize();
    return flyTo(this.camera, this.controls, target.clone().add(dir.multiplyScalar(d)), target, dur, TAG);
  },

  /* ── focus a world ────────────────────────────────────── */
  focusNode(i) {
    if (!(i >= 0 && i < WORLDS.length)) return;
    if (this.story >= 0) this.stopStory(true);
    hideHint();
    this.focus = i;
    this.frame([...this.neighbours(i)].map(k => this.P[k].clone()));
    this.renderPanel();
  },
  unfocus(instant) {
    const was = this.focus >= 0;
    this.focus = -1;
    $('#dotPanel').classList.remove('on');
    if (!instant && was) { const h = this.home(); flyTo(this.camera, this.controls, h.pos, h.target, 1.5, TAG); }
  },

  item(wi, e) {
    const w = WORLDS[wi];
    const b = el('button', 'dcard');
    b.innerHTML = `
      <span class="dc-img">${w.heroItem ? `<img src="${w.heroItem.thumb}" alt="">` : ''}</span>
      <span class="dc-body">
        <span class="dc-top"><span class="mono">${w.n}</span><span class="nm">${w.en}</span></span>
        <span class="chip">${e.k}<span class="sep">·</span>${fa(e.kFa)}</span>
        <span class="txt">${e.text}</span>
        <span class="txt">${fa(e.textFa)}</span>
      </span>`;
    b.onclick = () => this.focusNode(wi);
    return b;
  },
  renderPanel() {
    const i = this.focus, w = WORLDS[i];
    const ins = EDGES.filter(e => e.to === i), outs = EDGES.filter(e => e.from === i);
    const p = $('#dotPanel');
    p.innerHTML = `
      <div class="wp-head">
        <span class="mono idx">${w.n} <span class="of">/ ${String(WORLDS.length).padStart(2, '0')}</span>${w.year ? ` · ${w.year}` : ''}</span>
        <button class="ic dp-close" aria-label="Close">${ICON.close}</button>
      </div>
      <div class="dp-hero">${w.heroItem ? `<img src="${w.heroItem.thumb}" alt="">` : `<span>${fa('به توضیحات گوش بدین :)')}</span>`}</div>
      <h2>${w.en}</h2>${fa(w.fa, 'title-fa')}
      <p class="blurb">${w.blurb}</p>
      <div class="dp-sec in"><span class="lh"><i></i>Shaped by<span class="sep">·</span>${fa('برگرفته از')}</span></div>
      <div class="dp-sec out"><span class="lh"><i></i>Led to<span class="sep">·</span>${fa('منجر شد به')}</span></div>
      <div class="dp-actions">
        <button class="pill dp-enter">${ICON.enter}<span>Enter world</span></button>
        <div class="dp-step">
          <button class="ic dp-prev" aria-label="Previous world">${ICON.prev}</button>
          <button class="ic dp-next" aria-label="Next world">${ICON.next}</button>
        </div>
      </div>`;
    const sin = $('.dp-sec.in', p), sout = $('.dp-sec.out', p);
    ins.forEach(e => sin.append(this.item(e.from, e)));
    outs.forEach(e => sout.append(this.item(e.to, e)));
    if (!ins.length) sin.append(el('p', 'none', `The beginning<span class="sep">·</span>${fa('نقطه‌ی شروع')}`));
    if (!outs.length) sout.append(el('p', 'none', `Still unfolding<span class="sep">·</span>${fa('هنوز ادامه دارد')}`));
    $('.dp-close', p).onclick = () => this.unfocus();
    $('.dp-enter', p).onclick = () => openGallery(i);
    $('.dp-prev', p).onclick = () => this.focusNode((i - 1 + WORLDS.length) % WORLDS.length);
    $('.dp-next', p).onclick = () => this.focusNode((i + 1) % WORLDS.length);
    p.scrollTop = 0;
    p.classList.remove('on'); void p.offsetWidth; p.classList.add('on');
  },

  /* ── story mode: one connection at a time ─────────────── */
  storyStep(k) {
    if (k < 0) return;
    if (k >= STORY.length) { this.stopStory(); return; }
    if (this.focus >= 0) this.unfocus(true);
    hideHint();
    this.story = k;
    this.storyBtn(true);
    const e = STORY[k], a = WORLDS[e.from], b = WORLDS[e.to];
    const ed = this.edges.find(x => x.from === e.from && x.to === e.to);
    this.frame([this.P[e.from].clone(), this.P[e.to].clone(), ed.mid.clone()], 1.6, false);
    const s = $('#storyCap');
    const thumb = w => (w.heroItem ? `<img src="${w.heroItem.thumb}" alt="">` : '<i></i>');
    s.innerHTML = `
      <div class="sc-top">
        <span class="mono prog">${String(k + 1).padStart(2, '0')} / ${STORY.length}</span>
        <div class="sc-bar"><i style="width:${(k + 1) / STORY.length * 100}%"></i></div>
        <button class="ic sc-close" aria-label="End story">${ICON.close}</button>
      </div>
      <div class="sc-pair">
        <span class="sc-w">${thumb(a)}<span><span class="mono">${a.n}</span>${a.en}</span></span>
        <span class="sc-arrow"><span class="chip">${e.k}<span class="sep">·</span>${fa(e.kFa)}</span><span class="ar">${ICON.arrowR}</span></span>
        <span class="sc-w">${thumb(b)}<span><span class="mono">${b.n}</span>${b.en}</span></span>
      </div>
      <p class="sc-en">${e.text}</p>
      <p class="sc-fa">${fa(e.textFa)}</p>
      <div class="sc-nav">
        <button class="ic sc-prev" aria-label="Previous" ${k === 0 ? 'disabled' : ''}>${ICON.prev}</button>
        <button class="ic sc-next" aria-label="Next">${ICON.next}</button>
      </div>`;
    $('.sc-prev', s).onclick = () => this.storyStep(k - 1);
    $('.sc-next', s).onclick = () => this.storyStep(k + 1);
    $('.sc-close', s).onclick = () => this.stopStory();
    s.classList.add('on');
  },
  stopStory(instant) {
    const was = this.story >= 0;
    this.story = -1;
    $('#storyCap').classList.remove('on');
    this.storyBtn(false);
    if (was && !instant) { const h = this.home(); flyTo(this.camera, this.controls, h.pos, h.target, 1.5, TAG); }
  },

  /* ── everything side by side ──────────────────────────── */
  openMatrix() {
    const m = $('#matrix');
    m.innerHTML = `
      <div class="mx-head">
        <span class="mono">03</span><h2>All worlds, side by side</h2>${fa('همه‌ی جهان‌ها، کنار هم')}
        <button class="ic mx-close" aria-label="Close">${ICON.close}</button>
      </div>
      <div class="mx-wrap"><svg class="mx-svg"></svg><div class="mx-grid"></div></div>`;
    const grid = $('.mx-grid', m);
    WORLDS.forEach((w, i) => {
      const c = el('button', 'mx-card');
      c.innerHTML = `<div class="mx-img">${w.heroItem ? `<img src="${w.heroItem.thumb}" alt="">` : `<span class="soon">${fa('گوش بدین :)')}</span>`}</div>
        <div class="mx-meta"><span class="mono">${w.n}</span><span>${w.en}</span></div>`;
      c.onmouseenter = () => this.mxHighlight(i);
      c.onmouseleave = () => this.mxHighlight(-1);
      c.onclick = () => { m.classList.remove('on'); this.focusNode(i); };
      grid.append(c);
    });
    $('.mx-close', m).onclick = () => m.classList.remove('on');
    m.classList.add('on');
    requestAnimationFrame(() => this.drawMatrix());
  },
  drawMatrix() {
    const m = $('#matrix'); if (!m.classList.contains('on')) return;
    const svg = $('.mx-svg', m), wrap = $('.mx-wrap', m);
    const R = wrap.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${R.width} ${R.height}`);
    const cards = [...m.querySelectorAll('.mx-card')].map(c => {
      const r = c.getBoundingClientRect();
      return { x: r.left - R.left + r.width / 2, y: r.top - R.top + r.height * 0.42 };
    });
    svg.innerHTML = EDGES.map((e, k) => {
      const a = cards[e.from], b = cards[e.to];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - Math.abs(a.x - b.x) * 0.18 - 20;
      return `<path data-f="${e.from}" data-t="${e.to}" d="M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}" />
              <circle r="2.2" data-f="${e.from}" data-t="${e.to}"><animateMotion dur="${3 + (k % 4)}s" repeatCount="indefinite" path="M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}"/></circle>`;
    }).join('');
  },
  mxHighlight(i) {
    const m = $('#matrix');
    m.classList.toggle('hl', i >= 0);
    m.querySelectorAll('.mx-svg [data-f]').forEach(p => p.classList.toggle('on', i >= 0 && (+p.dataset.f === i || +p.dataset.t === i)));
    const nb = i >= 0 ? this.neighbours(i) : null;
    m.querySelectorAll('.mx-card').forEach((c, k) => c.classList.toggle('dim', !!nb && !nb.has(k)));
  },

  /* ── input ────────────────────────────────────────────── */
  rpx(nd) {
    const dist = this.camera.position.distanceTo(nd.g.position);
    return nd.size * 0.5 / (dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))) * innerHeight * 0.5;
  },
  pick() {
    let best = -1, bd = 1e9;
    this.nodes.forEach((nd, i) => {
      const s = toScreen(nd.g.position, this.camera);
      if (!s.visible) return;
      const d = Math.hypot(s.x - pointer.x, s.y - pointer.y);
      if (d < Math.max(this.rpx(nd) * 1.1, 18) && d < bd) { bd = d; best = i; }
    });
    return best;
  },
  onPointerMove() { this.hover = this.pick(); $('#gl').style.cursor = this.hover >= 0 ? 'pointer' : ''; },
  onClick() {
    const h = this.pick();
    if (h >= 0) this.focusNode(h);
    else if (this.focus >= 0) this.unfocus();
  },
  onKey(e) {
    if (e.key === 'Escape') {
      if ($('#matrix').classList.contains('on')) { $('#matrix').classList.remove('on'); return true; }
      if (this.story >= 0) { this.stopStory(); return true; }
      if (this.focus >= 0) { this.unfocus(); return true; }
    }
    if (this.story >= 0 && (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === ' ')) {
      this.storyStep(this.story + (e.key === 'ArrowLeft' ? -1 : 1));
      return true;
    }
    if (this.focus >= 0 && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      this.focusNode((this.focus + (e.key === 'ArrowRight' ? 1 : -1) + WORLDS.length) % WORLDS.length);
      return true;
    }
    if (e.key === 's' || e.key === 'S') { this.story >= 0 ? this.stopStory() : this.storyStep(0); return true; }
    return false;
  },

  /* ── frame ────────────────────────────────────────────── */
  update(dt, t) {
    this.controls.update();
    this.dust.update(t, dt);
    const storyEdge = this.story >= 0 ? STORY[this.story] : null;
    const f = this.focus >= 0 ? this.focus : (storyEdge ? -1 : this.hover);
    const nb = f >= 0 ? this.neighbours(f) : storyEdge ? new Set([storyEdge.from, storyEdge.to]) : null;

    this.nodes.forEach((nd, i) => {
      const target = !nb ? 1 : nb.has(i) ? 1 : 0.12;
      nd.vis += (target - nd.vis) * Math.min(1, dt * 6);
      const o = nd.vis * nd.show;
      nd.disc.material.opacity = o;
      const pop = (i === f ? 1.22 : 1) * (0.6 + nd.show * 0.4) * (1 + Math.sin(t * 1.4 + i) * 0.02);
      nd.disc.scale.setScalar(nd.size * pop);
      nd.glow.material.opacity = 0.2 * o * (i === f ? 2 : 1);
      nd.halo.u.uOpacity.value = o;
      nd.halo.update(t, dt);
      nd.halo.points.rotation.y = t * 0.15 + i;
      const s = toScreen(nd.g.position, this.camera);
      this.labels.place(nd.label, s.x, s.y + this.rpx(nd) * pop + 8, s.visible ? o : 0);
      nd.label.e.classList.toggle('hi', i === f || (!!storyEdge && nb.has(i)));
    });
    this.endLabels.forEach((l, k) => {
      const s = toScreen(this.axisEnds[k], this.camera);
      this.labels.place(l, s.x, s.y + 10, s.visible && !nb ? 0.8 : 0);
    });

    const col = this.flowG.attributes.color.array, pos = this.flowG.attributes.position.array;
    this.edges.forEach((ed, k) => {
      let on;
      if (storyEdge) on = ed.from === storyEdge.from && ed.to === storyEdge.to;
      else on = nb ? (ed.from === f || ed.to === f) : false;
      const target = nb ? (on ? 1 : 0.04) : (this.showAll ? 0.55 : 0.3);
      ed.op += (target - ed.op) * Math.min(1, dt * 6);
      ed.line.material.opacity = ed.op;
      for (let j = 0; j < FPE; j++) {
        const u = (t * 0.1 + j / FPE + k * 0.13) % 1;
        const p = ed.curve.getPoint(u);
        const q = (k * FPE + j) * 3;
        pos[q] = p.x; pos[q + 1] = p.y; pos[q + 2] = p.z;
        const b = ed.op * 1.3 * Math.sin(u * Math.PI) * (u < ed.drawn ? 1 : 0);
        col[q] = b; col[q + 1] = b * 0.88; col[q + 2] = b * 0.74;
      }
      const s = toScreen(ed.mid, this.camera);
      const la = (on && (this.focus >= 0 || storyEdge)) || (this.showAll && !nb) ? 1 : 0;
      this.labels.place(ed.label, s.x, s.y, s.visible && ed.drawn > 0.9 ? la : 0);
    });
    this.flowG.attributes.position.needsUpdate = true;
    this.flowG.attributes.color.needsUpdate = true;
  },
  resize() { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.drawMatrix(); },
};
