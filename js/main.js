import { setView, composer, resizeRenderer, updateTweens, tween, pointer, canvas } from './core.js';
import { SECTIONS, AUDIO, LOGO } from './data.js';
import { $, el, ICON, showChapter, hideHint, closeLightbox, lightboxOpen, lbStep, lbTogglePlay, galleryOpen, closeGallery, galleryStep } from './ui.js';
import intro from './scenes/intro.js';
import multiverse from './scenes/multiverse.js';
import dots from './scenes/dots.js';
import finale from './scenes/finale.js';

const scenes = [intro, multiverse, dots, finale];
let cur = -1, busy = false;

/* ── chrome: icons, nav ───────────────────────────────────── */
$('#brandLogo').src = LOGO;
$('#startLogo').src = LOGO;
$('#btnSound').innerHTML = ICON.soundOn;
$('#btnFull').innerHTML = ICON.full;
$('#prevSec').innerHTML = ICON.arrowL;
$('#nextSec').innerHTML = ICON.arrowR;
$('#skipIntro').innerHTML = `<span>Skip</span>${ICON.skip}`;
$('#btnReplay').innerHTML = `${ICON.replay}<span>Replay</span>`;
$('#beginBtn').insertAdjacentHTML('afterbegin', ICON.play);

const nav = $('#sectionNav');
SECTIONS.forEach((s, i) => {
  const b = el('button', 'sec', `<span class="bar"><i></i></span><span class="lab"><span class="mono">${s.n}</span> ${s.en}</span>`);
  b.onclick = () => goto(i);
  nav.append(b);
});
$('#prevSec').onclick = () => goto(cur - 1);
$('#nextSec').onclick = () => goto(cur + 1);
$('#btnFull').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());

/* ── audio (music bed; ducks while a video plays) ─────────── */
const bgm = new Audio(AUDIO);
bgm.loop = true; bgm.volume = 0;
let soundOn = true, duck = false;
const targetVol = () => (!soundOn ? 0 : duck ? 0 : cur === 0 ? 0.9 : 0.35);
function rampAudio() {
  const from = bgm.volume, to = targetVol();
  if (to > 0 && bgm.paused) bgm.play().catch(() => {});
  tween(1.2, v => { bgm.volume = Math.min(1, Math.max(0, from + (to - from) * v)); });
}
$('#btnSound').onclick = () => {
  soundOn = !soundOn;
  $('#btnSound').innerHTML = soundOn ? ICON.soundOn : ICON.soundOff;
  $('#btnSound').classList.toggle('off', !soundOn);
  rampAudio();
};
addEventListener('media-play', () => { duck = true; rampAudio(); });
addEventListener('media-stop', () => { duck = false; rampAudio(); });

/* ── section switching ────────────────────────────────────── */
async function goto(i) {
  if (busy || i < 0 || i >= scenes.length || i === cur) return;
  busy = true;
  closeLightbox(); closeGallery(); hideHint();
  const fade = $('#fade');
  fade.classList.add('on');
  await new Promise(r => setTimeout(r, cur < 0 ? 0 : 650));
  if (cur >= 0) scenes[cur].exit();
  cur = i;
  document.body.dataset.section = String(i + 1);
  [...nav.children].forEach((b, k) => { b.classList.toggle('on', k === i); b.classList.toggle('done', k < i); });
  $('#prevSec').disabled = i === 0;
  $('#nextSec').disabled = i === scenes.length - 1;
  canvas.style.cursor = '';
  setView(scenes[i].scene, scenes[i].camera);
  scenes[i].resize();
  scenes[i].enter();
  rampAudio();
  fade.classList.remove('on');
  if (i > 0) showChapter(SECTIONS[i]);
  busy = false;
}

/* jump from a planet (02) to its connections (03) */
addEventListener('goto-section', e => {
  const { section, focus } = e.detail;
  if (focus != null && scenes[section]) scenes[section].pendingFocus = focus;
  goto(section);
});

/* ── input ────────────────────────────────────────────────── */
let down = null;
addEventListener('pointermove', e => {
  pointer.x = e.clientX; pointer.y = e.clientY;
  pointer.nx = e.clientX / innerWidth * 2 - 1; pointer.ny = -(e.clientY / innerHeight) * 2 + 1;
  pointer.inside = e.target === canvas;
  if (cur >= 0 && e.target === canvas) scenes[cur].onPointerMove?.(e);
});
canvas.addEventListener('pointerleave', () => { pointer.inside = false; });
canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', e => {
  if (!down || cur < 0) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  down = null;
  if (moved < 6) { pointer.x = e.clientX; pointer.y = e.clientY; scenes[cur].onClick?.(e); }
});

addEventListener('keydown', e => {
  if (!$('#start').classList.contains('gone')) { if (e.key === 'Enter' || e.key === ' ') begin(); return; }
  if (lightboxOpen()) {
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowRight') lbStep(1);
    else if (e.key === 'ArrowLeft') lbStep(-1);
    else if (e.key === ' ') { e.preventDefault(); lbTogglePlay(); }
    return;
  }
  if (galleryOpen()) {
    if (e.key === 'Escape') closeGallery();
    else if (e.key === 'ArrowRight') galleryStep(1);
    else if (e.key === 'ArrowLeft') galleryStep(-1);
    return;
  }
  if (e.key === 'PageDown') { goto(cur + 1); return; }   // presentation clickers
  if (e.key === 'PageUp') { goto(cur - 1); return; }
  if (cur >= 0 && scenes[cur].onKey?.(e)) { e.preventDefault(); return; }
  if (e.key === 'ArrowRight') goto(cur + 1);
  else if (e.key === 'ArrowLeft') goto(cur - 1);
  else if (/^[1-4]$/.test(e.key)) goto(+e.key - 1);
  else if (e.key === 'm' || e.key === 'M') $('#btnSound').click();
  else if (e.key === 'f' || e.key === 'F') $('#btnFull').click();
});

addEventListener('resize', () => {
  resizeRenderer();
  scenes.forEach(s => s.camera && s.resize?.());
});

/* ── loop ─────────────────────────────────────────────────── */
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  updateTweens(now);
  if (cur >= 0) {
    scenes[cur].update(dt, now / 1000);
    composer.render(dt);
  }
  requestAnimationFrame(frame);
}

/* ── boot ─────────────────────────────────────────────────── */
async function boot() {
  const total = 7 + 1 + 12 + 12;
  let done = 0;
  const progress = () => { done++; $('#loadBar').style.transform = `scaleX(${Math.min(1, done / total)})`; };
  await document.fonts.ready;
  try {
    for (const s of scenes) await s.init(progress);
  } catch (err) {
    console.error(err);
    $('#loadState').textContent = 'Could not load media — open via start.bat (local server).';
    return;
  }
  $('#start').classList.add('ready');
  $('#beginBtn').disabled = false;
  requestAnimationFrame(frame);
}
function begin() {
  if ($('#beginBtn').disabled) return;
  $('#start').classList.add('gone');
  document.body.classList.add('started');
  goto(0);
}
$('#beginBtn').onclick = begin;
boot();
