// Maison Velora: a deliberately lightweight, accessible editorial experience.
// Fragrance names and compositions are fictional concept content.
const fragrances = [
  {
    name: "Éclipse", number: "01", slug: "eclipse", family: "AMBER · IRIS · BERGAMOT",
    descriptor: "THE GOLDEN SHADOW",
    quote: "For the ones who know that the most beautiful light arrives just before dark.",
    feeling: "Warm. Intimate. Magnetic.", moment: "When the day turns to gold.",
    intro: "Smoked amber wrapped in velvet iris. Éclipse is the hush after the last ray of sunlight — warm, intimate and impossible to place.",
    top: "Bergamot · Black pepper", heart: "Iris · Incense", base: "Smoked amber · Sandalwood",
    image: "./assets/eclipse.webp", outline: "É", side: "THE SCENT OF AN AFTERIMAGE",
    notes: ["BERGAMOT & BLACK PEPPER", "IRIS & INCENSE", "SMOKED AMBER & SANDALWOOD"]
  },
  {
    name: "Solenne", number: "02", slug: "solenne", family: "WHITE FLORALS · SUEDE · MUSK",
    descriptor: "THE SOFT RADIANCE",
    quote: "For the presence that does not demand attention — and is all the more unforgettable.",
    feeling: "Luminous. Calm. Effortless.", moment: "The quiet promise of morning.",
    intro: "White petals against bare skin. Solenne is a soft kind of confidence — the space between morning light and the first word.",
    top: "Pear · Neroli", heart: "Orange blossom · Jasmine", base: "Soft suede · White musk",
    image: "./assets/solenne.webp", outline: "S", side: "THE LIGHT OF A FIRST MOMENT",
    notes: ["PEAR & NEROLI", "ORANGE BLOSSOM & JASMINE", "SOFT SUEDE & WHITE MUSK"]
  },
  {
    name: "Vesper", number: "03", slug: "vesper", family: "DARK ROSE · OUD · SAFFRON",
    descriptor: "THE AFTER HOURS",
    quote: "For nights that keep their secrets, and encounters that need no explanation.",
    feeling: "Enigmatic. Velvet. Bold.", moment: "Somewhere past midnight.",
    intro: "Dark petals, burnished woods and a spark of spice. Vesper lingers like an unfinished conversation after midnight.",
    top: "Saffron · Pink pepper", heart: "Black rose · Plum", base: "Oud · Patchouli",
    image: "./assets/vesper.webp", outline: "V", side: "THE MYSTERY AFTER MIDNIGHT",
    notes: ["SAFFRON & PINK PEPPER", "BLACK ROSE & PLUM", "OUD & PATCHOULI"]
  }
];

const phases = [
  {
    badge: "01 — TOP NOTES",
    description: "The first encounter. Bright, fleeting notes introduce the fragrance before gently making way for its deeper character."
  },
  {
    badge: "02 — HEART NOTES",
    description: "As the first spark softens, the true personality takes shape. Floral, spiced or textured notes become the soul of the composition."
  },
  {
    badge: "03 — BASE NOTES",
    description: "The final trace. Warm woods, amber and musk settle close to the skin — the part of a fragrance that becomes a memory."
  }
];

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const motionPreference = "maison-velora-motion";
let storedMotion = null;
try { storedMotion = window.localStorage.getItem(motionPreference); } catch { /* Browsers may block storage. */ }
let motionEnabled = storedMotion === "on" || (storedMotion === null && !reducedMotion.matches);
document.documentElement.classList.toggle("motion-forced", motionEnabled);
document.documentElement.classList.toggle("motion-disabled", !motionEnabled);
if (motionEnabled) {
  document.documentElement.classList.add("motion-boot");
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add("motion-ready")));
}
const header = $("#header");
const progress = $("#scrollProgress");
const experience = $("#discover");
const stageImage = $("#stageImage");
const stage = $("#experienceStage");
const heroSequence = $("#heroSequence");
const hero = $(".hero");
const scentJourney = $("#scentJourney");
const manifesto = $("#philosophy");
const editorial = $(".editorial");
const dialog = $("#scentDialog");
let activeScent = 0;
let activePhase = 0;
let changeTicket = 0;
let ticking = false;
let manualSelectionUntil = 0;

