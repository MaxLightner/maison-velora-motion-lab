(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeQuint = t => t < .5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2;
  const easeCubic = t => t * t * (3 - 2 * t);
  // The experience starts animated on every browser; visitors may opt out explicitly.
  const isFirefox = /firefox\//i.test(navigator.userAgent);
  const body = document.body;
  let lowPower = Boolean(
    isFirefox ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
    navigator.connection?.saveData ||
    window.matchMedia('(pointer: coarse)').matches
  );
  body.classList.toggle('perf-lite', lowPower);
  let motionOff = false;
  let viewH = innerHeight;
  let scrollY = window.scrollY;
  let lastPaintedScroll = Number.NaN;
  const sceneMetrics = { hero: null, ritual: null, beauty: null };
  function measureScenes() {
    const y = window.scrollY;
    const measure = el => { const r = el.getBoundingClientRect(); return { top: r.top + y, height: r.height }; };
    sceneMetrics.hero = measure(heroScene);
    sceneMetrics.ritual = measure(ritualSection);
    sceneMetrics.beauty = measure(beauty);
  }
  let targetMouseX = innerWidth / 2, targetMouseY = innerHeight / 2;
  let mouseX = targetMouseX, mouseY = targetMouseY;
  let pointerSeen = false;
  let needsScrollUpdate = true;
  let pointerDirty = false;
  let frameScheduled = false;
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
    setTimeout(() => { loader.classList.add('loaded'); }, 80);
    setTimeout(() => { loader.remove(); }, 780);
  };
  if (document.readyState === 'complete') revealSite();
  else window.addEventListener('load', revealSite, { once: true });
  setTimeout(revealSite, 2400);

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
  function syncMotion() {
    body.classList.toggle('motion-off', motionOff);
    motionToggle.setAttribute('aria-pressed', String(motionOff));
    motionToggle.setAttribute('aria-label', motionOff ? 'Enable animation' : 'Reduce animation');
    motionToggle.lastElementChild.textContent = motionOff ? 'ENABLE MOTION' : 'REDUCE MOTION';
    needsScrollUpdate = true;
    lastPaintedScroll = Number.NaN;
    scheduleFrame();
  }
  motionToggle.addEventListener('click', () => { motionOff = !motionOff; syncMotion(); });
  syncMotion();

  const hero = $('#hero'), heroImage = $('#heroImage');
  const heroScene = $('#heroScene'), heroContent = $('.hero-content'), heroTransition = $('#heroTransition');
  const ritualSection = $('#ritual'), ritualStage = $('#ritualStage'), ritualBottle = $('#ritualBottle');
  const notes = $('.ritual-note'), steps = $('.ritual-steps span');
  const ritualProducts = $('.ritual-product', ritualBottle);
  const beauty = $('#beauty'), beautyImage = $('#beautyImage');
  const beautyCurtainLeft = $('.beauty-curtain--left'), beautyCurtainRight = $('.beauty-curtain--right');
  let activeNote = -1;
  measureScenes();
  window.addEventListener('load', () => { measureScenes(); lastPaintedScroll = Number.NaN; needsScrollUpdate = true; scheduleFrame(); }, { once: true });
  document.fonts?.ready?.then(() => { measureScenes(); lastPaintedScroll = Number.NaN; needsScrollUpdate = true; scheduleFrame(); });
  function updateScroll() {
    const nextScroll = window.scrollY;
    if (Math.abs(nextScroll - lastPaintedScroll) < .15) return;
    lastPaintedScroll = scrollY = nextScroll;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - viewH);
    $('#pageProgress').style.transform = 'scaleX(' + (scrollY / maxScroll).toFixed(5) + ')';
    header.classList.toggle('scrolled', scrollY > 30);
    if (motionOff) return;

    const heroBounds = sceneMetrics.hero;
    if (heroBounds && scrollY < heroBounds.top + heroBounds.height &&
        scrollY + viewH > heroBounds.top) {
      const p = clamp((scrollY - heroBounds.top) / Math.max(heroBounds.height - viewH, 1), 0, 1);
      const phase = easeQuint(p);
      hero.style.setProperty('--scene-progress', phase.toFixed(4));
      heroImage.style.transform = 'translate3d(0,' + (phase * -25).toFixed(1) + 'px,0) scale(' + (1.08 + phase * .13).toFixed(3) + ')';
      const titleExit = easeQuint(clamp((p - .07) / .43, 0, 1));
      heroContent.style.opacity = String(1 - titleExit);
      heroContent.style.transform = 'translate3d(0,calc(-43% - ' + (titleExit * 125).toFixed(1) + 'px),0)';
      const emergence = easeCubic(clamp((p - .13) / .43, 0, 1));
      // A long fade across the final third of the scene avoids the old blink-out.
      const departure = 1 - easeCubic(clamp((p - .69) / .31, 0, 1));
      heroTransition.style.opacity = String(emergence * departure);
      heroTransition.style.transform = 'translate3d(-50%,calc(-50% + ' + ((1 - emergence) * 100).toFixed(1) + 'px),0) scale(' + (.72 + emergence * .36).toFixed(3) + ')';
    }
    const ritualBounds = sceneMetrics.ritual;
    if (ritualBounds && scrollY <= ritualBounds.top + ritualBounds.height &&
        scrollY + viewH >= ritualBounds.top) {
      const distance = Math.max(1, ritualBounds.height - viewH);
      const p = clamp((scrollY - ritualBounds.top) / distance, 0, 1);
      const phase = easeQuint(p);
      ritualStage.style.setProperty('--ritual-progress', phase.toFixed(3));
      const note = Math.min(2, Math.floor(p * 3));
      if (note !== activeNote) {
        activeNote = note;
        notes.forEach((el, i) => el.classList.toggle('is-active', i === note));
        steps.forEach((el, i) => el.classList.toggle('is-active', i === note));
        ritualProducts.forEach((el, i) => el.classList.toggle('is-active', i === note));
        ritualStage.style.backgroundColor = ['#170e10', '#29201a', '#1d101e'][note];
      }
    }
    const beautyBounds = sceneMetrics.beauty;
    if (beautyBounds) {
      // A scroll-linked two-panel mask: revealed in view, reverses when scrolling back.
      // Only compositor transforms change, avoiding Firefox clip-path repaints.
      const reveal = easeCubic(clamp((scrollY + viewH * .94 - beautyBounds.top) / (viewH * .72), 0, 1));
      beautyCurtainLeft.style.transform = 'translate3d(' + (-101 * reveal).toFixed(2) + '%,0,0)';
      beautyCurtainRight.style.transform = 'translate3d(' + (101 * reveal).toFixed(2) + '%,0,0)';
      if (scrollY < beautyBounds.top + beautyBounds.height && scrollY + viewH > beautyBounds.top) {
        const p = clamp((viewH + scrollY - beautyBounds.top) / (viewH + beautyBounds.height), 0, 1);
        beautyImage.style.setProperty('--beauty-parallax', ((easeQuint(p) - .5) * 25).toFixed(1) + 'px');
      }
    }
  }
  window.addEventListener('scroll', () => {
    needsScrollUpdate = true;
    scheduleFrame();
  }, { passive: true });
  // Discrete mouse-wheel notches travel at a restrained, predictable speed. Trackpads and
  // touch retain native scrolling, which is already continuous on those devices.
  let wheelTarget = window.scrollY;
  let wheelPosition = window.scrollY;
  let wheelVelocity = 0;
  let lastWheelFrame = 0;
  let wheelAnimating = false;
  // Critically damped motion: a true ease-in AND ease-out with velocity
  // continuity across consecutive mouse-wheel notches and direction changes.
  function easeWheel(time) {
    if (!wheelAnimating) return;
    const dt = lastWheelFrame ? clamp((time - lastWheelFrame) / 1000, .008, .034) : 1 / 60;
    lastWheelFrame = time;
    const omega = 18;
    const error = wheelPosition - wheelTarget;
    const coefficient = wheelVelocity + omega * error;
    const attenuation = Math.exp(-omega * dt);
    wheelPosition = wheelTarget + (error + coefficient * dt) * attenuation;
    wheelVelocity = (wheelVelocity - omega * coefficient * dt) * attenuation;
    const max = Math.max(0, document.documentElement.scrollHeight - viewH);
    wheelPosition = clamp(wheelPosition, 0, max);
    if (Math.abs(wheelTarget - wheelPosition) < .55 && Math.abs(wheelVelocity) < 7) {
      wheelPosition = wheelTarget;
      wheelVelocity = 0;
      wheelAnimating = false;
      lastWheelFrame = 0;
    }
    window.scrollTo(0, wheelPosition);
    needsScrollUpdate = true;
  }
  window.addEventListener('wheel', event => {
    if (event.defaultPrevented || !event.cancelable || event.ctrlKey || event.metaKey ||
        event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
        body.classList.contains('dialog-open') || body.classList.contains('menu-open') ||
        window.matchMedia('(pointer: coarse)').matches) return;
    // Pixel-precise trackpads should keep their native gesture and momentum.
    if (event.deltaMode === 0 && Math.abs(event.deltaY) < 42) return;
    const unit = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? viewH : 1;
    const delta = clamp(event.deltaY * unit * 1.0, -190, 190);
    const max = Math.max(0, document.documentElement.scrollHeight - viewH);
    if (!wheelAnimating) { wheelPosition = window.scrollY; wheelTarget = wheelPosition; wheelVelocity = 0; lastWheelFrame = 0; }
    wheelTarget = clamp(wheelTarget + delta, 0, max);
    event.preventDefault();
    wheelAnimating = true;
    scheduleFrame();
  }, { passive: false });
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href^="#"]');
    if (!link) return;
    const destination = document.getElementById(link.getAttribute('href').slice(1));
    if (!destination) return;
    event.preventDefault();
    const max = Math.max(0, document.documentElement.scrollHeight - viewH);
    wheelPosition = window.scrollY;
    wheelVelocity = 0;
    lastWheelFrame = 0;
    wheelTarget = clamp(destination.getBoundingClientRect().top + window.scrollY - (destination.id === 'top' ? 0 : 60), 0, max);
    wheelAnimating = true;
    history.pushState(null, '', link.getAttribute('href'));
    scheduleFrame();
  });
  window.addEventListener('pointerdown', event => {
    if (event.target.closest('a,button,[role="button"]')) return;
    wheelAnimating = false;
    wheelPosition = wheelTarget = window.scrollY;
    wheelVelocity = 0;
    lastWheelFrame = 0;
  }, { passive: true });
  window.addEventListener('keydown', event => {
    if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)) {
      wheelAnimating = false;
      wheelPosition = wheelTarget = window.scrollY;
      wheelVelocity = 0;
      lastWheelFrame = 0;
    }
  });
  window.addEventListener('resize', () => { viewH = innerHeight; measureScenes(); lastPaintedScroll = Number.NaN; needsScrollUpdate = true; updateTrack(); scheduleFrame(); }, { passive: true });
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
    if (motionOff || lowPower) return;
    pointerSeen = true;
    targetMouseX = event.clientX; targetMouseY = event.clientY;
    pointerDirty = true;
    scheduleFrame();
  }, { passive: true });
  $$('.magnetic').forEach(el => {
    el.addEventListener('pointerenter', e => {
      if (e.pointerType !== 'mouse' || lowPower) return;
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
    if (motionOff || lowPower || e.pointerType !== 'mouse') return;
    const r = frame.getBoundingClientRect();
    frame.style.transform = 'perspective(1000px) rotateY(' + ((e.clientX - r.left) / r.width - .5) * 5 + 'deg) rotateX(' + (.5 - (e.clientY - r.top) / r.height) * 5 + 'deg)';
  });
  frame.addEventListener('pointerleave', () => { frame.style.transform = ''; });

  // Lightweight luminous perfume motes. No image or network dependency.
  const moteField = document.createElement('div');
  moteField.className = 'ritual-motes';
  moteField.setAttribute('aria-hidden', 'true');
  $('.ritual-backdrop').appendChild(moteField);
  for (let i = 0; i < 0; i++) {
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
    { image: 'eclipse.webp', title: 'Éclipse', desc: 'Smoked amber. Velvet iris. The warmth of a moment that refuses to fade.', notes: ['BERGAMOT', 'VELVET IRIS', 'AMBER NOIR'] },
    { image: 'solenne.webp', title: 'Solenne', desc: 'A quiet radiance of white flowers, soft suede, and skin-warm musk.', notes: ['NEROLI', 'WHITE FLOWERS', 'CASHMERE MUSK'] },
    { image: 'vesper.webp', title: 'Vesper', desc: 'A darker kind of elegance. Black rose in an embrace of oud and saffron.', notes: ['SAFFRON', 'BLACK ROSE', 'OUD'] }
  ];
  const dialog = $('#productDialog'), dialogTitle = $('#modalTitle'), dialogDescription = $('#modalDescription'), modalNotes = $('#modalNotes');
  let lastCard = null;
  function openProduct(i, card) {
    if (dragged) return;
    const product = products[i];
    if (!product) return;
    lastCard = card;
    dialogTitle.textContent = product.title;
    const modalProductImage = $('#modalProductImage');
    modalProductImage.src = './assets/' + product.image;
    modalProductImage.alt = product.title + ' fragrance bottle with branded label';
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
    easeWheel(time);
    if (needsScrollUpdate) { needsScrollUpdate = false; updateScroll(); }
    // Native cursors on Firefox/low-end devices avoid a permanent animation loop.
    if (!motionOff && !lowPower && pointerDirty && pointerSeen) {
      pointerDirty = false;
      if (hoveredMagnet) {
        const rect = hoveredMagnet.getBoundingClientRect();
        hoveredMagnet.style.transform = 'translate3d(' + ((targetMouseX - rect.left - rect.width / 2) * .12).toFixed(1) + 'px,' + ((targetMouseY - rect.top - rect.height / 2) * .12).toFixed(1) + 'px,0)';
      }
    }
    if (!motionOff && !lowPower && pointerSeen) {
      mouseX = lerp(mouseX, targetMouseX, .2);
      mouseY = lerp(mouseY, targetMouseY, .2);
      cursorDot.style.transform = 'translate3d(' + targetMouseX + 'px,' + targetMouseY + 'px,0)';
      cursorHalo.style.transform = 'translate3d(' + mouseX + 'px,' + mouseY + 'px,0)';
      if (Math.abs(mouseX - targetMouseX) + Math.abs(mouseY - targetMouseY) > 1.2) scheduleFrame();
    }
    if (wheelAnimating) scheduleFrame();
  }
  scheduleFrame();
})();
