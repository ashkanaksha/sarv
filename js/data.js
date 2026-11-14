// ─────────────────────────────────────────────────────────────
//  All presentation text lives here. Edit freely.
//  year: fill in (e.g. "1396" or "2017") — empty years are hidden.
//  hero: the file (name inside the world's folder, as in media/manifest.js "name")
//        used as its cover — planet surface, point cloud, dot image.
// ─────────────────────────────────────────────────────────────
import { MEDIA } from '../media/manifest.js';

export const SECTIONS = [
  { n: '01', en: 'Who am I?',            fa: 'آغاز: من کیستم؟' },
  { n: '02', en: 'The Multiverse of Me', fa: 'جهان‌های من' },
  { n: '03', en: 'Connecting the Dots',  fa: 'اتصال نقطه‌ها' },
  { n: '04', en: 'All at Once',          fa: 'همه با هم' },
];

export const WORLDS = [
  { id: 'music', year: '', hero: 'سروین.jpg',
    en: 'Music', fa: 'موسیقی',
    sub: 'Choir', subFa: 'گروه کر',
    blurb: 'Years in a choir — listening before speaking, breathing with a group, holding a note until it settles.',
    blurbFa: 'سال‌ها خواندن در گروه کر؛ شنیدن پیش از گفتن، هم‌نفس شدن با جمع، و نگه داشتن یک نت تا جا بیفتد.' },

  { id: 'uni', year: '', hero: 'دانشگاه.jpg',
    en: 'University & Stage', fa: 'دانشگاه و تئاتر',
    sub: 'Architecture school · Theater', subFa: 'دانشکده معماری · تئاتر',
    blurb: 'University taught me to read space; the stage taught me how a body moves through it, under light.',
    blurbFa: 'دانشگاه خواندن فضا را یادم داد و صحنه‌ی تئاتر، حرکت بدن در فضا و زیر نور را.' },

  { id: 'sculpture', year: '', hero: 'مجسمه.jpg',
    en: 'Sculpture', fa: 'مجسمه‌سازی',
    sub: 'Bronze · Body', subFa: 'برنز · بدن',
    blurb: 'Thinking with the hands: mass, void, balance — the body as a structure.',
    blurbFa: 'فکر کردن با دست‌ها؛ حجم، تهی، تعادل — بدن به‌مثابه یک سازه.' },

  { id: 'argo', year: '', hero: 'آرگو کارخونه.jpg',
    en: 'Argo Factory', fa: 'کارخانه آرگو',
    sub: 'Industrial heritage', subFa: 'میراث صنعتی',
    blurb: 'Industrial memory, brick and light — learning on a real site, with a real team.',
    blurbFa: 'حافظه‌ی صنعتی، آجر و نور — یادگیری روی یک سایت واقعی، با یک تیم واقعی.' },

  { id: 'factory', year: '', hero: 'ایرانمال2.jp4.jpg',
    en: 'Innovation Factory', fa: 'کارخانه نوآوری آزادی',
    sub: 'Halls 7 & 8 · Iran Mall model · Diba Co.', subFa: 'سوله هفت و هشت · ماکت ایرانمال · شرکت دیبا',
    blurb: 'Building a large-scale model of Iran Mall by hand — scale, precision and teamwork on the factory floor.',
    blurbFa: 'ساخت ماکت بزرگ‌مقیاس ایرانمال با دست؛ مقیاس، دقت و کار تیمی روی کف سوله.' },

  { id: 'eureka', year: '', hero: 'IMG_7629.JPG',
    en: 'Eureka Online Architecture Magazine', fa: 'مجله آنلاین معماری یوریکا',
    short: 'Eureka Magazine', shortFa: 'مجله یوریکا',
    sub: 'Editorial & motion', subFa: 'روایت و موشن',
    blurb: 'Stories told in motion and layout — composing a frame, timing a reveal.',
    blurbFa: 'روایت با حرکت و صفحه‌آرایی؛ ترکیب‌بندی یک قاب، زمان‌بندی یک لحظه.' },

  { id: 'bysarv', year: '', hero: 'IMG_20211030_111337_307.jpg', videoFirst: true, rep: 'video', first: 'سرو ویدیو.mp4',
    en: 'by sarv', fa: 'پرسونال برند سرو',
    sub: 'Personal brand · Leather & jewelry', subFa: 'برند شخصی · چرم و زیورآلات',
    blurb: 'Leather goods and jewelry under my own name — where craft, detail and identity meet.',
    blurbFa: 'محصولات چرمی و زیورآلات با نام خودم؛ جایی که دست‌سازی، جزئیات و هویت به هم می‌رسند.' },

  { id: 'pedar', year: '', hero: 'render no.1.jpg',
    en: 'Work for My Father', fa: 'کار برای پدر',
    sub: 'Residential building', subFa: 'ساختمان مسکونی',
    blurb: 'A residential building from plan to facade — designing for family, with full responsibility.',
    blurbFa: 'یک ساختمان مسکونی از پلان تا نما؛ طراحی برای خانواده، با تمام مسئولیت.' },

  { id: 'phase2', year: '', hero: '',
    en: 'Sadra Residential Town — Phase 2 Consultant', fa: 'شهرک مسکونی صدرا – مشاور فاز 2',
    short: 'Sadra · Phase 2', shortFa: 'شهرک صدرا · فاز 2',
    sub: 'Listen to the explanations :)', subFa: 'به توضیحات گوش بدین :)',
    blurb: 'Listen to the explanations :)',
    blurbFa: 'به توضیحات گوش بدین :)', listen: true },

  { id: 'competition', year: '', hero: 'photo_2026-11-13_21-53-53.jpg',
    en: 'Architecture Competition', fa: 'مسابقه معماری',
    sub: 'Living capsule', subFa: 'کپسول زیستی',
    blurb: 'A compact living capsule for wild landscapes — one object, many places.',
    blurbFa: 'کپسولی فشرده برای زیستن در طبیعت؛ یک شیء، مکان‌های بسیار.' },

  { id: 'qaraylou', year: '', hero: 'project 1/photo_2025-12-16_23-02-06.jpg',
    en: 'Qaraylou Studio', fa: 'استودیو قرایلو',
    sub: 'Cinema hall · Interiors', subFa: 'سالن سینما · معماری داخلی',
    blurb: 'Months of collective design — from first idea to the final scheme of a cinema hall and its spaces.',
    blurbFa: 'ماه‌ها هم‌فکری و تلاش جمعی؛ از ایده تا طرح نهایی یک سالن سینما و فضاهایش.' },

  { id: 'radikal', year: '', hero: 'کانکس پیش ساخته/Scene 46.png',
    en: 'Radikal Beton', fa: 'رادیکال بتن',
    sub: 'Modular cabins · Padel club', subFa: 'کابین ماژولار · باشگاه پدل',
    blurb: 'Concrete as a language — modular cabins and a padel club; soft curves in a hard material.',
    blurbFa: 'بتن به‌مثابه زبان؛ کابین‌های ماژولار و باشگاه پدل — انحنای نرم در ماده‌ای سخت.' },
];

