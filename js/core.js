import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export { THREE };

/* ── renderer ─────────────────────────────────────────────── */
export const canvas = document.getElementById('gl');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
export const PR = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(PR);
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x000000, 1);

export const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
composer.addPass(renderPass);
export const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.6, 0.5);
composer.addPass(bloom);
composer.addPass(new OutputPass());

export function setView(scene, camera) { renderPass.scene = scene; renderPass.camera = camera; }
export function setBloom(strength, radius, threshold) {
  bloom.strength = strength; bloom.radius = radius; bloom.threshold = threshold;
}
export function resizeRenderer() {
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
}

/* ── tweens ───────────────────────────────────────────────── */
export const EASE = {
  linear: t => t,
  inOut: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: t => 1 - Math.pow(1 - t, 3),
  expoOut: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
};
const active = new Set();
export function tween(dur, onUpdate, { ease = EASE.inOut, delay = 0, tag = null } = {}) {
  return new Promise(res => {
    active.add({ start: performance.now() + delay * 1000, dur: Math.max(1, dur * 1000), onUpdate, ease, res, tag });
  });
}
export function updateTweens(now) {
  for (const tw of active) {
    if (now < tw.start) continue;
    const p = Math.min(1, (now - tw.start) / tw.dur);
    tw.onUpdate(tw.ease(p), p);
    if (p >= 1) { active.delete(tw); tw.res(true); }
  }
}
export function killTweens(tag) {
  for (const tw of active) if (tw.tag === tag) { active.delete(tw); tw.res(false); }
}
export const wait = (s, tag) => tween(s, () => {}, { ease: EASE.linear, tag });
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));

/* ── images ───────────────────────────────────────────────── */
const imgCache = new Map();
export function loadImage(src) {
  if (!imgCache.has(src)) {
    imgCache.set(src, new Promise((res, rej) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = src;
    }));
  }
  return imgCache.get(src);
}

const toLin = v => Math.pow(v, 2.2);

/** Turn an image into a point cloud: positions on a plane (+ luminance relief) and colours. */
export function sampleImage(img, N, boxW, boxH, { depth = 2.2, jitter = 0.7, relief = false, bulge = 0, extrude = 0, gain = 1 } = {}) {
  const ar = img.naturalWidth / img.naturalHeight;
  let w = boxW, h = boxW / ar;
  if (h > boxH) { h = boxH; w = boxH * ar; }
  const gw = Math.max(2, Math.round(Math.sqrt(N * ar)));
  const gh = Math.max(2, Math.floor(N / gw));
  const c = document.createElement('canvas'); c.width = gw; c.height = gh;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, gw, gh);
  const d = ctx.getImageData(0, 0, gw, gh).data;
  const G = gw * gh;
  const L = new Float32Array(G);
  for (let j = 0; j < G; j++) L[j] = (0.2126 * d[j * 4] + 0.7152 * d[j * 4 + 1] + 0.0722 * d[j * 4 + 2]) / 255;
  // depth map: blurred luminance + blurred local detail (detailed subjects come forward)
  let D = L;
  if (relief) {
    const E = new Float32Array(G);
    for (let y = 1; y < gh - 1; y++) for (let x = 1; x < gw - 1; x++) {
      const j = y * gw + x;
      E[j] = Math.abs(L[j + 1] - L[j - 1]) + Math.abs(L[j + gw] - L[j - gw]);
    }
    const blur = (A, R) => {
      const T = new Float32Array(G), O = new Float32Array(G);
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
        let s = 0, n = 0; for (let k = -R; k <= R; k++) { const xx = x + k; if (xx >= 0 && xx < gw) { s += A[y * gw + xx]; n++; } } T[y * gw + x] = s / n;
      }
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
        let s = 0, n = 0; for (let k = -R; k <= R; k++) { const yy = y + k; if (yy >= 0 && yy < gh) { s += T[yy * gw + x]; n++; } } O[y * gw + x] = s / n;
      }
      return O;
    };
    const Lb = blur(L, 2), Eb = blur(blur(E, 4), 4);
    let em = 1e-4; for (let j = 0; j < G; j++) em = Math.max(em, Eb[j]);
    D = new Float32Array(G);
    for (let j = 0; j < G; j++) D[j] = 0.45 * Lb[j] + 0.55 * Math.min(1, Eb[j] / (em * 0.6));
  }
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    const j = i < G ? i : (Math.random() * G) | 0;
    const x = j % gw, y = (j / gw) | 0;
    const r = d[j * 4] / 255, g = d[j * 4 + 1] / 255, b = d[j * 4 + 2] / 255;
    const u = (x + .5 + (Math.random() - .5) * jitter) / gw - .5, v = (y + .5 + (Math.random() - .5) * jitter) / gh - .5;
    pos[i * 3] = u * w;
    pos[i * 3 + 1] = -v * h;
    let z = (D[j] - .5) * depth + (Math.random() - .5) * 0.12;
    if (bulge) z += bulge * Math.max(0, 1 - (u * u + v * v) * 3.2);
    let k = gain;
    if (extrude && Math.random() < extrude) { const e = Math.random(); z -= e * depth * 0.9; k = gain * (0.55 - e * 0.35); }
    pos[i * 3 + 2] = z;
    col[i * 4] = toLin(r) * k; col[i * 4 + 1] = toLin(g) * k; col[i * 4 + 2] = toLin(b) * k; col[i * 4 + 3] = 1;
  }
  return { pos, col, w, h };
}