function setScent(index, { focus = false } = {}) {
  const chosen = fragrances[index];
  if (!chosen) return;
  const changed = activeScent !== index;
  activeScent = index;
  const ticket = ++changeTicket;
  if (changed && motionEnabled) stage.classList.add("is-transitioning");
  const commit = () => {
    if (ticket !== changeTicket) return;
    experience.dataset.mood = chosen.slug;
    $("#stageCount").textContent = `${chosen.number} / 03 — ${chosen.family}`;
    $("#stageDescriptor").textContent = chosen.descriptor;
    $("#stageTitle").innerHTML = `${chosen.name}<span class="stage-period">.</span>`;
    $("#stageQuote").textContent = chosen.quote;
    $("#stageFeeling").textContent = chosen.feeling;
    $("#stageMoment").textContent = chosen.moment;
    $("#productOutline").textContent = chosen.outline;
    $("#productNo").textContent = chosen.number;
    $("#stageSide").textContent = chosen.side;
    stageImage.src = chosen.image;
    stageImage.alt = `${chosen.name} fragrance bottle`;
    stageImage.classList.remove("is-changing");
    if (changed && motionEnabled) {
      requestAnimationFrame(() => stage.classList.remove("is-transitioning"));
    } else {
      stage.classList.remove("is-transitioning");
    }
    updatePhase(activePhase);
  };
  if (!motionEnabled || !changed) {
    commit();
  } else {
    stageImage.classList.add("is-changing");
    window.setTimeout(commit, 520);
  }
  $$(".scent-option").forEach((button, i) => {
    button.classList.toggle("is-active", i === index);
    button.setAttribute("aria-pressed", String(i === index));
  });
  if (focus) $$(".scent-option")[index].focus();
}

function updatePhase(index) {
  if (!phases[index]) return;
  activePhase = index;
  $("#phaseBadge").textContent = phases[index].badge;
  $("#phaseDescription").textContent = phases[index].description;
  $("#phaseExamples").textContent = `${fragrances[activeScent].name.toUpperCase()}: ${fragrances[activeScent].notes[index]}`;
  $$(".note-phase").forEach((button, i) => {
    button.classList.toggle("is-active", i === index);
    button.setAttribute("aria-pressed", String(i === index));
  });
}

function selectScentByUser(index, options = {}) {
  manualSelectionUntil = performance.now() + 1800;
  setScent(index, options);
  if (canRunJourney()) {
    const distance = scentJourney.offsetHeight - window.innerHeight;
    const top = window.scrollY + scentJourney.getBoundingClientRect().top;
    window.scrollTo({ top: top + distance * (index / 2), behavior: motionEnabled ? "smooth" : "instant" });
  }
}

$$(".scent-option").forEach((button, index) => {
  button.addEventListener("click", () => selectScentByUser(index));
  button.addEventListener("keydown", event => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const offset = event.key === "ArrowRight" ? 1 : -1;
      selectScentByUser((index + offset + fragrances.length) % fragrances.length, { focus: true });
    }
  });
});
$$(".note-phase").forEach((button, index) => button.addEventListener("click", () => updatePhase(index)));
$("#stageDiscover").addEventListener("click", () => openScent(activeScent));
$$("[data-open]").forEach(button => button.addEventListener("click", () => openScent(Number(button.dataset.open))));

function openScent(index) {
  const scent = fragrances[index];
  if (!scent || !dialog) return;
  $("#dialogKicker").textContent = `NO. ${scent.number} — ${scent.descriptor}`;
  $("#dialogTitle").textContent = scent.name;
  $("#dialogDescription").textContent = scent.intro;
  $("#dialogTop").textContent = scent.top;
  $("#dialogHeart").textContent = scent.heart;
  $("#dialogBase").textContent = scent.base;
  $("#dialogMoment").textContent = scent.moment;
  $("#dialogImage").src = scent.image;
  $("#dialogImage").alt = `${scent.name} perfume bottle`;
  const visual = $(".dialog-visual");
  visual.style.background = [
    "radial-gradient(circle at 50% 50%,#816348,#2e211a 72%)",
    "radial-gradient(circle at 50% 50%,#b7ae96,#656354 72%)",
    "radial-gradient(circle at 50% 50%,#805166,#2b1928 72%)"
  ][index];
  dialog.showModal();
  document.body.classList.add("dialog-open");
}

