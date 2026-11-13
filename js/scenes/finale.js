// 04 — All at Once.  Every world in one picture, then they spiral into the centre and become the sarv mark.
import { THREE, Cloud, sampleImage, sampleMask, sampleSphere, textCanvas, loadImage, tween, wait, killTweens, setBloom, toScreen, glowTexture, pointer, pointerOnPlane, damp, isNarrow } from '../core.js';
import { WORLDS, FINALE, LOGO } from '../data.js';
import { $, fa, ICON, Labels, openGallery } from '../ui.js';

const TAG = 'fin';
const PER = 5200;
const N = PER * 12;

export default {
  async init(progress) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 500);
    this.camera.position.set(0, 0, 50);
    this.cloud = new Cloud(N, { size: 8, noise: 0.03, scatter: 2.6, mouseR: 1.8 });
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.root.add(this.cloud.points);
    this.R = 16;

    // ring of all worlds
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 4);
    this.slots = [];
    for (let i = 0; i < 12; i++) {
      const w = WORLDS[i];
      const a = Math.PI / 2 - i / 12 * Math.PI * 2;
      const cx = Math.cos(a) * this.R, cy = Math.sin(a) * this.R;
      this.slots.push(new THREE.Vector3(cx, cy, 0));
      let d;
      if (w.heroItem) d = sampleImage(await loadImage(w.heroItem.thumb), PER, 6.4, 4.4, { depth: 1 });
      else d = sampleMask(textCanvas([{ text: 'Phase 2', font: '300 200px Inter', y: 0.5 }], { width: 1200, height: 420 }), PER, 5, 2);
      for (let k = 0; k < PER; k++) {
        const q = i * PER + k;
        pos[q * 3] = d.pos[k * 3] + cx; pos[q * 3 + 1] = d.pos[k * 3 + 1] + cy; pos[q * 3 + 2] = d.pos[k * 3 + 2];
        col.set(d.col.subarray(k * 4, k * 4 + 4), q * 4);
      }
      progress && progress();
    }
    this.ring = { pos, col };

    // logo + orbit dust
    const logo = await loadImage(LOGO);
    const L = sampleMask(logo, N, 10, 13.5, { color: [0.98, 0.95, 0.9], depth: 0.9, res: 900 });
    for (let i = 0; i < N; i++) {
      if (Math.random() < 0.22) {
        const a = Math.random() * Math.PI * 2, r = 10 + Math.random() * 3.5 + Math.pow(Math.random(), 4) * 6;
        L.pos[i * 3] = Math.cos(a) * r; L.pos[i * 3 + 1] = Math.sin(a) * r; L.pos[i * 3 + 2] = (Math.random() - .5) * 1.2;
        L.col[i * 4 + 3] = 0.25 + Math.random() * 0.35;
      }
    }
    this.logo = L;
    this.burst = sampleSphere(N, 70, { alpha: 0.0 });

    // the graph: every world tied to the centre
    const verts = [];
    this.slots.forEach((s, i) => {
      verts.push(0, 0, 0, s.x * 0.98, s.y * 0.98, 0);
      const n = this.slots[(i + 1) % 12];
      verts.push(s.x, s.y, 0, n.x, n.y, 0);
    });
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    this.lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xf3e7d7, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.root.add(this.lines);
    this.dots = this.slots.map(s => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffe6c8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      sp.position.copy(s); sp.scale.setScalar(2.2); this.root.add(sp); return sp;
    });

    this.labels = new Labels($('#finLabels'));
    this.lbl = WORLDS.map((w, i) => this.labels.add(`<span class="n mono">${w.n}</span><span class="t">${w.en}</span>`, 'fl', () => openGallery(i)));
    this.labelAlpha = 0; this.labelMode = 'images';
    $('#btnReplay').onclick = () => this.run();
    $('#insta .ig').innerHTML = ICON.insta;
    try { new window.QRCode($('#instaQR'), { text: 'https://www.instagram.com/by.sarv/', width: 92, height: 92, colorDark: '#ece8e1', colorLight: '#000000' }); } catch (e) { $('#instaQR').remove(); }
    $('#finText').innerHTML = `<p class="en">${FINALE.en}</p><p>${fa(FINALE.fa)}</p><p class="name"><span>${FINALE.name}</span><span class="sep">—</span>${fa(FINALE.nameFa)}</p>`;
    this.tok = 0;
  },

  fit() {
    const need = this.R + 5.5;
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const dH = need / tanH, dW = need / (tanH * this.camera.aspect);
    this.dist = Math.max(dH, dW) * 1.04;
  },

  enter() {
    setBloom(0.4, 0.45, 0.82);
    this.fit();
    this.camera.position.set(0, 0, this.dist);
    this.run();
  },
  exit() {
    this.tok++; killTweens(TAG);
    $('#finText').classList.remove('on');
    $('#btnReplay').classList.remove('on');
    $('#insta').classList.remove('on');
  },

  async run() {
    const tok = ++this.tok; killTweens(TAG);
    const alive = () => tok === this.tok;
    $('#finText').classList.remove('on'); $('#btnReplay').classList.remove('on'); $('#insta').classList.remove('on');
    this.lines.material.opacity = 0; this.dots.forEach(d => (d.material.opacity = 0));
    this.labelAlpha = 0; this.labelMode = 'images';
    this.root.scale.setScalar(1); this.root.position.y = 0;
    this.cloud.u.uSwirl.value = 0;
    this.cloud.set(this.burst);
    this.cloud.u.uOpacity.value = 1;
    await this.cloud.morph(this.ring, 3, { tag: TAG }); if (!alive()) return;
    tween(0.8, v => (this.labelAlpha = v), { tag: TAG });
    await wait(4.2, TAG); if (!alive()) return;
    tween(0.6, v => (this.labelAlpha = 1 - v), { tag: TAG });
    this.cloud.u.uSwirl.value = 2.4;
    await this.cloud.morph(this.logo, 4.6, { tag: TAG }); if (!alive()) return;
    this.cloud.u.uSwirl.value = 0;
    this.labelMode = 'nodes';
    tween(1.6, v => { this.lines.material.opacity = v * 0.22; this.dots.forEach(d => (d.material.opacity = v * 0.9)); this.labelAlpha = v; }, { tag: TAG });
    await wait(0.6, TAG); if (!alive()) return;
    $('#finText').classList.add('on');
    await wait(2.5, TAG); if (!alive()) return;
    $('#btnReplay').classList.add('on');
    $('#insta').classList.add('on');
  },

  update(dt, t) {
    this.cloud.update(t, dt);
    const c = this.camera;
    c.position.x = damp(c.position.x, pointer.nx * 2.5, 2, dt);
    c.position.y = damp(c.position.y, pointer.ny * 1.8 + (isNarrow() ? -4 : -2.5), 2, dt);
    c.position.z = this.dist || 50;
    c.lookAt(0, isNarrow() ? -4 : -2.5, 0);
    this.cloud.points.rotation.y = this.labelMode === 'nodes' ? Math.sin(t * 0.3) * 0.12 : 0;
    const nodes = this.labelMode === 'nodes';
    const sc = damp(this.root.scale.x, nodes ? (isNarrow() ? 0.62 : 0.74) : 1, 1.6, dt);
    this.root.scale.setScalar(sc);
    this.root.position.y = damp(this.root.position.y, nodes ? (isNarrow() ? 6 : 4.2) : 0, 1.6, dt);
    this.cloud.u.uSize.value = nodes ? 6.5 : 11;
    this.cloud.setMouse(pointer.inside ? pointerOnPlane(c, this.cloud.points) : null);
    this.dots.forEach((d, i) => d.scale.setScalar(2 + Math.sin(t * 1.5 + i) * 0.3));
    this.lbl.forEach((it, i) => {
      const s = this.slots[i];
      const p = this.labelMode === 'images' ? s.clone().add(new THREE.Vector3(0, -2.9, 0)) : s.clone().multiplyScalar(1.1);
      const sc = toScreen(this.root.localToWorld(p), c);
      it.e.classList.toggle('node', this.labelMode === 'nodes');
      this.labels.place(it, sc.x, sc.y, this.labelAlpha);
    });
  },
  resize() { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.fit(); },
  onKey(e) { if (e.key === 'r' || e.key === 'R') { this.run(); return true; } return false; },
};