/** Point cloud from the opaque/bright pixels of a canvas or image (text, logo). */
export function sampleMask(src, N, boxW, boxH, { color = [0.93, 0.9, 0.86], depth = 0.6, res = 700 } = {}) {
  const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
  const ar = sw / sh;
  const cw = ar >= 1 ? res : Math.round(res * ar), ch = ar >= 1 ? Math.round(res / ar) : res;
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0, cw, ch);
  const d = ctx.getImageData(0, 0, cw, ch).data;
  const idx = [];
  for (let i = 0; i < cw * ch; i++) if (d[i * 4 + 3] > 110 && d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2] > 200) idx.push(i);
  let w = boxW, h = boxW / ar;
  if (h > boxH) { h = boxH; w = boxH * ar; }
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 4);
  const lc = color.map(toLin);
  for (let i = 0; i < N; i++) {
    const j = idx.length ? idx[(Math.random() * idx.length) | 0] : 0;
    const x = j % cw, y = (j / cw) | 0;
    pos[i * 3] = ((x + Math.random()) / cw - .5) * w;
    pos[i * 3 + 1] = -((y + Math.random()) / ch - .5) * h;
    pos[i * 3 + 2] = (Math.random() - .5) * depth;
    const v = 0.75 + Math.random() * 0.25;
    col[i * 4] = lc[0] * v; col[i * 4 + 1] = lc[1] * v; col[i * 4 + 2] = lc[2] * v; col[i * 4 + 3] = 1;
  }
  return { pos, col, w, h };
}

/** Render lines of text to a canvas (for sampleMask). */
export function textCanvas(lines, { width = 1800, height = 700 } = {}) {
  const c = document.createElement('canvas'); c.width = width; c.height = height;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const l of lines) {
    ctx.font = l.font; ctx.direction = l.rtl ? 'rtl' : 'ltr';
    ctx.fillText(l.text, width / 2, l.y * height);
  }
  return c;
}

/** Random volume (dust). */
export function sampleDust(N, sx, sy, sz, { color = [0.85, 0.82, 0.78], alpha = 0.35 } = {}) {
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 4);
  const lc = color.map(toLin);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - .5) * sx;
    pos[i * 3 + 1] = (Math.random() - .5) * sy;
    pos[i * 3 + 2] = (Math.random() - .5) * sz;
    const v = 0.3 + Math.random() * 0.7;
    col[i * 4] = lc[0] * v; col[i * 4 + 1] = lc[1] * v; col[i * 4 + 2] = lc[2] * v; col[i * 4 + 3] = alpha * Math.random();
  }
  return { pos, col };
}
export function sampleSphere(N, R, { color = [0.93, 0.9, 0.86], alpha = 1, gauss = true } = {}) {
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 4);
  const lc = color.map(toLin);
  for (let i = 0; i < N; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2;
    const r = R * (gauss ? Math.pow(Math.random(), 0.6) : Math.cbrt(Math.random()));
    const s = Math.sqrt(1 - u * u);
    pos[i * 3] = r * s * Math.cos(th); pos[i * 3 + 1] = r * u; pos[i * 3 + 2] = r * s * Math.sin(th);
    col[i * 4] = lc[0]; col[i * 4 + 1] = lc[1]; col[i * 4 + 2] = lc[2]; col[i * 4 + 3] = alpha;
  }
  return { pos, col };
}