function closeScent() {
  if (dialog.open) dialog.close();
}
$("#dialogClose").addEventListener("click", closeScent);
$("#dialogDone").addEventListener("click", closeScent);
dialog.addEventListener("close", () => document.body.classList.remove("dialog-open"));
dialog.addEventListener("click", event => {
  if (event.target === dialog) closeScent();
});

const menuButton = $("#menuButton");
const mobileNav = $("#mobileNav");
function setMenu(open) {
  document.body.classList.toggle("menu-open", open);
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  mobileNav.inert = !open;
  if (open) mobileNav.querySelector("a").focus();
}
menuButton.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
$$(".mobile-nav a").forEach(link => link.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && document.body.classList.contains("menu-open")) setMenu(false);
});

function updateScrollUi() {
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  progress.style.width = `${Math.min(100, (window.scrollY / maxScroll) * 100)}%`;
  header.classList.toggle("is-scrolled", window.scrollY > 38);
  updateMotionTargets();
  ticking = false;
}
window.addEventListener("scroll", () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(updateScrollUi);
}, { passive: true });
window.addEventListener("resize", updateScrollUi, { passive: true });

// Cinematic scroll director: smooth values are separate from raw wheel deltas.
// Nothing traps or intercepts the visitor's natural scrolling.
const clamp01 = value => Math.max(0, Math.min(1, value));
const smoothStep = value => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const motion = { hero: 0, journey: 0, heroTarget: 0, journeyTarget: 0, raf: 0 };
const desktopMotion = window.matchMedia("(min-width: 761px)");

function canRunJourney() {
  return desktopMotion.matches && motionEnabled;
}

function updateMotionTargets() {
  if (!motionEnabled) return;
  const heroRect = heroSequence.getBoundingClientRect();
  const heroTravel = Math.max(1, heroSequence.offsetHeight - window.innerHeight);
  motion.heroTarget = clamp01(-heroRect.top / heroTravel);

  const journeyRect = scentJourney.getBoundingClientRect();
  const journeyTravel = Math.max(1, scentJourney.offsetHeight - window.innerHeight);
  motion.journeyTarget = clamp01(-journeyRect.top / journeyTravel);
  if (!motion.raf) motion.raf = requestAnimationFrame(directMotion);
}

function directMotion() {
  motion.raf = 0;
  if (!motionEnabled) return;
  motion.hero += (motion.heroTarget - motion.hero) * .115;
  motion.journey += (motion.journeyTarget - motion.journey) * .14;

  const heroP = motion.hero;
  const heroFade = 1 - smoothStep((heroP - .09) / .3);
  const finalFade = smoothStep((heroP - .43) / .29);
  hero.style.setProperty("--hero-scale", (1 + .57 * heroP).toFixed(4));
  hero.style.setProperty("--hero-brightness", (1 - .53 * heroP).toFixed(3));
  hero.style.setProperty("--hero-copy-opacity", heroFade.toFixed(3));
  hero.style.setProperty("--hero-copy-shift", `${(-195 * heroP).toFixed(1)}px`);
  hero.style.setProperty("--hero-copy-x", `${(-130 * heroP).toFixed(1)}px`);
  hero.style.setProperty("--hero-copy-blur", `${(7 * (1 - heroFade)).toFixed(1)}px`);
  hero.style.setProperty("--hero-final-opacity", finalFade.toFixed(3));
  hero.style.setProperty("--hero-final-shift", `${(55 * (1 - finalFade)).toFixed(1)}px`);
  hero.style.setProperty("--hero-final-shade", (.75 * finalFade).toFixed(3));
  hero.style.setProperty("--hero-line-width", `${(180 * finalFade).toFixed(1)}px`);
  hero.style.setProperty("--sillage-opacity", (1 - .72 * heroP).toFixed(3));

  const manifestoProgress = clamp01((window.innerHeight - manifesto.getBoundingClientRect().top) / (manifesto.offsetHeight * .65));
  manifesto.style.setProperty("--manifesto-line", `${(100 * smoothStep(manifestoProgress)).toFixed(2)}%`);
  if (editorial) {
    const rect = editorial.getBoundingClientRect();
    const travel = clamp01((window.innerHeight - rect.top) / (window.innerHeight + rect.height));
    editorial.style.setProperty("--editorial-shift", `${((travel - .5) * -54).toFixed(2)}px`);
  }
  if (canRunJourney()) {
    $("#journeyFill").style.width = `${(100 * motion.journey).toFixed(2)}%`;
    const nextChapter = Math.min(2, Math.floor(motion.journey * 3));
    if (performance.now() > manualSelectionUntil && nextChapter !== activeScent) setScent(nextChapter);
  }

  if (Math.abs(motion.hero - motion.heroTarget) > .001 || Math.abs(motion.journey - motion.journeyTarget) > .001) {
    motion.raf = requestAnimationFrame(directMotion);
  }
}

