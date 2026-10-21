(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const lerp = (a, b, t) => a + (b - a) * t;
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
  function syncMotion() {
    body.classList.toggle('motion-off', motionOff);
    motionToggle.setAttribute('aria-pressed', String(motionOff));
    motionToggle.setAttribute('aria-label', motionOff ? 'Enable animation' : 'Reduce animation');
    motionToggle.lastElementChild.textContent = motionOff ? 'ENABLE MOTION' : 'REDUCE MOTION';
    needsScrollUpdate = true;
    scheduleFrame();
  }
  motionToggle.addEventListener('click', () => { motionOff = !motionOff; syncMotion(); });
  syncMotion();

  const hero = $('#hero'), heroImage = $('#heroImage');
  const heroScene = $('#heroScene'), heroContent = $('.hero-content'), heroTransition = $('#heroTransition');
  const ritualSection = $('#ritual'), ritualStage = $('#ritualStage'), ritualBottle = $('#ritualBottle');
  const notes = $$('.ritual-note'), steps = $$('.ritual-steps span');
  const beauty = $('#beauty'), beautyImage = $('#beautyImage');
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
      heroImage.style.transform = 'translate3d(0,' + (p * -25).toFixed(1) + 'px,0) scale(' + (1.08 + p * .13).toFixed(3) + ')';
      heroContent.style.opacity = String(1 - clamp(p * 2.65, 0, 1));
      heroContent.style.transform = 'translate3d(0,calc(-43% - ' + (p * 125).toFixed(1) + 'px),0)';
      const emergence = clamp((p - .31) / .38, 0, 1);
      const departure = 1 - clamp((p - .84) / .16, 0, 1);
      heroTransition.style.opacity = String(emergence * departure);
      heroTransition.style.transform = 'translate3d(-50%,calc(-50% + ' + (1 - emergence) * 100 + 'px),0) scale(' + (.72 + emergence * .36).toFixed(3) + ')';
    }
    const ritualRect = ritualSection.getBoundingClientRect();
    const distance = Math.max(1, ritualRect.height - viewH);
    if (ritualRect.top <= viewH && ritualRect.bottom >= 0) {
      const p = clamp(-ritualRect.top / distance, 0, 1);
      ritualStage.style.setProperty('--ritual-progress', p.toFixed(3));
      ritualBottle.style.setProperty('--ritual-y', (Math.sin(p * Math.PI * 2) * -32).toFixed(1) + 'px');
      ritualBottle.style.setProperty('--ritual-r', ((p - .5) * 12).toFixed(2) + 'deg');
      ritualBottle.style.setProperty('--ritual-scale', (.93 + Math.sin(p * Math.PI) * .16).toFixed(3));
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
      beautyImage.style.setProperty('--beauty-parallax', ((progress - .5) * 45).toFixed(1) + 'px');
    }
  }
  window.addEventListener('scroll', () => {
    needsScrollUpdate = true;
    scheduleFrame();
  }, { passive: true });
  // Discrete mouse-wheel notches get a short, fast easing tail. Trackpads and
  // touch retain native scrolling, which is already continuous on those devices.
  let wheelTarget = window.scrollY;
  let wheelAnimating = false;
  function easeWheel() {
    if (!wheelAnimating) return;
    const current = window.scrollY;
    const difference = wheelTarget - current;
    if (Math.abs(difference) <= .8) {
      wheelAnimating = false;
      if (Math.abs(difference) > .01) window.scrollTo(0, wheelTarget);
      return;
    }
    window.scrollTo(0, current + difference * .29);
    needsScrollUpdate = true;
  }
  window.addEventListener('wheel', event => {
    if (event.defaultPrevented || !event.cancelable || event.ctrlKey || event.metaKey ||
        event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
        body.classList.contains('dialog-open') || body.classList.contains('menu-open') ||
        window.matchMedia('(pointer: coarse)').matches) return;
    // Pixel-precise trackpads should keep their native gesture and momentum.
    if (event.deltaMode === 0 && Math.abs(event.deltaY) < 42) return;
    const unit = event.deltaMode === 1 ? 22 : event.deltaMode === 2 ? viewH : 1;
    const delta = clamp(event.deltaY * unit * 1.65, -630, 630);
    const max = Math.max(0, document.documentElement.scrollHeight - viewH);
    if (!wheelAnimating) wheelTarget = window.scrollY;
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
    wheelTarget = clamp(destination.getBoundingClientRect().top + window.scrollY - (destination.id === 'top' ? 0 : 60), 0, max);
    wheelAnimating = true;
    history.pushState(null, '', link.getAttribute('href'));
    scheduleFrame();
  });
  window.addEventListener('pointerdown', event => {
    if (event.target.closest('a,button,[role="button"]')) return;
    wheelAnimating = false;
    wheelTarget = window.scrollY;
  }, { passive: true });
  window.addEventListener('keydown', event => {
    if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)) {
      wheelAnimating = false;
      wheelTarget = window.scrollY;
    }
  });
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

  function frameLoop() {
    frameScheduled = false;
    easeWheel();
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