/* ── morphing point cloud ─────────────────────────────────── */
const cloudVS = /* glsl */`
uniform float uMix, uTime, uSize, uPR, uNoise, uScatter, uOpacity, uSwirl, uMouseR;
uniform vec3 uMouse;
attribute vec3 aB;
attribute vec4 aColA;
attribute vec4 aColB;
attribute float aRand;
varying vec4 vCol;
vec3 drift(vec3 p, float t, float r){
  return vec3(sin(t*0.7 + r*40.0 + p.y*0.35), cos(t*0.6 + r*31.0 + p.x*0.3), sin(t*0.5 + r*17.0 + p.z*0.4));
}
void main(){
  float d = aRand * 0.4;
  float t = clamp((uMix - d) / 0.6, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  vec3 p = mix(position, aB, t);
  float mid = sin(t * 3.14159);
  p += drift(p, uTime, aRand) * (uNoise + mid * uScatter * (0.4 + aRand));
  float ang = uSwirl * (1.0 - t) * t * 4.0 * (0.6 + aRand);
  float cs = cos(ang), sn = sin(ang);
  p.xy = mat2(cs, -sn, sn, cs) * p.xy;
  if (uMouseR > 0.0) {
    vec2 dm = p.xy - uMouse.xy;
    float dist = length(dm);
    float f = smoothstep(uMouseR, 0.0, dist);
    p.xy += normalize(dm + 1e-4) * f * uMouseR * 0.55;
    p.z += f * uMouseR * 0.9;
  }
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vec4 c = mix(aColA, aColB, t);
  gl_PointSize = uSize * uPR * (0.55 + aRand * 0.9) / max(-mv.z, 0.1);
  vCol = vec4(c.rgb, c.a * uOpacity);
}`;
const cloudFS = /* glsl */`
varying vec4 vCol;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5 || vCol.a < 0.003) discard;
  float a = smoothstep(0.5, 0.1, d);
  gl_FragColor = vec4(vCol.rgb, vCol.a * a);
}`;