WORLDS.forEach((w, i) => {
  w.index = i;
  w.n = String(i + 1).padStart(2, '0');
  w.label = w.short || w.en;                       // short name for timelines and labels
  w.labelFa = w.shortFa || w.fa;
  w.raw = MEDIA[w.id] || [];                       // as in media/manifest.js
  w.byName = name => w.raw.find(m => m.name === name || m.name.endsWith('/' + name)) || null;
  w.heroItem = w.hero ? (w.byName(w.hero) || w.raw.find(m => m.type === 'image') || null) : null;
  w.media = w.videoFirst                           // order shown in galleries
    ? [...w.raw.filter(m => m.type === 'video'), ...w.raw.filter(m => m.type !== 'video')]
    : [...w.raw];
  const pin = w.first && w.byName(w.first);        // a file that must always come first
  if (pin) w.media = [pin, ...w.media.filter(m => m !== pin)];
  // the one representative shown in "The Multiverse of Me"
  w.repItem = w.rep === 'video' ? ((pin && pin.type === 'video' ? pin : null) || w.media.find(m => m.type === 'video') || w.heroItem) : w.heroItem;
});

// Section 3 — how the experiences shaped each other (from → to).
export const EDGES = [
  ['music', 'sculpture', 'Rhythm', 'ریتم',
    'The rhythm of music became the rhythm of solid and void.',
    'ریتم موسیقی، ریتم پر و خالیِ حجم شد.'],
  ['music', 'qaraylou', 'Acoustics', 'آکوستیک',
    'Years of listening made sound part of how I shape a hall.',
    'سال‌ها شنیدن، صدا را بخشی از طراحی یک سالن کرد.'],
  ['music', 'eureka', 'Timing', 'زمان‌بندی',
    'A sense of tempo in every cut and transition.',
    'حس تمپو در هر برش و هر گذار.'],
  ['uni', 'sculpture', 'Body', 'بدن',
    'Studying space led me to the body — and to sculpture.',
    'خواندن فضا مرا به بدن و به مجسمه رساند.'],
  ['uni', 'qaraylou', 'Stage', 'صحنه',
    'Theater taught me to design for an audience: sightlines, light, the moment of entry.',
    'تئاتر یادم داد برای مخاطب طراحی کنم: خط دید، نور، لحظه‌ی ورود.'],
  ['uni', 'pedar', 'Plan', 'پلان',
    'Academic plans turned into a real building for my family.',
    'پلان‌های دانشگاهی، ساختمانی واقعی برای خانواده‌ام شد.'],
  ['sculpture', 'bysarv', 'Hand', 'دست',
    'From clay to leather — the same hands, the same patience.',
    'از گِل تا چرم؛ همان دست‌ها، همان حوصله.'],
  ['sculpture', 'competition', 'Curve', 'انحنا',
    'Sculptural thinking shaped the capsule’s single, continuous form.',
    'نگاه مجسمه‌سازانه، فرم یکپارچه‌ی کپسول را ساخت.'],
  ['sculpture', 'radikal', 'Material', 'ماده',
    'Concrete treated as sculptable matter — soft edges, carved light.',
    'بتن مثل ماده‌ای شکل‌پذیر؛ لبه‌های نرم، نورِ تراشیده.'],
  ['argo', 'factory', 'Scale', 'مقیاس',
    'Real sites taught me to think at 1:1.',
    'سایت واقعی یادم داد در مقیاس یک‌به‌یک فکر کنم.'],
  ['argo', 'pedar', 'Context', 'زمینه',
    'Respect for what already exists: context before form.',
    'احترام به آنچه از قبل هست؛ زمینه پیش از فرم.'],
  ['factory', 'competition', 'Model', 'ماکت',
    'Model-making precision became prototyping a buildable object.',
    'دقت ماکت‌سازی به نمونه‌سازی یک شیء ساختنی رسید.'],
  ['factory', 'phase2', 'Workshop', 'کارگاه',
    'The factory floor became a way of working.',
    'کف کارگاه به یک شیوه‌ی کار تبدیل شد.'],
  ['eureka', 'bysarv', 'Story', 'روایت',
    'Editorial storytelling became a brand voice.',
    'روایت مجله‌ای، صدای یک برند شد.'],
  ['eureka', 'qaraylou', 'Presentation', 'ارائه',
    'Framing and motion now carry my projects to clients.',
    'قاب‌بندی و حرکت، حالا پروژه‌هایم را به کارفرما می‌رساند.'],
  ['bysarv', 'radikal', 'Detail', 'جزئیات',
    'Stitch-level care applied to concrete joints and finishes.',
    'دقتی در حد یک کوک، در درزها و جزئیات بتن.'],
  ['pedar', 'radikal', 'Living', 'زیستن',
    'Designing a home taught me what daily life asks of a space.',
    'طراحی خانه یادم داد زندگی روزمره از فضا چه می‌خواهد.'],
  ['competition', 'radikal', 'Module', 'ماژول',
    'The capsule idea grew into modular concrete cabins.',
    'ایده‌ی کپسول به کابین‌های ماژولار بتنی رسید.'],
  ['phase2', 'radikal', 'Making', 'ساختن',
    'Hands-on workshop knowledge feeds every build.',
    'دانش کارگاهی، ساختن را تغذیه می‌کند.'],
].map(([from, to, k, kFa, text, textFa]) => ({
  from: WORLDS.findIndex(w => w.id === from),
  to: WORLDS.findIndex(w => w.id === to),
  k, kFa, text, textFa,
}));