// Visitors can explicitly override a system-level reduce-motion setting.
// The control is visible, and the selection is remembered across visits.
const motionToggle = $("#motionToggle");
const motionStatus = $("#motionStatus");
const heroSillage = $("#heroSillage");
const sillageContext = heroSillage?.getContext("2d", { alpha: true });
let sillageFrame = 0;
let sillageWidth = 0;
let sillageHeight = 0;
const sillageDots = Array.from({ length: 34 }, (_, index) => ({
  seed: ((index * 47) % 53) / 53,
  row: ((index * 19) % 41) / 41,
  speed: .6 + ((index * 13) % 17) / 20,
  radius: 1.1 + ((index * 7) % 11) / 6,
  arc: ((index * 11) % 19) / 19
}));

function resizeSillage() {
  if (!sillageContext) return;
  const bounds = hero.getBoundingClientRect();
  const scale = Math.min(window.devicePixelRatio || 1, 1.5);
  sillageWidth = Math.max(1, bounds.width);
  sillageHeight = Math.max(1, bounds.height);
  heroSillage.width = Math.round(sillageWidth * scale);
  heroSillage.height = Math.round(sillageHeight * scale);
  sillageContext.setTransform(scale, 0, 0, scale, 0, 0);
}

function paintSillage(time) {
  sillageFrame = 0;
  if (!motionEnabled || document.hidden || !sillageContext) return;
  const rect = hero.getBoundingClientRect();
  if (rect.bottom > 0 && rect.top < window.innerHeight) {
    const ctx = sillageContext;
    ctx.clearRect(0, 0, sillageWidth, sillageHeight);
    ctx.lineCap = "round";
    for (const mote of sillageDots) {
      const journey = ((time * .000013 * mote.speed + mote.seed) % 1);
      const x = (-.12 + 1.01 * journey) * sillageWidth;
      const wave = Math.sin(journey * 7.5 + mote.arc * 9.2 + time * .00022) * 46;
      const y = (.18 + mote.row * .69) * sillageHeight + wave;
      const length = 14 + mote.speed * 36;
      const opacity = Math.sin(journey * Math.PI) * (.23 + mote.arc * .40);
      ctx.beginPath();
      ctx.moveTo(x - length, y + 11);
      ctx.quadraticCurveTo(x - length * .5, y - 12, x, y);
      ctx.strokeStyle = `rgba(246,190,124,${(opacity * .42).toFixed(3)})`;
      ctx.lineWidth = mote.radius * .7;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, mote.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,225,179,${opacity.toFixed(3)})`;
      ctx.shadowColor = "#e6a062";
      ctx.shadowBlur = mote.radius * 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
  sillageFrame = requestAnimationFrame(paintSillage);
}

function startSillage() {
  if (!sillageContext || sillageFrame || !motionEnabled || document.hidden) return;
  resizeSillage();
  sillageFrame = requestAnimationFrame(paintSillage);
}

function stopSillage() {
  if (sillageFrame) cancelAnimationFrame(sillageFrame);
  sillageFrame = 0;
  sillageContext?.clearRect(0, 0, sillageWidth, sillageHeight);
}

function setMotionEnabled(enabled, persist = true) {
  motionEnabled = enabled;
  if (persist) {
    storedMotion = enabled ? "on" : "off";
    try { window.localStorage.setItem(motionPreference, storedMotion); } catch { /* Storage is optional. */ }
  }
  document.documentElement.classList.toggle("motion-forced", enabled);
  document.documentElement.classList.toggle("motion-disabled", !enabled);
  motionToggle.classList.toggle("is-on", enabled);
  motionToggle.setAttribute("aria-pressed", String(enabled));
  motionToggle.setAttribute("aria-label", enabled ? "Turn animations off" : "Turn animations on");
  motionStatus.textContent = enabled ? "MOTION ON" : "MOTION OFF";
  if (enabled) {
    document.documentElement.classList.add("motion-ready");
    updateMotionTargets();
    startSillage();
  } else {
    stopSillage();
    if (motion.raf) cancelAnimationFrame(motion.raf);
    motion.raf = 0;
    $$(".reveal").forEach(element => element.classList.add("is-visible"));
  }
}

motionToggle.addEventListener("click", () => setMotionEnabled(!motionEnabled));
$("#replayIntro").addEventListener("click", () => {
  if (!motionEnabled) setMotionEnabled(true);
  window.scrollTo({ top: 0, behavior: "instant" });
  document.documentElement.classList.remove("motion-ready");
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.setTimeout(() => document.documentElement.classList.add("motion-ready"), 100);
  }));
});

hero.addEventListener("pointermove", event => {
  if (!motionEnabled || event.pointerType === "touch") return;
  const rect = hero.getBoundingClientRect();
  const x = clamp01((event.clientX - rect.left) / rect.width) - .5;
  const y = clamp01((event.clientY - rect.top) / rect.height) - .5;
  hero.style.setProperty("--hero-pan-x", `${(-x * 48).toFixed(1)}px`);
  hero.style.setProperty("--hero-pan-y", `${(-y * 29).toFixed(1)}px`);
});
hero.addEventListener("pointerleave", () => {
  hero.style.setProperty("--hero-pan-x", "0px");
  hero.style.setProperty("--hero-pan-y", "0px");
});

const experienceProduct = $("#experienceProduct");
experienceProduct.addEventListener("pointermove", event => {
  if (!motionEnabled || event.pointerType === "touch") return;
  const rect = experienceProduct.getBoundingClientRect();
  const x = clamp01((event.clientX - rect.left) / rect.width) - .5;
  const y = clamp01((event.clientY - rect.top) / rect.height) - .5;
  experienceProduct.style.setProperty("--bottle-ry", `${(x * 19).toFixed(2)}deg`);
  experienceProduct.style.setProperty("--bottle-rx", `${(-y * 12).toFixed(2)}deg`);
  experienceProduct.parentElement.style.setProperty("--stage-glow-x", `${(x * 90).toFixed(1)}px`);
});
experienceProduct.addEventListener("pointerleave", () => {
  experienceProduct.style.removeProperty("--bottle-ry");
  experienceProduct.style.removeProperty("--bottle-rx");
  experienceProduct.parentElement.style.removeProperty("--stage-glow-x");
});

window.addEventListener("resize", resizeSillage, { passive: true });
document.addEventListener("visibilitychange", () => document.hidden ? stopSillage() : startSillage());
setMotionEnabled(motionEnabled, false);

// The product's light subtly follows the pointer. Keyboard and touch use a fixed composition.
$$(".fragrance-card-button").forEach(card => {
  card.addEventListener("pointermove", event => {
    if (event.pointerType === "touch" || !motionEnabled) return;
    const rect = card.getBoundingClientRect();
    const x = clamp01((event.clientX - rect.left) / rect.width);
    const y = clamp01((event.clientY - rect.top) / rect.height);
    card.style.setProperty("--tilt-x", `${((.5 - y) * 6).toFixed(2)}deg`);
    card.style.setProperty("--tilt-y", `${((x - .5) * 6).toFixed(2)}deg`);
    card.style.setProperty("--glint-x", `${(x * 100).toFixed(1)}%`);
    card.style.setProperty("--glint-y", `${(y * 100).toFixed(1)}%`);
  }, { passive: true });
  card.addEventListener("pointerleave", () => {
    card.style.removeProperty("--tilt-x");
    card.style.removeProperty("--tilt-y");
    card.style.removeProperty("--glint-x");
    card.style.removeProperty("--glint-y");
  });
});

desktopMotion.addEventListener?.("change", updateMotionTargets);
window.addEventListener("pageshow", updateMotionTargets);
updateScrollUi();

if ("IntersectionObserver" in window && motionEnabled) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: .06 });
  $$(".reveal").forEach(element => revealObserver.observe(element));
} else {
  $$(".reveal").forEach(element => element.classList.add("is-visible"));
}
reducedMotion.addEventListener?.("change", event => {
  if (storedMotion !== null) return;
  setMotionEnabled(!event.matches, false);
});

updatePhase(0);
