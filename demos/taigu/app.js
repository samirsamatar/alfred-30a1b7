/* Taigu 大愚 · concept site by Dolcessi */
(() => {
"use strict";
const $ = (s, c = document) => c.querySelector(s), $$ = (s, c = document) => [...c.querySelectorAll(s)];
const TZ = "Europe/Amsterdam";
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- language ---------- */
const LANG = (() => {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "nl" || q === "en") { try { localStorage.setItem("tg-lang", q); } catch (e) {} return q; }
  try { const s = localStorage.getItem("tg-lang"); if (s === "nl" || s === "en") return s; } catch (e) {}
  return /^nl\b/i.test(navigator.language || "") ? "nl" : "en";
})();
const NL = LANG === "nl", tr = (en, nl) => (NL ? nl : en);
document.documentElement.lang = LANG;
if (NL) $$("[data-nl]").forEach(el => { el.innerHTML = el.dataset.nl; });
$("#lang").querySelector(`[data-l="${LANG}"]`).outerHTML = `<b>${LANG.toUpperCase()}</b>`;
$("#lang").addEventListener("click", () => { const to = NL ? "en" : "nl"; try { localStorage.setItem("tg-lang", to); } catch (e) {} const u = new URL(location.href); u.searchParams.set("lang", to); location.href = u.toString(); });

/* ---------- opening hours ---------- */
const DAYS = NL ? ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"] : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOUSES = {
  pijp: { name: "De Pijp", open: [null, null, null, [690, 1200], [690, 1200], [690, 1200], [690, 1140]] },
  oost: { name: "Oost", open: Array(7).fill([720, 1200]) }
};
const hm = m => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
function amsNow() {
  const p = new Intl.DateTimeFormat("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }).formatToParts(new Date());
  const g = k => p.find(x => x.type === k).value;
  return { d: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(g("weekday")), m: (+g("hour") % 24) * 60 + +g("minute") };
}
function houseStatus(h) {
  const { d, m } = amsNow(), o = h.open[d];
  if (o && m >= o[0] && m < o[1]) return { open: true, text: tr(`Open now · until ${hm(o[1])}`, `Nu open · tot ${hm(o[1])}`) };
  if (o && m < o[0]) return { open: false, text: tr(`Closed · opens today at ${hm(o[0])}`, `Gesloten · vandaag open vanaf ${hm(o[0])}`) };
  let nd = (d + 1) % 7; while (!h.open[nd]) nd = (nd + 1) % 7;
  const when = nd === (d + 1) % 7 ? tr("tomorrow", "morgen") : (NL ? DAYS[nd].toLowerCase() : DAYS[nd]);
  return { open: false, text: tr(`Closed · opens ${when} at ${hm(h.open[nd][0])}`, `Gesloten · ${when} open vanaf ${hm(h.open[nd][0])}`) };
}
function renderHours() {
  const { d } = amsNow(); const openNames = [];
  $$(".house").forEach(card => {
    const h = HOUSES[card.dataset.house], s = houseStatus(h), ul = $(".hours", card);
    if (s.open) openNames.push(h.name);
    $(".status span", card).textContent = s.text; $(".status i", card).classList.toggle("off", !s.open);
    ul.textContent = "";
    DAYS.forEach((name, i) => {
      const li = document.createElement("li"); if (i === d) li.className = "today";
      const a = document.createElement("span"); a.textContent = name;
      const b = document.createElement("span"); const o = h.open[i];
      if (o) b.textContent = `${hm(o[0])} – ${hm(o[1])}`; else { b.textContent = tr("Closed", "Gesloten"); b.className = "closed"; }
      li.append(a, b); ul.appendChild(li);
    });
  });
  $("#nav-open").textContent = openNames.length ? tr("Open now · ", "Nu open · ") + openNames.join(" & ") : tr("Closed right now", "Nu gesloten");
  $("#nav-dot").classList.toggle("off", !openNames.length);
}
renderHours(); setInterval(renderHours, 60000);

/* ---------- image sequences ---------- */
const MOBILE = () => innerWidth < 900 || innerHeight > innerWidth * 1.1;
const VARIANT = MOBILE() ? "m" : "d";
class Seq {
  constructor(dir, count, pad = 3) { this.dir = dir; this.count = count; this.pad = pad; this.imgs = new Array(count); this.ok = new Array(count).fill(false); }
  src(i) { return `${this.dir}/${String(i + 1).padStart(this.pad, "0")}.webp`; }
  load(i) {
    if (this.imgs[i]) return this.imgs[i].p;
    const im = new Image(); im.decoding = "async";
    im.p = new Promise(res => { im.onload = () => { this.ok[i] = true; res(); }; im.onerror = () => res(); });
    im.src = this.src(i); this.imgs[i] = im; return im.p;
  }
  get(i) { // nearest loaded frame
    i = Math.round(clamp(i, 0, this.count - 1));
    if (this.ok[i]) return this.imgs[i];
    for (let k = 1; k < this.count; k++) { if (this.ok[i - k]) return this.imgs[i - k]; if (this.ok[i + k]) return this.imgs[i + k]; }
    return null;
  }
  async loadAll(step = 1, start = 0) { const ps = []; for (let i = start; i < this.count; i += step) ps.push(this.load(i)); await Promise.all(ps); }
}
const story = {
  mill: new Seq(`seq/mill/${VARIANT}`, 97),
  whisk: new Seq(`seq/whisk/${VARIANT}`, 97),
  pour: new Seq(`seq/pour/${VARIANT}`, 97)
};
const FOCUS = { mill: .5, whisk: .5, pour: .5 };

const cv = $("#film-cv"), cx = cv.getContext("2d", { alpha: false });
let DPR = Math.min(devicePixelRatio || 1, 2), W = 0, H = 0;
function sizeFilm() {
  W = cv.clientWidth; H = cv.clientHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  cx.setTransform(DPR, 0, 0, DPR, 0, 0); cx.imageSmoothingQuality = "high";
}
let SX = 0, SY = 0; // shift that keeps the subject centred in the opening window
function cover(img, alpha = 1, focus = .5, zoom = 1) {
  if (!img) return;
  const iw = img.naturalWidth, ih = img.naturalHeight, s = Math.max(W / iw, H / ih) * zoom;
  const dw = iw * s, dh = ih * s, dx = (W - dw) * focus + SX, dy = (H - dh) / 2 + SY;
  cx.globalAlpha = alpha; cx.drawImage(img, dx, dy, dw, dh); cx.globalAlpha = 1;
}

/* story timeline (progress 0..1 across the pinned section) */
const T = {
  mill: [0.085, 0.355], whisk: [0.37, 0.655], pour: [0.67, 0.965],
  x0: [0.03, 0.085], x1: [0.343, 0.373], x2: [0.643, 0.673]
};
let P = 0, drawn = -1;
function frameAt(seq, range, p) { return (seq.count - 1) * clamp((p - range[0]) / (range[1] - range[0])); }
function drawStory(p) {
  cx.fillStyle = "#ECE2D2"; cx.fillRect(0, 0, W, H);
  const z = lerp(1.06, 1, ss(0, .09, p)); // gentle settle as the window opens
  const k = 1 - ss(0.0, 0.085, p);
  if (MOBILE()) { SX = 0; SY = k * (innerHeight * 0.53 - 14) / 2; } else { SX = k * (innerWidth * (0.5 - 0.035)) / 2; SY = 0; }
  if (p < T.x0[1]) { // the finished cup greets you, then dissolves back to the mill
    cover(story.pour.get(96), 1, FOCUS.pour, z);
    const a = ss(T.x0[0], T.x0[1], p); if (a > 0) cover(story.mill.get(0), a, FOCUS.mill, z);
  } else if (p < T.x1[1]) {
    cover(story.mill.get(frameAt(story.mill, T.mill, p)), 1, FOCUS.mill, z);
    const a = ss(T.x1[0], T.x1[1], p); if (a > 0) cover(story.whisk.get(0), a, FOCUS.whisk);
  } else if (p < T.x2[1]) {
    cover(story.whisk.get(frameAt(story.whisk, T.whisk, p)), 1, FOCUS.whisk);
    const a = ss(T.x2[0], T.x2[1], p); if (a > 0) cover(story.pour.get(0), a, FOCUS.pour);
  } else {
    cover(story.pour.get(frameAt(story.pour, T.pour, p)), 1, FOCUS.pour);
  }
}

/* chapters, hero, window reveal */
const film = $("#film"), heroCopy = $("#hero-copy"), chaps = $$(".chap"), rail = $(".rail"), railFill = $("#rail-fill"), railItems = $$(".rail [data-r]");
const CH = [[0.11, 0.31], [0.42, 0.62], [0.73, 1.2]];
function windowClip(p) {
  const t = ss(0.0, 0.085, p);
  if (MOBILE()) { // a framed window at the bottom that grows to full screen
    const top = lerp(innerHeight * 0.53, 0, t), side = lerp(14, 0, t), bot = lerp(14, 0, t), r = lerp(22, 0, t);
    return `inset(${top}px ${side}px ${bot}px ${side}px round ${r}px)`;
  }
  const top = lerp(innerHeight * 0.1, 0, t), right = lerp(innerWidth * 0.035, 0, t), bot = lerp(innerHeight * 0.1, 0, t), left = lerp(innerWidth * 0.5, 0, t), r = lerp(30, 0, t);
  return `inset(${top}px ${right}px ${bot}px ${left}px round ${r}px)`;
}
function applyStory(p) {
  film.style.clipPath = windowClip(p);
  const h = ss(0.015, 0.075, p);
  heroCopy.style.opacity = 1 - h; heroCopy.style.transform = `translateY(${-h * 60}px)`; heroCopy.style.visibility = h >= 1 ? "hidden" : "visible";
  chaps.forEach((c, i) => {
    const [a, b] = CH[i], v = Math.min(ss(a, a + 0.04, p), 1 - ss(b - 0.04, b, p));
    c.style.opacity = v; c.style.visibility = v <= 0.01 ? "hidden" : "visible";
    c.style.transform = `translateY(${(1 - v) * 40}px)`;
  });
  rail.style.opacity = ss(0.07, 0.11, p);
  railFill.style.transform = `scaleY(${clamp((p - 0.05) / 0.92)})`;
  const cur = p < T.x1[0] + .02 ? 1 : p < T.x2[0] + .02 ? 2 : 3;
  railItems.forEach(r => r.classList.toggle("on", +r.dataset.r === cur));
}
let raf = 0;
function render() { raf = 0; drawStory(P); applyStory(P); }
const req = () => { if (!raf) raf = requestAnimationFrame(render); };

/* ---------- loading: first frames fast, the rest streams in ---------- */
const loader = $("#loader"), ldFill = $("#ld-fill"), ldPct = $("#ld-pct");
document.documentElement.classList.add("loading");
async function boot() {
  sizeFilm();
  const first = [];
  for (let i = 0; i < 30; i += 1) first.push(story.mill.load(i));
  first.push(story.whisk.load(0), story.pour.load(0), story.pour.load(96));
  let done = 0; first.forEach(p => p.then(() => { done++; const v = done / first.length; ldFill.style.transform = `scaleX(${v})`; ldPct.textContent = Math.round(v * 100) + "%"; }));
  await Promise.race([Promise.all(first), new Promise(r => setTimeout(r, 6000))]);
  render();
  start();
  // stream the rest in story order, coarse pass first so scrubbing is never empty
  (async () => {
    for (const k of ["mill", "whisk", "pour"]) await story[k].loadAll(4);
    for (const k of ["mill", "whisk", "pour"]) await story[k].loadAll(2);
    for (const k of ["mill", "whisk", "pour"]) await story[k].loadAll(1);
    req();
  })();
  setInterval(req, 400); // repaint as frames arrive while idle
}

/* ---------- motion ---------- */
let lenis = null;
function start() {
  gsap.registerPlugin(ScrollTrigger);
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(a => a.addEventListener("click", e => { const id = a.getAttribute("href"); if (id.length > 1 && $(id)) { e.preventDefault(); lenis.scrollTo(id === "#top" ? 0 : id, { duration: 1.6 }); } }));
  }
  ScrollTrigger.create({ trigger: "#story", start: "top top", end: "bottom bottom", scrub: true, onUpdate: s => { P = s.progress; req(); } });

  // loader out, hero in
  const tl = gsap.timeline();
  tl.to(loader, { opacity: 0, duration: .7, ease: "power2.out", onComplete: () => { loader.remove(); document.documentElement.classList.remove("loading"); } })
    .from(".h-hero .ln > *", { yPercent: 110, duration: 1.3, stagger: .12, ease: "expo.out" }, "-=.35")
    .from([".hero-copy .eyebrow", ".lede", ".cta-row", ".scroll-hint"], { y: 24, opacity: 0, duration: 1, stagger: .08, ease: "expo.out" }, "-=1")
    .from(film, { opacity: 0, scale: 1.04, duration: 1.4, ease: "expo.out" }, "-=1.3")
    .from(".nav", { y: -20, opacity: 0, duration: .9, ease: "expo.out" }, "-=1.1");

  // section headings: line reveal
  $$(".h-sec").forEach(h => {
    h.innerHTML = h.innerHTML.split(/<br\s*\/?>/i).map(l => `<span class="ln" style="display:block;overflow:hidden;padding-bottom:.06em"><span style="display:inline-block">${l}</span></span>`).join("");
    gsap.from($$(".ln > span", h), { yPercent: 110, duration: 1.2, stagger: .1, ease: "expo.out", scrollTrigger: { trigger: h, start: "top 85%" } });
  });
  gsap.utils.toArray(".sweets-list li, .house, .opts fieldset").forEach(el => gsap.from(el, { y: 36, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%" } }));

  // voices: horizontal drift driven by vertical scroll (desktop), native swipe on phones
  const mm = gsap.matchMedia();
  mm.add("(min-width: 901px)", () => {
    const track = $("#track");
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    gsap.to(track, { x: () => -dist(), ease: "none", scrollTrigger: { trigger: "#voices", start: "top top", end: () => "+=" + dist(), pin: true, scrub: 1, invalidateOnRefresh: true } });
  });
  mm.add("(max-width: 900px)", () => {
    const v = $("#voices"); v.style.overflowX = "auto"; v.style.scrollSnapType = "x mandatory"; $$("#track > *").forEach(el => el.style.scrollSnapAlign = "center");
  });

  // nav turns light over dark sections
  const nav = $("#nav");
  $$(".voices, .foot").forEach(sec => ScrollTrigger.create({ trigger: sec, start: "top 40px", end: "bottom 40px", onToggle: s => nav.classList.toggle("dark", s.isActive) }));

  initCup();
  ScrollTrigger.refresh();
}

/* ---------- build your cup ---------- */
function initCup() {
  const ccv = $("#cup-cv"), cc = ccv.getContext("2d", { alpha: false });
  const seqs = { matcha: new Seq("seq/cup-matcha", 49, 2), hojicha: new Seq("seq/cup-hojicha", 49, 2), straw: new Seq("seq/cup-straw", 49, 2) };
  const form = $("#opts"), lblStraw = $("#lbl-straw");
  const st = { f: 48, key: "matcha" };
  const NAMES = {
    matcha: { jp: "抹茶ラテ", en: "Iced matcha latte", nl: "IJskoude matcha latte" },
    straw: { jp: "苺抹茶ラテ", en: "Iced strawberry matcha", nl: "IJskoude aardbeien-matcha" },
    hojicha: { jp: "ほうじ茶ラテ", en: "Iced hojicha latte", nl: "IJskoude hojicha latte" }
  };
  const draw = () => {
    const img = seqs[st.key].get(st.f);
    cc.fillStyle = "#E9DCC7"; cc.fillRect(0, 0, 720, 674);
    if (img) cc.drawImage(img, 0, 0, 720, 674);
  };
  let tween = null;
  const play = async key => {
    st.key = key;
    await Promise.all([seqs[key].load(0), seqs[key].load(48)]);
    seqs[key].loadAll(1);
    if (tween) tween.kill();
    st.f = reduce ? 48 : 0; draw();
    tween = gsap.to(st, { f: 48, duration: reduce ? 0 : 2.2, ease: "power1.inOut", onUpdate: draw });
  };
  const val = n => form.querySelector(`input[name="${n}"]:checked`).value;
  const label = () => {
    const tea = val("tea"), base = val("base"), milk = val("milk"), top = val("top");
    const key = tea === "hojicha" ? "hojicha" : base === "straw" ? "straw" : "matcha";
    const n = NAMES[key];
    $("#cup-jp").textContent = n.jp; $("#cup-title").textContent = NL ? n.nl : n.en;
    const bits = [tea === "hojicha" ? "Hojicha" : "Matcha", milk === "oat" ? tr("oat milk", "havermelk") : tr("milk", "melk")];
    if (key === "straw") bits.push(tr("strawberry purée", "aardbeienpuree"));
    if (top === "mochi") bits.push(tr("+ shiratama mochi", "+ shiratama-mochi"));
    if (top === "bean") bits.push(tr("+ red bean", "+ rode boon"));
    $("#cup-sub").textContent = bits.join(" · ");
    return key;
  };
  form.addEventListener("change", e => {
    const tea = val("tea");
    lblStraw.classList.toggle("dis", tea === "hojicha");
    if (tea === "hojicha" && val("base") === "straw") form.querySelector('input[name="base"][value="none"]').checked = true;
    const key = label();
    if (key !== st.key || e.target.name === "tea" || e.target.name === "base") play(key);
  });
  label();
  ScrollTrigger.create({ trigger: ".cup-view", start: "top 85%", once: true, onEnter: () => { play("matcha"); setTimeout(() => { seqs.straw.loadAll(2); seqs.hojicha.loadAll(2); }, 2500); } });
}

addEventListener("resize", () => { DPR = Math.min(devicePixelRatio || 1, 2); sizeFilm(); req(); });
boot();
})();
