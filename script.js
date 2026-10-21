(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const body = document.body;
  let lowPower = Boolean(
    (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
    navigator.connection?.saveData ||
    window.matchMedia('(pointer: coarse)').matches
  );
  body.classList.toggle('perf-lite', lowPower);
  let motionOff = prefersReduced.matches;
  let explicitMotionChoice = false;
  let viewH = innerHeight;
  let scrollY = window.scrollY;
  let targetMouseX = innerWidth / 2, targetMouseY = innerHeight / 2;
  let mouseX = targetMouseX, mouseY = targetMouseY;
  let pointerSeen = false;
  let needsScrollUpdate = true;
  let pointerDirty = false;
  let frameScheduled = false;
  let interactionBurstUntil = 0;
  let previousFrameTime = 0;
  let sampledFrames = 0;
  let slowFrames = 0;
  function scheduleFrame() {
    if (frameScheduled || document.hidden) return;
    frameScheduled = true;
    requestAnimationFrame(frameLoop);
  }

  // Timed curtain with a no-animation fallback, so images never block the page.
  const loader = $('#preloader');
  let loaded = false;
  const revealSite = () => {
    if (loaded) return;
    loaded = true;
    setTimeout(() => { loader.classList.add('loaded'); }, motionOff ? 30 : 650);
    setTimeout(() => { loader.remove(); }, motionOff ? 500 : 2100);
  };
  if (document.readyState === 'complete') revealSite();
  else window.addEventListener('load', revealSite, { once: true });
  setTimeout(revealSite, 3400);

  // Intersection reveals: minimal layout work, replay-free.
  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          entry.target.querySelector('.image-reveal')?.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -20px 0px' })
    : null;
  $$('.reveal, .image-reveal').forEach(el => {
    // Clip-path completely hides a frame from IntersectionObserver,
    // so observe its visible parent before revealing the frame.
    const observed = el.classList.contains('image-reveal') ? el.parentElement : el;
    if (observer) observer.observe(observed);
    else el.classList.add('visible');
  });

  // Header and accessible navigation menu.
  const header = $('#siteHeader'), menuToggle = $('#menuToggle'), menu = $('#mobileMenu');
  function closeMenu() {
    body.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open menu');
    menu.setAttribute('aria-hidden', 'true');
  }
  menuToggle.addEventListener('click', () => {
    const opening = !body.classList.contains('menu-open');
    body.classList.toggle('menu-open', opening);
    menuToggle.setAttribute('aria-expanded', String(opening));
    menuToggle.setAttribute('aria-label', opening ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', String(!opening));
  });
  $$('a', menu).forEach(link => link.addEventListener('click', closeMenu));
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && body.classList.contains('menu-open')) closeMenu();
  });

  // Toggle off decorative animations without removing functionality.
  const motionToggle = $('#motionToggle');
  const motionNotice = $('#motionNotice');
  function syncMotion() {
    body.classList.toggle('motion-off', motionOff);
    document.documentElement.classList.toggle('force-motion', explicitMotionChoice && !motionOff);
    motionToggle.setAttribute('aria-pressed', String(motionOff));
    motionToggle.setAttribute('aria-label', motionOff ? 'Resume motion effects' : 'Pause motion effects');
    motionToggle.lastElementChild.textContent = motionOff ? 'MOTION OFF' : 'MOTION ON';
    motionNotice.hidden = !motionOff;
    needsScrollUpdate = true;
    scheduleFrame();
  }
  motionToggle.addEventListener('click', () => { explicitMotionChoice = true; motionOff = !motionOff; syncMotion(); });
  motionNotice.addEventListener('click', () => { explicitMotionChoice = true; motionOff = false; syncMotion(); });
  prefersReduced.addEventListener?.('change', e => { if (!explicitMotionChoice) { motionOff = e.matches; syncMotion(); } });
  syncMotion();

  const hero = $('#hero'), heroImage = $('#heroImage'), glow = $('#heroGlow');
  const heroScene = $('#heroScene'), heroContent = $('.hero-content'), heroTransition = $('#heroTransition');
  const maison = $('#maison'), maisonVisual = $('.maison-visual');
  const ritualSection = $('#ritual'), ritualStage = $('#ritualStage'), ritualBottle = $('#ritualBottle');
  const notes = $$('.ritual-note'), steps = $$('.ritual-steps span');
  const beauty = $('#beauty'), beautyImage = $('#beautyImage');
  const statement = $('#statement'), statementTitle = $('.statement-title');
  let activeNote = -1;
  function updateScroll() {
    scrollY = window.scrollY;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - viewH);
    $('#pageProgress').style.transform = 'scaleX(' + (scrollY / maxScroll).toFixed(5) + ')';
    header.classList.toggle('scrolled', scrollY > 30);
    if (motionOff) return;

    const sceneRect = heroScene.getBoundingClientRect();
    if (sceneRect.bottom > 0 && sceneRect.top < viewH) {
      const p = clamp(-sceneRect.top / Math.max(sceneRect.height - viewH, 1), 0, 1);
      hero.style.setProperty('--scene-progress', p.toFixed(4));
      hero.style.setProperty('--hero-frame-y', (p * 7.5).toFixed(2) + '%');
      hero.style.setProperty('--hero-frame-x', (p * 6.2).toFixed(2) + '%');
      hero.style.setProperty('--hero-frame-radius', (p * 36).toFixed(1) + 'px');
      heroImage.style.transform = 'scale(' + (1.10 + p * .49).toFixed(3) + ') translate3d(var(--hero-mx,0px), ' + (p * -54).toFixed(1) + 'px, 0)';
      heroContent.style.opacity = String(1 - clamp(p * 2.65, 0, 1));
      heroContent.style.transform = 'translate3d(0,calc(-43% - ' + (p * 125).toFixed(1) + 'px),0)';
      const emergence = clamp((p - .31) / .38, 0, 1);
      const departure = 1 - clamp((p - .84) / .16, 0, 1);
      heroTransition.style.opacity = String(emergence * departure);
      heroTransition.style.transform = 'translate3d(-50%,calc(-50% + ' + (1 - emergence) * 100 + 'px),0) scale(' + (.72 + emergence * .36).toFixed(3) + ')';
    }
    const maisonRect = maison.getBoundingClientRect();
    if (maisonRect.top < viewH && maisonRect.bottom > 0) {
      const p = clamp((viewH - maisonRect.top) / (viewH + maisonRect.height), 0, 1);
      maisonVisual.style.setProperty('--maison-shift', ((.5 - p) * 115).toFixed(1) + 'px');
      maisonVisual.style.setProperty('--maison-scale', (1.06 - p * .06).toFixed(3));
    }
    const ritualRect = ritualSection.getBoundingClientRect();
    const distance = Math.max(1, ritualRect.height - viewH);
    if (ritualRect.top <= viewH && ritualRect.bottom >= 0) {
      const p = clamp(-ritualRect.top / distance, 0, 1);
      ritualStage.style.setProperty('--ritual-progress', p.toFixed(3));
      ritualBottle.style.setProperty('--ritual-y', (Math.sin(p * Math.PI * 2) * -70).toFixed(1) + 'px');
      ritualBottle.style.setProperty('--ritual-r', ((p - .5) * 24).toFixed(2) + 'deg');
      ritualBottle.style.setProperty('--ritual-scale', (.85 + Math.sin(p * Math.PI) * .42).toFixed(3));
      const note = Math.min(2, Math.floor(p * 3));
      if (note !== activeNote) {
        activeNote = note;
        notes.forEach((el, i) => el.classList.toggle('is-active', i === note));
        steps.forEach((el, i) => el.classList.toggle('is-active', i === note));
        ritualStage.style.backgroundColor = ['#170e10', '#2b1a20', '#24120f'][note];
      }
    }
    const beautyRect = beauty.getBoundingClientRect();
    if (beautyRect.bottom > 0 && beautyRect.top < viewH) {
      const progress = clamp((viewH - beautyRect.top) / (viewH + beautyRect.height), 0, 1);
      beautyImage.style.setProperty('--beauty-parallax', ((progress - .5) * 165).toFixed(1) + 'px');
      const opening = clamp((progress - .05) * 2.7, 0, 1);
      beauty.style.setProperty('--beauty-open', opening.toFixed(3));
      beauty.style.setProperty('--beauty-mask', ((1 - opening) * 42).toFixed(1) + '%');
    }
    const statementRect = statement.getBoundingClientRect();
    if (statementRect.top < viewH && statementRect.bottom > 0) {
      const p = clamp((viewH - statementRect.top) / (viewH + statementRect.height), 0, 1);
      statement.style.setProperty('--statement-progress', p.toFixed(3));
      statementTitle.style.setProperty('--statement-shift', ((p - .5) * -52).toFixed(1) + 'px');
    }
  }
  window.addEventListener('scroll', () => {
    needsScrollUpdate = true;
    interactionBurstUntil = performance.now() + 700;
    scheduleFrame();
  }, { passive: true });
  window.addEventListener('resize', () => { viewH = innerHeight; needsScrollUpdate = true; updateTrack(); scheduleFrame(); }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { needsScrollUpdate = true; scheduleFrame(); }
  });

  // Only run the decorative particles while their scene is actually visible.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      ritualStage.classList.toggle('is-in-view', entry.isIntersecting && !motionOff);
    }, { rootMargin: '50px' }).observe(ritualStage);
  } else {
    ritualStage.classList.add('is-in-view');
  }

  // Soft trailing cursor, hover labels, magnetic controls, and spotlight.
  const cursorDot = $('#cursorDot'), cursorHalo = $('#cursorHalo');
  let hoveredMagnet = null;
  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    pointerSeen = true;
    targetMouseX = event.clientX; targetMouseY = event.clientY;
    pointerDirty = true;
    scheduleFrame();
  }, { passive: true });
  $$('.magnetic').forEach(el => {
    el.addEventListener('pointerenter', e => {
      if (e.pointerType !== 'mouse') return;
      if (hoveredMagnet && hoveredMagnet !== el) hoveredMagnet.style.transform = '';
      hoveredMagnet = el;
      cursorHalo.classList.add('is-link');
    });
    el.addEventListener('pointerleave', () => {
      el.style.transform = '';
      hoveredMagnet = null;
      cursorHalo.classList.remove('is-link');
    });
  });
  $$('.product-image').forEach(el => {
    el.addEventListener('pointerenter', () => cursorHalo.classList.add('is-view'));
    el.addEventListener('pointerleave', () => cursorHalo.classList.remove('is-view'));
  });
  const frame = $('[data-tilt]');
  frame.addEventListener('pointermove', e => {
    if (motionOff || e.pointerType !== 'mouse') return;
    const r = frame.getBoundingClientRect();
    frame.style.transform = 'perspective(1000px) rotateY(' + ((e.clientX - r.left) / r.width - .5) * 5 + 'deg) rotateX(' + (.5 - (e.clientY - r.top) / r.height) * 5 + 'deg)';
  });
  frame.addEventListener('pointerleave', () => { frame.style.transform = ''; });

  // Lightweight luminous perfume motes. No image or network dependency.
  const moteField = document.createElement('div');
  moteField.className = 'ritual-motes';
  moteField.setAttribute('aria-hidden', 'true');
  $('.ritual-backdrop').appendChild(moteField);
  for (let i = 0; i < (lowPower ? 0 : 16); i++) {
    const mote = document.createElement('i');
    const seed = (i * 73 + 19) % 97;
    mote.style.setProperty('--mote-x', (seed + 2) + '%');
    mote.style.setProperty('--mote-y', ((i * 43 + 11) % 89 + 4) + '%');
    mote.style.setProperty('--mote-size', (1 + (i % 4)) + 'px');
    mote.style.setProperty('--mote-delay', (-(i * 1.79) % 13).toFixed(1) + 's');
    mote.style.setProperty('--mote-duration', (6 + (i * 7) % 9) + 's');
    moteField.appendChild(mote);
  }

  // Smooth carousel with arrows, touch/mouse dragging and keyboard-usable cards.
  const viewport = $('#productViewport'), track = $('#productTrack');
  const cards = $$('.product-card'), gap = () => parseFloat(getComputedStyle(track).gap) || 0;
  let trackX = 0, maxTrackX = 0, cardStep = 0, dragging = false, dragged = false;
  let dragStart = 0, initialX = 0, dragPointer = null;
  function updateTrack() {
    cardStep = cards[0].getBoundingClientRect().width + gap();
    maxTrackX = Math.max(0, track.scrollWidth - viewport.clientWidth);
    trackX = clamp(trackX, -maxTrackX, 0);
    track.style.transform = 'translate3d(' + trackX + 'px,0,0)';
  }
  function moveTrack(delta) {
    const next = trackX + delta * cardStep;
    trackX = next < -maxTrackX - 5 ? 0 : (next > 5 ? -maxTrackX : clamp(next, -maxTrackX, 0));
    track.style.transform = 'translate3d(' + trackX + 'px,0,0)';
  }
  $('#prevProduct').addEventListener('click', () => moveTrack(1));
  $('#nextProduct').addEventListener('click', () => moveTrack(-1));
  viewport.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true; dragged = false; dragStart = e.clientX; initialX = trackX; dragPointer = e.pointerId;
    track.classList.add('is-dragging');
  });
  viewport.addEventListener('pointermove', e => {
    if (!dragging || e.pointerId !== dragPointer) return;
    const dx = e.clientX - dragStart;
    if (Math.abs(dx) > 8) dragged = true;
    if (!dragged) return;
    if (e.pointerType === 'mouse' && !viewport.hasPointerCapture(e.pointerId)) viewport.setPointerCapture(e.pointerId);
    trackX = clamp(initialX + dx, -maxTrackX, 0);
    track.style.transform = 'translate3d(' + trackX + 'px,0,0)';
  });
  function finishDrag(e) {
    if (!dragging || (e && e.pointerId !== dragPointer)) return;
    dragging = false; dragPointer = null;
    track.classList.remove('is-dragging');
    if (dragged) {
      trackX = clamp(Math.round(trackX / cardStep) * cardStep, -maxTrackX, 0);
      track.style.transform = 'translate3d(' + trackX + 'px,0,0)';
      setTimeout(() => { dragged = false; }, 120);
    }
  }
  viewport.addEventListener('pointerup', finishDrag);
  viewport.addEventListener('pointercancel', finishDrag);
  viewport.addEventListener('lostpointercapture', finishDrag);
  updateTrack();

  const products = [
    { title: 'Éclipse', desc: 'Smoked amber. Velvet iris. The warmth of a moment that refuses to fade.', notes: ['BERGAMOT', 'VELVET IRIS', 'AMBER NOIR'] },
    { title: 'Solenne', desc: 'A quiet radiance of white flowers, soft suede, and skin-warm musk.', notes: ['NEROLI', 'WHITE FLOWERS', 'CASHMERE MUSK'] },
    { title: 'Vesper', desc: 'A darker kind of elegance. Black rose in an embrace of oud and saffron.', notes: ['SAFFRON', 'BLACK ROSE', 'OUD'] }
  ];
  const dialog = $('#productDialog'), dialogTitle = $('#modalTitle'), dialogDescription = $('#modalDescription'), modalNotes = $('#modalNotes');
  let lastCard = null;
  function openProduct(i, card) {
    if (dragged) return;
    const product = products[i];
    if (!product) return;
    lastCard = card;
    dialogTitle.textContent = product.title;
    dialogDescription.textContent = product.desc;
    modalNotes.replaceChildren(...product.notes.map(note => {
      const chip = document.createElement('span');
      chip.textContent = note;
      return chip;
    }));
    dialog.showModal();
    body.classList.add('dialog-open');
  }
  function closeProduct() {
    dialog.close();
    body.classList.remove('dialog-open');
    lastCard?.focus();
  }
  cards.forEach((card, i) => {
    card.addEventListener('click', () => openProduct(i, card));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProduct(i, card); }
    });
  });
  $('#dialogClose').addEventListener('click', closeProduct);
  $('#dialogReturn').addEventListener('click', closeProduct);
  dialog.addEventListener('close', () => body.classList.remove('dialog-open'));
  dialog.addEventListener('click', e => { if (e.target === dialog) closeProduct(); });

  const beautyReveal = $('#beautyReveal'), swatches = $('#beautySwatches');
  beautyReveal.addEventListener('click', () => {
    const isOpen = swatches.classList.toggle('open');
    beautyReveal.firstChild.textContent = isOpen ? 'HIDE THE COLORS ' : 'REVEAL THE COLORS ';
    beautyReveal.setAttribute('aria-expanded', String(isOpen));
  });
  beautyReveal.setAttribute('aria-expanded', 'false');

  function frameLoop(time) {
    frameScheduled = false;
    if (!motionOff && !lowPower && time < interactionBurstUntil) {
      if (previousFrameTime && time - previousFrameTime < 150) {
        sampledFrames++;
        if (time - previousFrameTime > 35) slowFrames++;
        if (sampledFrames >= 40) {
          if (slowFrames / sampledFrames > .3) {
            lowPower = true;
            body.classList.add('perf-lite');
          }
          sampledFrames = 0;
          slowFrames = 0;
        }
      }
      previousFrameTime = time;
    } else {
      previousFrameTime = 0;
    }
    if (needsScrollUpdate) { needsScrollUpdate = false; updateScroll(); }
    if (!motionOff && pointerDirty && pointerSeen) {
      pointerDirty = false;
      const heroRect = hero.getBoundingClientRect();
      if (heroRect.bottom > 0 && heroRect.top < viewH) {
        const x = targetMouseX / innerWidth, y = targetMouseY / viewH;
        hero.style.setProperty('--hero-mx', ((x - .5) * -42).toFixed(1) + 'px');
        hero.style.setProperty('--hero-my', ((y - .5) * -26).toFixed(1) + 'px');
        if (!lowPower) {
          const size = Math.min(760, innerWidth * .85);
          glow.style.transform = 'translate3d(' + (targetMouseX - heroRect.left - size / 2).toFixed(1) + 'px,' + (targetMouseY - heroRect.top - size / 2).toFixed(1) + 'px,0)';
        }
      }
      if (hoveredMagnet) {
        const rect = hoveredMagnet.getBoundingClientRect();
        const dx = targetMouseX - (rect.left + rect.width / 2);
        const dy = targetMouseY - (rect.top + rect.height / 2);
        hoveredMagnet.style.transform = 'translate3d(' + (dx * .17).toFixed(1) + 'px,' + (dy * .17).toFixed(1) + 'px,0)';
      }
    }
    if (!motionOff && pointerSeen) {
      mouseX = lerp(mouseX, targetMouseX, .17);
      mouseY = lerp(mouseY, targetMouseY, .17);
      cursorDot.style.transform = 'translate3d(' + targetMouseX + 'px,' + targetMouseY + 'px,0)';
      cursorHalo.style.transform = 'translate3d(' + mouseX + 'px,' + mouseY + 'px,0)';
      if (Math.abs(mouseX - targetMouseX) + Math.abs(mouseY - targetMouseY) > .7) scheduleFrame();
    }
    if (!motionOff && time < interactionBurstUntil) scheduleFrame();
  }
  scheduleFrame();
})();
