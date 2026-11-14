// 01 — Who am I?  Dark screen → music → works appear as morphing point clouds → the question.
import { THREE, Cloud, sampleImage, sampleMask, sampleDust, textCanvas, loadImage, wait, killTweens, tween, setBloom, pointerOnPlane, pointer, damp, isNarrow } from '../core.js';
import { INTRO, WORLDS } from '../data.js';
import { $, fa, hint, hideHint } from '../ui.js';

const N = 120000;
const TAG = 'intro';

export default {
  async init(progress) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 400);
    this.camera.position.set(0, 0, 36);
    this.cloud = new Cloud(N, { size: 10.5, noise: 0.006, scatter: 2.6, mouseR: 2.2 });
    this.rig = new THREE.Group(); this.scene.add(this.rig);
    this.rig.add(this.cloud.points);
    this.drag = { on: false, x: 0, y: 0, yaw: 0, pitch: 0, vy: 0, vp: 0 };
    const cv = $('#gl');
    cv.addEventListener('pointerdown', e => { if (document.body.dataset.section !== '1') return; this.drag.on = true; this.drag.x = e.clientX; this.drag.y = e.clientY; });
    addEventListener('pointerup', () => { this.drag.on = false; });
    addEventListener('pointermove', e => {
      if (!this.drag.on) return;
      this.drag.yaw += (e.clientX - this.drag.x) * 0.006; this.drag.pitch += (e.clientY - this.drag.y) * 0.004;
      this.drag.pitch = Math.max(-0.6, Math.min(0.6, this.drag.pitch));
      this.drag.x = e.clientX; this.drag.y = e.clientY;
    });

    // far starfield for depth
    const sf = sampleDust(3000, 220, 140, 120, { alpha: 0.6 });
    this.stars = new Cloud(3000, { size: 7, noise: 0.4 });
    this.stars.set(sf);
    this.stars.points.position.z = -40;
    this.scene.add(this.stars.points);

    this.dust = sampleDust(N, 90, 55, 50, { alpha: 0.28 });
    const box = () => (isNarrow() ? [20, 26] : [30, 17]);
    this.steps = [];
    for (const s of INTRO) {
      const w = WORLDS.find(x => x.id === s.world);
      const item = w.byName(s.item) || w.heroItem;
      const img = await loadImage(item.src);
      const [bw, bh] = box();
      this.steps.push({ ...s, data: sampleImage(img, N, bw, bh, { depth: 5, relief: true, bulge: 3.5, extrude: 0.04, gain: 1.3, jitter: 0.25 }) });
      progress && progress();
    }
    await document.fonts.load('300 160px Inter');
    await document.fonts.load('400 120px Vazirmatn');
    const tc = textCanvas([
      { text: 'Who am I?', font: '300 230px Inter', y: 0.36 },
      { text: 'من کیستم؟', font: '400 150px Vazirmatn', y: 0.74, rtl: true },
    ], { width: 1800, height: 720 });
    this.question = sampleMask(tc, N, isNarrow() ? 20 : 28, 12, { depth: 0.8 });
    this.token = 0;
    this.cloud.set(this.dust);
    this.cloud.u.uOpacity.value = 0;

    $('#skipIntro').addEventListener('click', () => this.skip());
  },

  enter() {
    setBloom(0.45, 0.5, 0.62);
    this.run();
  },
  exit() {
    this.token++;
    killTweens(TAG);
    $('#introCap').classList.remove('on');
    $('#skipIntro').classList.remove('gone');
    hideHint();
  },

  caption(s) {
    const c = $('#introCap');
    c.classList.remove('on');
    if (!s || !s.en) return;
    setTimeout(() => { c.innerHTML = `<span>${s.en}</span>${fa(s.fa)}`; c.classList.add('on'); }, 500);
  },

  async run() {
    const tok = ++this.token;
    const alive = () => tok === this.token;
    $('#skipIntro').classList.remove('gone');
    this.cloud.set(this.dust);
    this.cloud.u.uOpacity.value = 0;
    this.cloud.fade(1, 3, TAG);
    await wait(3.2, TAG); if (!alive()) return;          // darkness + music
    for (const s of this.steps) {
      this.caption(s);
      await this.cloud.morph(s.data, 3.8, { tag: TAG }); if (!alive()) return;
      await wait(s.en ? 4.4 : 3.4, TAG); if (!alive()) return;
    }
    this.caption(null);
    await this.cloud.morph(this.dust, 2.2, { tag: TAG }); if (!alive()) return;
    this.ask(tok);
  },

  async ask(tok) {
    $('#skipIntro').classList.add('gone');
    this.caption(null);
    await this.cloud.morph(this.question, 3.2, { tag: TAG });
    if (tok !== this.token) return;
    hint('Press <kbd>→</kbd> to continue', 0);
  },

  skip() {
    const tok = ++this.token;
    killTweens(TAG);
    this.cloud.u.uOpacity.value = 1;
    this.ask(tok);
  },

  update(dt, t) {
    this.cloud.update(t, dt);
    this.stars.update(t, dt);
    const c = this.camera, d = this.drag;
    // slow orbit so the depth of the cloud reads as 3D; drag to turn it yourself
    if (!d.on) { d.yaw *= Math.exp(-dt * 0.35); d.pitch *= Math.exp(-dt * 0.5); }
    const yaw = Math.sin(t * 0.13) * 0.42 + d.yaw + pointer.nx * 0.12;
    const pitch = Math.sin(t * 0.09) * 0.12 + d.pitch - pointer.ny * 0.08;
    this.rig.rotation.y = damp(this.rig.rotation.y, yaw, 3, dt);
    this.rig.rotation.x = damp(this.rig.rotation.x, pitch, 3, dt);
    c.position.set(0, 0, isNarrow() ? 50 : 36);
    c.lookAt(0, 0, 0);
    this.cloud.setMouse(pointer.inside ? pointerOnPlane(c, this.cloud.points) : null);
  },
  resize() { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); },
  onKey(e) {
    if (e.key === ' ' && $('#skipIntro').offsetParent && !$('#skipIntro').classList.contains('gone')) { this.skip(); return true; }
    return false;
  },
};
