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
  if (changed && !reducedMotion.matches) stage.classList.add("is-transitioning");
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
    if (changed && !reducedMotion.matches) {
      requestAnimationFrame(() => stage.classList.remove("is-transitioning"));
    } else {
      stage.classList.remove("is-transitioning");
    }
    updatePhase(activePhase);
  };
  if (reducedMotion.matches || !changed) {
    commit();
  } else {
    stageImage.classList.add("is-changing");
    window.setTimeout(commit, 320);
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
    window.scrollTo({ top: top + distance * (index / 2), behavior: reducedMotion.matches ? "instant" : "smooth" });
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
  return desktopMotion.matches && !reducedMotion.matches;
}

function updateMotionTargets() {
  if (reducedMotion.matches) return;
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
  if (reducedMotion.matches) return;
  motion.hero += (motion.heroTarget - motion.hero) * .115;
  motion.journey += (motion.journeyTarget - motion.journey) * .14;

  const heroP = motion.hero;
  const heroFade = 1 - smoothStep((heroP - .13) / .40);
  const finalFade = smoothStep((heroP - .55) / .36);
  hero.style.setProperty("--hero-scale", (1 + .22 * heroP).toFixed(4));
  hero.style.setProperty("--hero-brightness", (1 - .3 * heroP).toFixed(3));
  hero.style.setProperty("--hero-copy-opacity", heroFade.toFixed(3));
  hero.style.setProperty("--hero-copy-shift", `${(-110 * heroP).toFixed(1)}px`);
  hero.style.setProperty("--hero-final-opacity", finalFade.toFixed(3));
  hero.style.setProperty("--hero-final-shift", `${(55 * (1 - finalFade)).toFixed(1)}px`);
  hero.style.setProperty("--hero-final-shade", (.35 * finalFade).toFixed(3));
  hero.style.setProperty("--hero-line-width", `${(110 * finalFade).toFixed(1)}px`);

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

// The product's light subtly follows the pointer. Keyboard and touch use a fixed composition.
$$(".fragrance-card-button").forEach(card => {
  card.addEventListener("pointermove", event => {
    if (event.pointerType === "touch" || reducedMotion.matches) return;
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

if ("IntersectionObserver" in window && !reducedMotion.matches) {
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
  if (event.matches) $$(".reveal").forEach(element => element.classList.add("is-visible"));
});

updatePhase(0);
