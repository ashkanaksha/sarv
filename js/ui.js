import { WORLDS } from './data.js';

/* ── icons (1.25px stroke, 24 grid) ───────────────────────── */
const s = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
export const ICON = {
  play: s('<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>'),
  pause: s('<path d="M8.5 5.5v13M15.5 5.5v13" stroke-width="1.6"/>'),
  skip: s('<path d="M6 6l8 6-8 6z"/><path d="M17.5 6v12"/>'),
  prev: s('<path d="M15 5l-7 7 7 7"/>'),
  next: s('<path d="M9 5l7 7-7 7"/>'),
  close: s('<path d="M6 6l12 12M18 6L6 18"/>'),
  soundOn: s('<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"/>'),
  soundOff: s('<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
  full: s('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  grid: s('<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>'),
  expand: s('<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>'),
  enter: s('<circle cx="12" cy="12" r="8"/><path d="M10.5 8.5L14 12l-3.5 3.5"/>'),
  link: s('<circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="6" r="2.2"/><circle cx="18" cy="18" r="2.2"/><path d="M8 11l8-4M8 13l8 4"/>'),
  replay: s('<path d="M4.5 12a7.5 7.5 0 102.2-5.3"/><path d="M4.5 4.5v3.5H8"/>'),
  arrowR: s('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  arrowL: s('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  zoomIn: s('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M11 8.2v5.6M8.2 11h5.6"/>'),
  zoomOut: s('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M8.2 11h5.6"/>'),
  insta: s('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor"/>'),
  muted: s('<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
};

export const $ = (q, el = document) => el.querySelector(q);
export const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
export const fa = (t, cls = '') => `<span class="fa ${cls}" lang="fa" dir="rtl">${t}</span>`;

/* ── chapter card ─────────────────────────────────────────── */
let chapTimer;
export function showChapter(sec) {
  const c = $('#chapter');
  c.innerHTML = `<span class="num">${sec.n}</span><h1>${sec.en}</h1>${fa(sec.fa, 'sub')}`;
  c.classList.remove('on'); void c.offsetWidth; c.classList.add('on');
  clearTimeout(chapTimer);
  chapTimer = setTimeout(() => c.classList.remove('on'), 2800);
}

let hintTimer;
export function hint(html, ms = 5000) {
  const h = $('#hint');
  h.innerHTML = html; h.classList.add('on');
  clearTimeout(hintTimer);
  if (ms) hintTimer = setTimeout(() => h.classList.remove('on'), ms);
}
export function hideHint() { $('#hint').classList.remove('on'); }

/* ── media thumbnails grid ────────────────────────────────── */
export function mediaGrid(world, { onPick, active = -1 } = {}) {
  const g = el('div', 'mgrid');
  if (!world.media.length) {
    g.append(el('div', 'empty', `<span>Listen to the explanations :)</span>${fa('به توضیحات گوش بدین :)')}`));
    return g;
  }
  world.media.forEach((m, i) => {
    const b = el('button', 'mthumb' + (m.type === 'video' ? ' is-video' : '') + (i === active ? ' active' : ''));
    b.setAttribute('aria-label', `${world.en} — ${m.type} ${i + 1}`);
    b.innerHTML = `<img loading="lazy" src="${m.thumb}" alt="">` +
      (m.type === 'video' ? `<span class="badge">${ICON.play}</span>` : `<span class="zoom">${ICON.expand}</span>`);
    b.addEventListener('click', e => {
      const zoom = e.target.closest('.zoom');
      onPick && onPick(i, m, { zoom: !!zoom });
    });
    g.append(b);
  });
  return g;
}

/* ── lightbox (images + videos with play / skip) ──────────── */
const LB = { items: [], i: 0, title: '', video: null };
function fmt(t) { if (!isFinite(t)) return '0:00'; const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${String(s).padStart(2, '0')}`; }

export function openLightbox(items, index = 0, title = '') {
  LB.items = items; LB.i = index; LB.title = title;
  const lb = $('#lightbox');
  lb.classList.add('on');
  document.body.classList.add('lb-open');
  renderLB();
}
export function closeLightbox() {
  const lb = $('#lightbox');
  stopVideo();
  lb.classList.remove('on');
  document.body.classList.remove('lb-open');
}
export const lightboxOpen = () => $('#lightbox').classList.contains('on');
function stopVideo() {
  if (LB.video) { LB.video.pause(); LB.video.removeAttribute('src'); LB.video.load(); LB.video = null; }
  window.dispatchEvent(new CustomEvent('media-stop'));
}
export function lbStep(d) {
  if (!LB.items.length) return;
  stopVideo();
  LB.i = (LB.i + d + LB.items.length) % LB.items.length;
  renderLB();
}
function renderLB() {
  const lb = $('#lightbox');
  const m = LB.items[LB.i];
  lb.innerHTML = `
    <div class="lb-top">
      <span class="lb-title">${LB.title}</span>
      <span class="lb-count mono">${String(LB.i + 1).padStart(2, '0')} / ${String(LB.items.length).padStart(2, '0')}</span>
      <button class="ic lb-close" aria-label="Close">${ICON.close}</button>
    </div>
    <button class="ic lb-nav lb-prev" aria-label="Previous">${ICON.prev}</button>
    <div class="lb-stage"></div>
    <button class="ic lb-nav lb-next" aria-label="Next">${ICON.next}</button>`;
  const stage = $('.lb-stage', lb);
  $('.lb-close', lb).onclick = closeLightbox;
  $('.lb-prev', lb).onclick = () => lbStep(-1);
  $('.lb-next', lb).onclick = () => lbStep(1);
  lb.onclick = e => { if (e.target === lb || e.target === stage) closeLightbox(); };
  if (LB.items.length < 2) lb.querySelectorAll('.lb-nav').forEach(b => b.style.visibility = 'hidden');

  if (m.type === 'image') {
    const im = el('img', 'lb-img'); im.src = m.src; im.alt = '';
    stage.append(im);
    return;
  }
  // video: show a choice first — play or skip
  const wrap = el('div', 'lb-video');
  const v = el('video'); v.src = m.src; v.poster = m.thumb; v.playsInline = true; v.preload = 'metadata';
  wrap.append(v);
  const choice = el('div', 'v-choice', `
     <button class="v-play" aria-label="Play video">${ICON.play}<span>Play</span></button>
     <button class="v-skip" aria-label="Skip video">${ICON.skip}<span>Skip</span></button>`);
  const bar = el('div', 'v-bar', `
     <button class="ic v-toggle" aria-label="Play / pause">${ICON.play}</button>
     <div class="v-track"><div class="v-fill"></div></div>
     <span class="v-time mono">0:00</span>
     <button class="ic v-mute" aria-label="Mute">${ICON.soundOn}</button>
     <button class="ic v-next" aria-label="Skip">${ICON.skip}</button>`);
  wrap.append(choice, bar);
  stage.append(wrap);
  LB.video = v;
  const tog = $('.v-toggle', bar), fill = $('.v-fill', bar), time = $('.v-time', bar), mute = $('.v-mute', bar);
  const play = () => { choice.classList.add('gone'); wrap.classList.add('playing'); v.play(); };
  $('.v-play', choice).onclick = play;
  $('.v-skip', choice).onclick = () => lbStep(1);
  $('.v-next', bar).onclick = () => lbStep(1);
  tog.onclick = () => (v.paused ? v.play() : v.pause());
  v.onclick = () => (v.paused ? play() : v.pause());
  mute.onclick = () => { v.muted = !v.muted; mute.innerHTML = v.muted ? ICON.soundOff : ICON.soundOn; };
  v.onplay = () => { tog.innerHTML = ICON.pause; window.dispatchEvent(new CustomEvent('media-play')); };
  v.onpause = () => { tog.innerHTML = ICON.play; window.dispatchEvent(new CustomEvent('media-stop')); };
  v.ontimeupdate = () => { fill.style.width = (v.currentTime / v.duration * 100 || 0) + '%'; time.textContent = `${fmt(v.currentTime)} / ${fmt(v.duration)}`; };
  v.onended = () => { choice.classList.remove('gone'); wrap.classList.remove('playing'); $('.v-play span', choice).textContent = 'Replay'; };
  $('.v-track', bar).onclick = e => { const r = e.currentTarget.getBoundingClientRect(); v.currentTime = (e.clientX - r.left) / r.width * v.duration; };
}
export function lbTogglePlay() {
  if (!LB.video) return;
  const ch = $('.v-choice', $('#lightbox'));
  if (ch && !ch.classList.contains('gone')) { $('.v-play', ch).click(); return; }
  LB.video.paused ? LB.video.play() : LB.video.pause();
}

/* ── world view: every photo and film of one world ─────────── */
const GAL = { i: -1, opts: {} };
export function openGallery(wi, opts = {}) {
  GAL.i = wi; GAL.opts = opts;
  const w = WORLDS[wi];
  const g = $('#gallery');
  const nImg = w.media.filter(m => m.type === 'image').length, nVid = w.media.length - nImg;
  const count = [nImg ? `${nImg} photo${nImg > 1 ? 's' : ''}` : '', nVid ? `${nVid} film${nVid > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
  const prev = WORLDS[(wi - 1 + WORLDS.length) % WORLDS.length], next = WORLDS[(wi + 1) % WORLDS.length];
  g.classList.toggle('in-space', !!opts.inSpace);
  g.innerHTML = `
    <div class="gal-inner">
      <div class="gal-head">
        <span class="mono idx">${w.n} <span class="of">/ ${String(WORLDS.length).padStart(2, '0')}</span>${w.year ? ' · ' + w.year : ''}</span>
        <div class="gal-title"><h2>${w.en}</h2>${fa(w.fa)}</div>
        <div class="gal-tools">
          <button class="ic gal-prev" aria-label="Previous world: ${prev.en}" title="${prev.en}">${ICON.prev}</button>
          <button class="ic gal-next" aria-label="Next world: ${next.en}" title="${next.en}">${ICON.next}</button>
          <button class="ic gal-close" aria-label="Close">${ICON.close}</button>
        </div>
      </div>
      <div class="gal-body">
        <aside class="gal-text">
          <p class="sub">${w.sub}<span class="sep">·</span>${fa(w.subFa)}</p>
          <p>${w.blurb}</p><p>${fa(w.blurbFa)}</p>
          ${count ? `<p class="count mono">${count}</p>` : ''}
          ${opts.extra ? `<button class="more-link gal-extra">${opts.extra}</button>` : ''}
        </aside>
        <div class="gal-media"></div>
      </div>
    </div>`;
  const media = $('.gal-media', g);
  if (!w.media.length) {
    media.innerHTML = `<div class="gal-listen"><span class="ear">${ICON.soundOn}</span><p>Listen to the explanations :)</p>${fa('به توضیحات گوش بدین :)')}</div>`;
  } else {
    const wall = el('div', 'wall');
    w.media.forEach((m, i) => {
      const b = el('button', 'tile' + (m.type === 'video' ? ' is-video' : ''));
      b.style.aspectRatio = `${m.w} / ${m.h}`;
      b.innerHTML = `<img loading="lazy" src="${m.type === 'video' ? m.thumb : (m.w > 700 || m.h > 700 ? m.thumb : m.src)}" alt="">` +
        (m.type === 'video' ? `<span class="badge">${ICON.play}</span><span class="vlabel mono">film</span>` : '');
      b.onclick = () => openLightbox(w.media, i, w.en);
      b.style.animationDelay = `${Math.min(i, 24) * 35}ms`;
      wall.append(b);
    });
    media.append(wall);
  }
  $('.gal-close', g).onclick = closeGallery;
  $('.gal-prev', g).onclick = () => galleryStep(-1);
  $('.gal-next', g).onclick = () => galleryStep(1);
  if (opts.extra) $('.gal-extra', g).onclick = () => opts.onExtra && opts.onExtra(wi);
  g.scrollTop = 0;
  g.classList.add('on');
}
export function galleryStep(d) {
  if (GAL.i < 0) return;
  const i = (GAL.i + d + WORLDS.length) % WORLDS.length;
  if (GAL.opts.onNav) GAL.opts.onNav(i);
  openGallery(i, GAL.opts);
}
export function closeGallery() {
  const g = $('#gallery');
  if (!g.classList.contains('on')) return;
  g.classList.remove('on');
  const cb = GAL.opts.onClose; GAL.i = -1; GAL.opts = {};
  cb && cb();
}
export const galleryOpen = () => $('#gallery').classList.contains('on');

/* ── floating labels attached to 3D points ────────────────── */
export class Labels {
  constructor(container) { this.c = container; this.items = []; }
  add(html, cls = '', onClick) {
    const e = el('div', 'lbl ' + cls, html);
    if (onClick) { e.classList.add('clickable'); e.addEventListener('click', onClick); }
    this.c.append(e);
    const it = { e, pos: null, alpha: 1, x: 0, y: 0 };
    this.items.push(it);
    return it;
  }
  place(it, x, y, alpha) {
    it.e.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    const a = Math.max(0, Math.min(1, alpha));
    if (Math.abs(a - it.alpha) > 0.01) { it.e.style.opacity = a.toFixed(2); it.alpha = a; }
    it.e.style.pointerEvents = a > 0.3 ? '' : 'none';
  }
}