// Section 1 — the silent opening sequence (no words about the person).
export const INTRO = [
  { world: 'sculpture',   item: 'مجسمه.jpg',                    en: 'Sculpture',    fa: 'مجسمه‌سازی' },
  { world: 'factory',     item: 'ایرانمال2.jp4.jpg',            en: 'Model',        fa: 'ماکت' },
  { world: 'pedar',       item: 'render no.1.jpg',              en: 'Architecture', fa: 'معماری' },
  { world: 'bysarv',      item: 'IMG_20211030_111337_307.jpg',  en: 'Leather design', fa: 'طراحی با چرم' },
  { world: 'radikal',     item: 'Scene 46.png',                 en: 'Projects',     fa: 'پروژه‌ها' },
  { world: 'qaraylou',    item: 'photo_2025-12-16_23-02-06.jpg', en: '',            fa: '' },
  { world: 'competition', item: 'photo_2026-11-13_21-53-53.jpg', en: '',            fa: '' },
];

export const FINALE = {
  en: 'Not an architect, a musician or a sculptor —<br>a person made of every one of these.',
  fa: 'نه معمار، نه نوازنده، نه مجسمه‌ساز؛<br>انسانی که حاصل تمام این تجربه‌هاست.',
  name: 'Sarvin', nameFa: 'سروین',
};

// headings for subfolders inside a world (folder name → English)
export const GROUPS = {
  'دانشگاه': 'University', 'تئاتر': 'Theater',
  'سوله': 'Industrial hall', 'پدل': 'Padel club', 'کانکس پیش ساخته': 'Prefab cabin',
  'project 1': 'Project 1',
};

export const AUDIO = 'media/audio/intro.mp3';
export const LOGO = 'media/logo.png';