export class Cloud {
  constructor(N, { size = 9, noise = 0.03, scatter = 2.2, mouseR = 0, additive = false } = {}) {
    this.N = N;
    this.A = new Float32Array(N * 3); this.B = new Float32Array(N * 3);
    this.CA = new Float32Array(N * 4); this.CB = new Float32Array(N * 4);
    const R = new Float32Array(N); for (let i = 0; i < N; i++) R[i] = Math.random();
    const g = new THREE.BufferGeometry();
    this.aA = new THREE.BufferAttribute(this.A, 3);
    this.aB = new THREE.BufferAttribute(this.B, 3);
    this.aCA = new THREE.BufferAttribute(this.CA, 4);
    this.aCB = new THREE.BufferAttribute(this.CB, 4);
    g.setAttribute('position', this.aA); g.setAttribute('aB', this.aB);
    g.setAttribute('aColA', this.aCA); g.setAttribute('aColB', this.aCB);
    g.setAttribute('aRand', new THREE.BufferAttribute(R, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.u = {
      uMix: { value: 0 }, uTime: { value: 0 }, uSize: { value: size }, uPR: { value: PR },
      uNoise: { value: noise }, uScatter: { value: scatter }, uOpacity: { value: 1 },
      uSwirl: { value: 0 }, uMouseR: { value: mouseR }, uMouse: { value: new THREE.Vector3(999, 999, 0) },
    };
    this.mat = new THREE.ShaderMaterial({
      uniforms: this.u, vertexShader: cloudVS, fragmentShader: cloudFS,
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.mouseR = mouseR;
    this._mouseTarget = new THREE.Vector3(999, 999, 0);
  }
  _flag() { this.aA.needsUpdate = this.aB.needsUpdate = this.aCA.needsUpdate = this.aCB.needsUpdate = true; }
  /** Jump to a state immediately. */
  set(data) {
    this.A.set(data.pos); this.B.set(data.pos);
    if (data.col) { this.CA.set(data.col); this.CB.set(data.col); }
    this.u.uMix.value = 1; this._flag();
  }
  /** Morph from the current shape to `data`. */
  morph(data, dur = 2.2, { tag = null } = {}) {
    if (this.u.uMix.value > 0.5) { this.A.set(this.B); this.CA.set(this.CB); }
    this.B.set(data.pos); if (data.col) this.CB.set(data.col); else this.CB.set(this.CA);
    this.u.uMix.value = 0; this._flag();
    return tween(dur, v => { this.u.uMix.value = v; }, { ease: EASE.linear, tag });
  }
  fade(to, dur = 0.6, tag = null) {
    const from = this.u.uOpacity.value;
    return tween(dur, v => { this.u.uOpacity.value = lerp(from, to, v); }, { tag });
  }
  /** mouse in world space → local; call each frame with null to release */
  setMouse(worldPoint) {
    if (!worldPoint) { this._mouseTarget.set(999, 999, 0); return; }
    this._mouseTarget.copy(this.points.worldToLocal(worldPoint.clone()));
  }
  update(t, dt) {
    this.u.uTime.value = t;
    const m = this.u.uMouse.value;
    if (this._mouseTarget.x > 900) m.copy(this._mouseTarget);
    else if (m.x > 900) m.copy(this._mouseTarget);
    else m.lerp(this._mouseTarget, 1 - Math.exp(-10 * dt));
  }
}

/* ── pointer helpers ──────────────────────────────────────── */
export const pointer = { x: 0, y: 0, nx: 0, ny: 0, inside: false };
const ray = new THREE.Raycaster();
export function pointerOnPlane(camera, object3d) {
  // plane = object's local XY plane
  const n = new THREE.Vector3(0, 0, 1).applyQuaternion(object3d.getWorldQuaternion(new THREE.Quaternion()));
  const p = object3d.getWorldPosition(new THREE.Vector3());
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, p);
  ray.setFromCamera({ x: pointer.nx, y: pointer.ny }, camera);
  const out = new THREE.Vector3();
  return ray.ray.intersectPlane(plane, out) ? out : null;
}

/** Project a world position to CSS pixels. Returns {x,y,visible,z}. */
const _v = new THREE.Vector3();
export function toScreen(pos, camera) {
  _v.copy(pos).project(camera);
  return { x: (_v.x * .5 + .5) * innerWidth, y: (-_v.y * .5 + .5) * innerHeight, visible: _v.z < 1 && _v.z > -1, z: _v.z };
}

/** soft round glow texture */
let _glow;
export function glowTexture() {
  if (_glow) return _glow;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.18, 'rgba(255,245,230,.55)');
  gr.addColorStop(0.5, 'rgba(255,235,210,.12)');
  gr.addColorStop(1, 'rgba(255,235,210,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  _glow = new THREE.CanvasTexture(c);
  _glow.colorSpace = THREE.SRGBColorSpace;
  return _glow;
}

/** Fly a camera (and optional OrbitControls target) to a new pose. */
export function flyTo(camera, controls, toPos, toTarget, dur = 1.6, tag = null) {
  const p0 = camera.position.clone();
  const t0 = controls ? controls.target.clone() : new THREE.Vector3();
  return tween(dur, v => {
    camera.position.lerpVectors(p0, toPos, v);
    if (controls) { controls.target.lerpVectors(t0, toTarget, v); camera.lookAt(controls.target); }
    else camera.lookAt(toTarget);
  }, { ease: EASE.inOut, tag });
}

export const isNarrow = () => innerWidth < 820;
