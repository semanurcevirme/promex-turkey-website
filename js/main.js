/**
 * PROMEX – js/main.js
 * Ana JS dosyası: Lenis, GSAP/ScrollTrigger, özel imleç, canvas, form, animasyonlar
 */

/* =====================================================
   CONFIG (tek yer)
   ===================================================== */
const CONFIG = {
  formEndpoint: '/iletisim.php', // Site kök dizinindeki PHP formu (Formspree/Web3Forms kullanılacaksa adresi buraya yazın)
  whatsappTR: 'https://wa.me/905306010836?text=' + encodeURIComponent('Merhaba, etkinlik organizasyonu hakkında bilgi almak istiyorum.'),
  whatsappEN: 'https://wa.me/905306010836?text=' + encodeURIComponent('Hello, I\'d like information about event organization.'),
  lang: document.documentElement.lang || 'tr',
};

/* =====================================================
   JS ETKİNLEŞTİRME
   ===================================================== */
document.documentElement.classList.add('js');

/* =====================================================
   REDUCED MOTION KONTROLÜ
   ===================================================== */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =====================================================
   INTRO OVERLAY (yalnızca ilk ziyaret)
   ===================================================== */
function initIntro() {
  const overlay = document.getElementById('intro-overlay');
  if (!overlay) return;
  if (prefersReducedMotion || sessionStorage.getItem('promex-intro-done')) {
    overlay.classList.add('done');
    return;
  }
  const logoWrap = document.getElementById('intro-logo-wrap');

  // Animasyon: logo belirir, sonra perde yukarı kalkar
  let tl = (typeof gsap !== 'undefined') ? gsap.timeline({ onComplete: () => {
    overlay.classList.add('done');
    sessionStorage.setItem('promex-intro-done', '1');
    initHeroAnimations();
  }}) : null;

  if (tl) {
    tl.to(logoWrap, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0.1)
      .to(overlay, { yPercent: -100, duration: 0.6, ease: 'power3.inOut' }, 1.7);
  } else {
    setTimeout(() => {
      overlay.classList.add('done');
      sessionStorage.setItem('promex-intro-done', '1');
      initHeroAnimations();
    }, 300);
  }
}

/* =====================================================
   TEK KAYDIRMA YOLU (tüm scroll işleri tek karede)
   ===================================================== */
const scrollHandlers = [];
function onScrollTick(fn) { scrollHandlers.push(fn); }
function getScrollY() { return lenis ? lenis.scroll : window.scrollY; }
function runScrollHandlers() {
  const y = getScrollY();
  for (let i = 0; i < scrollHandlers.length; i++) scrollHandlers[i](y);
}

/* =====================================================
   LENIS YUMUŞAK KAYDIRMA
   ===================================================== */
let lenis = null;
function initLenis() {
  if (prefersReducedMotion || typeof Lenis === 'undefined') {
    // Lenis yok: native kaydırma, tek rAF ile
    let queued = false;
    window.addEventListener('scroll', () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; runScrollHandlers(); });
    }, { passive: true });
    return;
  }
  lenis = new Lenis({
    lerp: 0.085,            // sabit yumuşaklık: ani hızlanma/takılma yok
    wheelMultiplier: 0.95,
    touchMultiplier: 1.4,
    smoothWheel: true,
    syncTouch: false,       // dokunmatikte native momentum
    anchors: false,
  });

  lenis.on('scroll', () => {
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.update();
    runScrollHandlers();
  });

  if (typeof gsap !== 'undefined') {
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  } else {
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }
}

/* =====================================================
   SAYFA İLERLEME ÇUBUĞU (transform ile)
   ===================================================== */
const progressBar = document.getElementById('progress-bar');
let maxScroll = 1;
function measureScroll() {
  maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
}
function initProgressBar() {
  if (!progressBar) return;
  measureScroll();
  window.addEventListener('resize', measureScroll);
  window.addEventListener('load', measureScroll);
  onScrollTick((y) => {
    const r = Math.min(1, Math.max(0, y / maxScroll));
    progressBar.style.transform = 'scaleX(' + r.toFixed(4) + ')';
  });
}

/* =====================================================
   HEADER (gizle/göster + blur)
   ===================================================== */
function initHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;
  let lastY = getScrollY();
  let acc = 0;

  onScrollTick((y) => {
    header.classList.toggle('scrolled', y > 60);
    const d = y - lastY;
    lastY = y;
    if (y <= 120) { header.classList.remove('hidden'); acc = 0; return; }
    // yön değişiminde birikimli eşik: titremeyi önler
    if ((d > 0 && acc < 0) || (d < 0 && acc > 0)) acc = 0;
    acc += d;
    if (acc > 24) header.classList.add('hidden');
    else if (acc < -24) header.classList.remove('hidden');
  });
}

/* =====================================================
   MOBİL MENÜ
   ===================================================== */
function initMobileMenu() {
  const toggle = document.getElementById('menu-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  if (!toggle || !mobileNav) return;

  const links = mobileNav.querySelectorAll('a');
  const extras = mobileNav.querySelectorAll('.mobile-bottom *');

  function openMenu() {
    toggle.setAttribute('aria-expanded', 'true');
    mobileNav.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();
    links.forEach((link, i) => {
      link.style.transition = `opacity 0.4s ease ${0.08 + i * 0.07}s, transform 0.4s ease ${0.08 + i * 0.07}s`;
    });
    extras.forEach((el, i) => {
      el.style.transition = `opacity 0.4s ease ${0.08 + links.length * 0.07 + i * 0.06}s, transform 0.4s ease ${0.08 + links.length * 0.07 + i * 0.06}s`;
    });
    // Focus trap
    links[0] && links[0].focus();
  }

  function closeMenu() {
    toggle.setAttribute('aria-expanded', 'false');
    mobileNav.classList.remove('open');
    document.body.style.overflow = '';
    if (lenis) lenis.start();
    toggle.focus();
  }

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    isOpen ? closeMenu() : openMenu();
  });

  links.forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileNav.classList.contains('open')) closeMenu();
  });
}

/* =====================================================
   DİL DEĞİŞTİRİCİ (hash koruma)
   ===================================================== */
function initLangSwitcher() {
  document.querySelectorAll('.lang-switcher').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const hash = window.location.hash;
      const href = btn.getAttribute('href') || btn.dataset.href;
      const target = href + (hash || '');
      // Kısa fade geçişi
      const curtain = document.createElement('div');
      curtain.style.cssText = 'position:fixed;inset:0;background:#060A16;z-index:9999;opacity:0;transition:opacity 0.25s';
      document.body.appendChild(curtain);
      requestAnimationFrame(() => {
        curtain.style.opacity = '1';
        setTimeout(() => { window.location.href = target; }, 250);
      });
    });
  });
}

/* =====================================================
   BÖLÜM NAV (sağ kenardaki dikey çizgiler)
   ===================================================== */
const sections = ['hero', 'about', 'services', 'how', 'reference', 'contact'];
const sectionLabels = {
  tr: ['Anasayfa', 'Hakkımızda', 'Hizmetler', 'Nasıl Çalışıyoruz', 'Referanslar', 'İletişim'],
  en: ['Home', 'About', 'Services', 'How We Work', 'References', 'Contact'],
};

let pinActive = false;
function scrollToTarget(el, id) {
  if (!el) return;
  const off = (id === 'services' && pinActive) ? 0 : -72;
  if (lenis) {
    lenis.scrollTo(el, { offset: off, duration: 1.4, easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) });
  } else {
    const top = el.getBoundingClientRect().top + window.scrollY + off;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}

function initSectionNav() {
  const nav = document.getElementById('section-nav');
  const navLinks = document.querySelectorAll('.main-nav a[href^="#"]');
  const labels = CONFIG.lang === 'en' ? sectionLabels.en : sectionLabels.tr;
  let dots = [];

  if (nav) {
    sections.forEach((id, i) => {
      const btn = document.createElement('button');
      btn.className = 'section-nav-dot';
      btn.setAttribute('aria-label', labels[i]);
      btn.innerHTML = `<span class="dot-label">${labels[i]}</span><span class="dot-line"></span>`;
      btn.addEventListener('click', () => scrollToTarget(document.getElementById(id), id));
      nav.appendChild(btn);
      dots.push(btn);
    });
  }

  function setActive(id) {
    const idx = sections.indexOf(id);
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    navLinks.forEach(a => {
      const href = a.getAttribute('href');
      a.classList.toggle('active', href === '#' + id || (id === 'hero' && href === '#'));
    });
  }
  setActive('hero');

  if (!('IntersectionObserver' in window)) return;
  // Görünüm penceresinin ortasındaki bölüm aktif sayılır (scroll olayı gerekmez)
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) setActive(en.target.id); });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
  sections.forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
}

/* =====================================================
   ÖZEL İMLEÇ
   ===================================================== */
function initCustomCursor() {
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;
  if (window.matchMedia('(pointer: coarse)').matches) {
    dot.style.display = 'none';
    ring.style.display = 'none';
    return;
  }

  let mx = -100, my = -100, rx = -100, ry = -100;
  let rafId;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
  });

  function animateCursor() {
    dot.style.left = mx + 'px';
    dot.style.top = my + 'px';
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.left = rx + 'px';
    ring.style.top = ry + 'px';
    rafId = requestAnimationFrame(animateCursor);
  }
  animateCursor();

  // Hover durumları
  document.addEventListener('mouseover', e => {
    const target = e.target.closest('a, button, [role="button"]');
    const serviceCard = e.target.closest('.services-sticky-panel, .service-card-mobile');
    if (serviceCard) {
      ring.classList.add('service-hover');
      ring.classList.remove('hovered');
      ring.querySelector('.cursor-label').textContent = CONFIG.lang === 'en' ? 'Explore' : 'Keşfet';
    } else if (target) {
      ring.classList.add('hovered');
      ring.classList.remove('service-hover');
    } else {
      ring.classList.remove('hovered', 'service-hover');
    }
  });
}

/* =====================================================
   HERO CANVAS (orkestra sinüs dalgaları)
   ===================================================== */
function initHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || !canvas.getContext) return;

  if (prefersReducedMotion) {
    canvas.style.display = 'none';
    return;
  }

  const ctx = canvas.getContext('2d');
  const isMobile = window.innerWidth <= 768;
  const lineCount = isMobile ? 8 : 16;
  const brandColor = { r: 70, g: 150, b: 255 };

  let W, H, lines, mouse = { x: -1000, y: -1000 }, rafId, isVisible = true;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initLines();
  }

  function initLines() {
    lines = [];
    for (let i = 0; i < lineCount; i++) {
      lines.push({
        y: (H / (lineCount + 1)) * (i + 1),
        amplitude: 20 + Math.random() * 30,
        frequency: 0.003 + Math.random() * 0.004,
        phase: Math.random() * Math.PI * 2,
        speed: 0.003 + Math.random() * 0.003,
        opacity: 0.08 + Math.random() * 0.12,
      });
    }
  }


  // --- Logodaki noktalı küreyi yankılayan 3B küre + yörünge + parçacıklar ---
  const NPTS = isMobile ? 420 : 1100;
  const pts = [];
  for (let i = 0; i < NPTS; i++) {
    const y = 1 - (i / (NPTS - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = i * 2.399963229728653;
    pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
  }
  const specks = [];
  for (let i = 0; i < (isMobile ? 18 : 46); i++) {
    specks.push({ x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.7, s: 0.6 + Math.random() * 1.8, ph: Math.random() * 6.28 });
  }
  let rotY = 0, spin = 0.0024, tilt = 0.38, mxN = 0, myN = 0;

  function drawGlobe(time) {
    const cx = isMobile ? W * 0.5 : W * 0.74;
    const cy = isMobile ? H * 0.3 : H * 0.47;
    const R = isMobile ? Math.min(W * 0.36, H * 0.2) : Math.min(H * 0.34, W * 0.18);
    // imleç yönü: küre yavaşça imlece doğru döner
    const tx = mouse.x > 0 ? (mouse.x / W - 0.5) : 0;
    const ty = mouse.y > 0 ? (mouse.y / H - 0.5) : 0;
    mxN += (tx - mxN) * 0.04; myN += (ty - myN) * 0.04;
    rotY += spin + mxN * 0.006;
    const tl = tilt + myN * 0.25;
    const cr = Math.cos(rotY), sr = Math.sin(rotY), ct = Math.cos(tl), st = Math.sin(tl);

    // parıltı
    const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.9);
    g.addColorStop(0, 'rgba(45,125,255,0.20)'); g.addColorStop(0.5, 'rgba(20,64,170,0.10)'); g.addColorStop(1, 'rgba(6,10,22,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - R * 2, cy - R * 2, R * 4, R * 4);

    // noktalar (derinliğe göre boyut/opaklık)
    const baseA = isMobile ? 0.5 : 1;
    for (let i = 0; i < NPTS; i++) {
      const p = pts[i];
      let x = p[0] * cr + p[2] * sr;
      let z = -p[0] * sr + p[2] * cr;
      let y = p[1] * ct - z * st;
      z = p[1] * st + z * ct;
      const d = (z + 1) / 2;                // 0 arka .. 1 ön
      const a = (0.14 + d * 0.86) * baseA;
      const sz = 0.9 + d * 2.4;
      ctx.globalAlpha = a;
      ctx.fillStyle = d > 0.72 ? '#8FC8FF' : '#2D7DFF';
      ctx.fillRect(cx + x * R - sz / 2, cy + y * R - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;

    // yörünge halkaları + uydular
    for (let k = 0; k < 2; k++) {
      const rx = R * (1.32 + k * 0.22), ry = rx * (0.30 + k * 0.08), rot = -0.35 + k * 0.5;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(111,177,255,' + (isMobile ? 0.10 : 0.18) + ')'; ctx.lineWidth = 1; ctx.stroke();
      const ang = time * 0.0004 * (k ? -1 : 1) + k * 2;
      ctx.beginPath(); ctx.arc(Math.cos(ang) * rx, Math.sin(ang) * ry, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = '#BFE0FF'; ctx.shadowColor = '#4AA8FF'; ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0;
      ctx.restore();
    }

    // süzülen ışık parçacıkları (imleçle hafif paralaks)
    for (let i = 0; i < specks.length; i++) {
      const s = specks[i];
      const px = ((s.x * W + Math.sin(time * 0.0002 * s.z + s.ph) * 30) - mxN * 40 * s.z + W) % W;
      const py = ((s.y * H - (time * 0.012 * s.z) % H + H) % H);
      ctx.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(time * 0.001 + s.ph));
      ctx.fillStyle = '#8FC8FF';
      ctx.beginPath(); ctx.arc(px, py, s.s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  let t = 0;
  function draw(time) {
    ctx.clearRect(0, 0, W, H);
    t += 1;
    drawGlobe(time || t * 16);

    lines.forEach(line => {
      line.phase += line.speed;
      ctx.beginPath();
      let maxInfl = 0;
      for (let x = 0; x <= W; x += 4) {
        // İmleç etkisi
        const dx = x - mouse.x;
        const dy = line.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(0, 1 - dist / 200);
        const pull = influence * 30;

        const y = line.y
          + Math.sin(x * line.frequency + line.phase) * line.amplitude
          + Math.sin(x * line.frequency * 0.5 + line.phase * 0.7) * (line.amplitude * 0.4)
          - pull;

        if (influence > maxInfl) maxInfl = influence;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = `rgba(${brandColor.r},${brandColor.g},${brandColor.b},${Math.min(0.7, line.opacity + maxInfl * 0.45).toFixed(3)})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });
  }

  function loop() {
    if (!isVisible) return;
    draw(performance.now());
    rafId = requestAnimationFrame(loop);
  }

  // İmleç
  canvas.closest('#hero').addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  canvas.closest('#hero').addEventListener('mouseleave', () => {
    mouse.x = -1000; mouse.y = -1000;
  });

  // Görünürlük
  const observer = new IntersectionObserver(entries => {
    isVisible = entries[0].isIntersecting;
    if (isVisible) loop();
    else cancelAnimationFrame(rafId);
  });
  observer.observe(canvas.closest('#hero'));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(rafId); isVisible = false; }
    else { isVisible = true; loop(); }
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 200);
  });
  // Canvas kutusu değiştiğinde (yazı tipi yüklenince, giriş animasyonu bitince, tarayıcı çubukları
  // kayınca) iç çözünürlüğü yeniden ayarla; yoksa küre uzamış/bozuk görünür
  if (window.ResizeObserver) {
    let lastW = canvas.offsetWidth, lastH = canvas.offsetHeight, roTimer;
    new ResizeObserver(() => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      if (w === lastW && h === lastH) return;
      lastW = w; lastH = h;
      clearTimeout(roTimer);
      roTimer = setTimeout(resize, 80);
    }).observe(canvas);
  }
  window.addEventListener('load', resize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);

  resize();
  loop();
}

/* =====================================================
   HERO ANİMASYONLARI
   ===================================================== */
function initHeroAnimations() {
  if (!document.getElementById('hero')) return;
  if (prefersReducedMotion) {
    document.querySelectorAll('#hero-h1 .line-inner, .hero-sub, .hero-motto, .hero-buttons, .hero-eyebrow, .scroll-indicator')
      .forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
    return;
  }

  if (typeof gsap === 'undefined') {
    document.querySelectorAll('#hero-h1 .line-inner, .hero-sub, .hero-motto, .hero-buttons, .hero-eyebrow, .scroll-indicator')
      .forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
    return;
  }

  // Eyebrow scramble efekti
  const eyebrow = document.querySelector('.hero-eyebrow');
  if (eyebrow) {
    const original = eyebrow.textContent.trim();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ&. ';
    let frame = 0;
    let scrambleRaf;
    function scramble() {
      frame++;
      if (frame > 20) {
        eyebrow.textContent = original;
        return;
      }
      eyebrow.textContent = original.split('').map((c, i) => {
        if (c === ' ') return ' ';
        return frame > i * 1.2 ? c : chars[Math.floor(Math.random() * chars.length)];
      }).join('');
      scrambleRaf = requestAnimationFrame(scramble);
    }
    gsap.to(eyebrow, { opacity: 1, duration: 0.3, onStart: scramble });
  }

  // H1 satır maskeleri
  const lineInners = document.querySelectorAll('#hero-h1 .line-inner');
  gsap.to(lineInners, {
    y: '0%',
    duration: 0.9,
    ease: 'power3.out',
    stagger: 0.12,
    delay: 0.2,
  });

  // Alt metin ve butonlar
  gsap.to('.hero-sub', { opacity: 1, duration: 0.7, delay: 0.7 });
  gsap.to('.hero-motto', { opacity: 1, duration: 0.7, delay: 0.85 });
  gsap.to('.hero-buttons', { opacity: 1, duration: 0.7, delay: 1.0 });
  gsap.to('.scroll-indicator', { opacity: 1, duration: 0.7, delay: 1.2 });
}

/* =====================================================
   MARQUEE ŞERİDİ
   ===================================================== */
let marqueeVel = 0.5;   // işaretli, yumuşatılmış hız (px/kare)
let marqueeSign = 1;
let marqueeX = 0;

function initMarquee() {
  const track = document.querySelector('.marquee-track');
  if (!track) return;
  if (prefersReducedMotion) return;

  const inner = track.querySelector('.marquee-inner');
  if (!inner) return;
  const clone = inner.cloneNode(true);
  clone.setAttribute('aria-hidden', 'true');
  track.appendChild(clone);

  let itemW = inner.scrollWidth;
  window.addEventListener('resize', () => { itemW = inner.scrollWidth; });
  let visible = true;
  new IntersectionObserver(en => { visible = en[0].isIntersecting; }).observe(track);

  // Parmakla / fareyle sürükleyerek ileri geri oynatma
  const section = track.closest('#marquee-section') || track.parentElement;
  let dragging = false, dragStartX = 0, lastX = 0, lastT = 0, dragVel = 0, pid = null, moved = false;

  section.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true; moved = false; pid = e.pointerId;
    dragStartX = lastX = e.clientX; lastT = performance.now(); dragVel = 0;
  });
  section.addEventListener('pointermove', e => {
    if (!dragging || e.pointerId !== pid) return;
    const dx = e.clientX - lastX;
    if (!moved && Math.abs(e.clientX - dragStartX) < 6) return;
    if (!moved) { moved = true; try { section.setPointerCapture(pid); } catch (_) {} section.classList.add('is-dragging'); }
    const now = performance.now();
    marqueeX += dx;
    dragVel = dx / Math.max(now - lastT, 1) * 16;   // px/kare
    lastX = e.clientX; lastT = now;
  });
  function endDrag(e) {
    if (!dragging || (e && e.pointerId !== pid)) return;
    dragging = false; section.classList.remove('is-dragging');
    if (performance.now() - lastT > 80) dragVel = 0;   // parmak durup bırakıldıysa atalet yok
    if (moved && Math.abs(dragVel) > 0.5) marqueeSign = dragVel < 0 ? 1 : -1;  // bırakınca yön, sürükleme yönünde devam eder
  }
  section.addEventListener('pointerup', endDrag);
  section.addEventListener('pointercancel', endDrag);
  section.addEventListener('lostpointercapture', endDrag);
  // Sürüklemeden sonra yanlışlıkla link tıklanmasını engelle
  section.addEventListener('click', e => { if (moved) { e.preventDefault(); moved = false; } }, true);

  function loop() {
    if (visible) {
      if (dragging) {
        // sürüklerken otomatik kayma durur; hız yumuşakça sıfıra yaklaşsın
        marqueeVel += (0 - marqueeVel) * 0.2;
      } else {
        const v = lenis ? lenis.velocity : 0;
        if (Math.abs(v) > 0.4) marqueeSign = v > 0 ? 1 : -1;
        // bırakıldıktan sonra kalan atalet (eylemsizlik) yavaşça söner
        if (Math.abs(dragVel) > 0.05) { marqueeX += dragVel; dragVel *= 0.94; } else { dragVel = 0; }
        const target = marqueeSign * (0.5 + Math.min(Math.abs(v) * 0.22, 4));
        marqueeVel += (target - marqueeVel) * 0.06;
        marqueeX -= marqueeVel;
      }
      while (marqueeX <= -itemW) marqueeX += itemW;
      while (marqueeX > 0) marqueeX -= itemW;
      track.style.transform = `translate3d(${marqueeX.toFixed(2)}px,0,0)`;
    }
    requestAnimationFrame(loop);
  }
  loop();
}

/* =====================================================
   SCROLL ANIMASYONLARI (IntersectionObserver)
   ===================================================== */
function initScrollAnimations() {
  const animEls = document.querySelectorAll('.anim-up, .anim-fade');
  if (!animEls.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  animEls.forEach(el => observer.observe(el));
}

/* =====================================================
   ABOUT: SAYAÇLAR
   ===================================================== */
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = el.dataset.count;
        const isPlus = target.includes('+');
        const num = parseInt(target.replace('+', ''));
        const duration = 1800;
        const start = Date.now();
        const isYear = num > 1000;

        function update() {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 3);
          const cur = isYear ? Math.floor(num * ease) : Math.round(ease * num);
          el.textContent = cur + (isPlus ? '+' : '');
          el.setAttribute('aria-label', target);
          if (progress < 1) requestAnimationFrame(update);
        }
        update();
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
}

/* =====================================================
   HİZMETLER (masaüstü sabitlenmiş görünüm)
   ===================================================== */
function initServicesPin(mm) {
  const section = document.getElementById('services');
  const wrap = document.querySelector('.services-sticky-wrap');
  if (!wrap || !section) return;
  const panels = gsap.utils.toArray(wrap.querySelectorAll('.service-panel'));
  if (!panels.length) return;
  const n = panels.length;

  // Yalnızca geniş + yeterince yüksek ekranlarda pin (aksi halde alt alta kartlar)
  mm.add('(min-width: 1025px) and (min-height: 640px)', () => {
    document.documentElement.classList.add('has-pin');
    pinActive = true;

    gsap.set(panels, { opacity: 0, y: 36, pointerEvents: 'none' });
    gsap.set(panels[0], { opacity: 1, y: 0, pointerEvents: 'auto' });

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => '+=' + Math.round(window.innerHeight * 0.85 * n),
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const idx = Math.min(n - 1, Math.floor(self.progress * n * 0.999));
          panels.forEach((p, i) => { p.style.pointerEvents = i === idx ? 'auto' : 'none'; });
          panels.forEach((p) => {
            p.querySelectorAll('.services-progress-dot').forEach((d, di) => d.classList.toggle('active', di === idx));
          });
        },
      },
    });
    // Her geçiş: çıkan panel yukarı solar, giren panel alttan gelir; aralarda sabit bekleme
    for (let i = 0; i < n - 1; i++) {
      const at = i + 0.62;
      tl.to(panels[i],     { opacity: 0, y: -36, duration: 0.3, ease: 'power1.in'  }, at)
        .to(panels[i + 1], { opacity: 1, y: 0,   duration: 0.38, ease: 'power1.out' }, at + 0.22);
    }
    tl.to({}, { duration: 0.0001 }, n); // süreyi tam n'e sabitle

    // İlerleme noktalarına tıklayınca ilgili hizmet alanına git
    const st = tl.scrollTrigger;
    const onDotClick = (e) => {
      const dot = e.target.closest('.services-progress-dot');
      if (!dot) return;
      const idx = [...dot.parentElement.children].indexOf(dot);
      const y = st.start + ((idx + 0.3) / n) * (st.end - st.start);
      if (lenis) lenis.scrollTo(y, { duration: 1.2 }); else window.scrollTo({ top: y, behavior: 'smooth' });
    };
    wrap.addEventListener('click', onDotClick);

    return () => {
      wrap.removeEventListener('click', onDotClick);
      document.documentElement.classList.remove('has-pin');
      pinActive = false;
      gsap.set(panels, { clearProps: 'all' });
    };
  });
}

/* =====================================================
   HİZMETLER: MOBİL AKORDEON
   ===================================================== */
function initServicesAccordion() {
  document.querySelectorAll('.service-card-mobile').forEach(card => {
    const header = card.querySelector('.service-card-mobile-header');
    if (!header) return;
    header.addEventListener('click', () => {
      const isOpen = card.classList.contains('open');
      document.querySelectorAll('.service-card-mobile').forEach(c => c.classList.remove('open'));
      if (!isOpen) card.classList.add('open');
    });
  });
}

/* =====================================================
   NASIL ÇALIŞIYORUZ: SVG ÇİZGİSİ SCRUB
   ===================================================== */
function initTimeline() {
  const svgPath = document.getElementById('timeline-path-progress');
  const steps = document.querySelectorAll('.timeline-step');
  if (!svgPath || !steps.length) return;
  const lightAll = () => {
    steps.forEach(s => s.classList.add('lit'));
    svgPath.style.strokeDashoffset = '0';
  };
  if (prefersReducedMotion || typeof ScrollTrigger === 'undefined') { lightAll(); return; }

  const totalLen = svgPath.getTotalLength ? svgPath.getTotalLength() : 1000;
  svgPath.style.strokeDasharray = totalLen;
  svgPath.style.strokeDashoffset = totalLen;

  const holder = document.querySelector('.how-timeline') || document.getElementById('how');
  ScrollTrigger.create({
    trigger: holder,
    start: 'top 72%',
    end: 'bottom 62%',
    scrub: 0.5,
    onUpdate: (self) => {
      const p = self.progress;
      svgPath.style.strokeDashoffset = totalLen * (1 - p);
      steps.forEach((step, i) => step.classList.toggle('lit', p >= (i + 0.35) / steps.length));
    },
  });
}

/* =====================================================
   REFERANSLAR: ÇIFT YÖNLÜ MARQUEE
   ===================================================== */
function initRefMarquee() {
  const rows = document.querySelectorAll('.ref-marquee-row');
  if (!rows.length || prefersReducedMotion) return;

  const wrap = document.querySelector('.ref-marquee-wrap');
  const states = [];
  let dragging = false, moved = false, pid = null, startX = 0, lastX = 0, lastT = 0, dragVel = 0;

  // Parmakla / fareyle sürükleyerek ileri geri oynatma (iki satır birlikte hareket eder)
  if (wrap) {
    wrap.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true; moved = false; pid = e.pointerId;
      startX = lastX = e.clientX; lastT = performance.now(); dragVel = 0;
    });
    wrap.addEventListener('pointermove', e => {
      if (!dragging || e.pointerId !== pid) return;
      if (!moved && Math.abs(e.clientX - startX) < 6) return;
      if (!moved) { moved = true; try { wrap.setPointerCapture(pid); } catch (_) {} wrap.classList.add('is-dragging'); }
      const dx = e.clientX - lastX, now = performance.now();
      states.forEach(s => { s.x += dx; });
      dragVel = dx / Math.max(now - lastT, 1) * 16;
      lastX = e.clientX; lastT = now;
    });
    const endDrag = e => {
      if (!dragging || (e && e.pointerId !== pid)) return;
      dragging = false; wrap.classList.remove('is-dragging');
      if (performance.now() - lastT > 80) dragVel = 0;
      states.forEach(s => { s.vel = dragVel; });
    };
    wrap.addEventListener('pointerup', endDrag);
    wrap.addEventListener('pointercancel', endDrag);
    wrap.addEventListener('lostpointercapture', endDrag);
    // Sürükleme sonrası yanlışlıkla marka linkine gitmesin
    wrap.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    wrap.addEventListener('dragstart', e => e.preventDefault());
  }

  rows.forEach((row, rowIdx) => {
    const inner = row.querySelector('.ref-marquee-inner');
    if (!inner) return;
    const clone = inner.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    row.appendChild(clone);

    const dir = rowIdx % 2 === 0 ? 1 : -1;
    const speed = 0.4;
    const st = { x: rowIdx % 2 === 0 ? 0 : -inner.scrollWidth, vel: 0 };
    states.push(st);
    let isPaused = false;

    row.addEventListener('mouseenter', () => isPaused = true);
    row.addEventListener('mouseleave', () => isPaused = false);

    let rowVisible = true;
    new IntersectionObserver(en => { rowVisible = en[0].isIntersecting; }).observe(row);
    function loop() {
      if (rowVisible) {
        if (!dragging) {
          if (!isPaused) st.x -= speed * dir;
          if (Math.abs(st.vel) > 0.05) { st.x += st.vel; st.vel *= 0.94; } else { st.vel = 0; }
        }
        const w = inner.scrollWidth;
        if (w > 0) { while (st.x <= -w) st.x += w; while (st.x > 0) st.x -= w; }
        row.style.transform = `translateX(${st.x}px)`;
      }
      requestAnimationFrame(loop);
    }
    loop();

    // Kart tilt efekti
    row.querySelectorAll('.ref-logo-card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / (rect.width / 2);
        const dy = (e.clientY - cy) / (rect.height / 2);
        card.style.transform = `perspective(600px) rotateY(${dx * 6}deg) rotateX(${-dy * 6}deg) scale(1.04)`;
        card.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
        card.style.setProperty('--my', (e.clientY - rect.top) + 'px');
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  });
}

/* =====================================================
   KART PARILTISI (imleç takip)
   ===================================================== */
function initCardGlow() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  document.querySelectorAll('.value-card, .service-card-mobile, .ref-logo-card, .stat-card, .proj-media').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
      card.style.setProperty('--my', (e.clientY - rect.top) + 'px');
    });
  });
}

/* =====================================================
   AKTIF BÖLÜM (NAV LINK'LERİ)
   ===================================================== */
function initProjectCards() {
  document.querySelectorAll('.proj-card').forEach(card => {
    card.addEventListener('click', () => {
      const sel = document.getElementById('event_type');
      const type = card.dataset.type;
      if (sel && type && [...sel.options].some(o => o.value === type)) {
        sel.value = type; sel.classList.add('has-value');
      }
    });
  });
}
function initHeroPillars() {
  const items = document.querySelectorAll('.hero-pillar');
  if (!items.length || prefersReducedMotion) return;
  let i = 0;
  setInterval(() => {
    if (document.hidden) return;
    items[i].classList.remove('active'); items[i].classList.add('done');
    i = (i + 1) % items.length;
    if (i === 0) items.forEach(el => el.classList.remove('done'));
    // animasyonu yeniden başlat
    void items[i].offsetWidth;
    items[i].classList.add('active');
  }, 3600);
}
function initActiveNav() { /* bölüm spy artık initSectionNav içinde (IntersectionObserver) */ }

/* =====================================================
   ANCHOR KAYDIRMA (header ofset)
   ===================================================== */
function initAnchorLinks() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const hash = a.getAttribute('href');
      if (!hash || hash === '#') return;
      const target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      scrollToTarget(target, target.id);
      if (history.replaceState) history.replaceState(null, '', hash);
    });
  });
}

/* =====================================================
   FORM
   ===================================================== */
function initForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const submitBtn = form.querySelector('[type="submit"]');
  const statusEl = document.getElementById('form-status');
  const successEl = document.getElementById('success-check');
  const mailtoNote = document.getElementById('mailto-note');

  // Select has-value kontrolü
  const selectEl = form.querySelector('select[name="event_type"]');
  if (selectEl) {
    selectEl.addEventListener('change', () => {
      if (selectEl.value) selectEl.classList.add('has-value');
      else selectEl.classList.remove('has-value');
    });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();

    // Honeypot
    const hp = form.querySelector('.hp-field input');
    if (hp && hp.value) return;

    // Doğrulama
    let valid = true;
    const required = form.querySelectorAll('[required]');
    required.forEach(field => {
      const wrap = field.closest('.field-wrap') || field.closest('.kvkk-wrap');
      if (!field.value || (field.type === 'checkbox' && !field.checked)) {
        valid = false;
        if (wrap) {
          wrap.classList.remove('shake');
          void wrap.offsetWidth;
          wrap.classList.add('shake');
          setTimeout(() => wrap.classList.remove('shake'), 400);
        }
      }
    });
    if (!valid) return;

    const lang = CONFIG.lang;

    const mailtoFallback = () => {
      const fd = new FormData(form);
      const name = fd.get('name') || '';
      const company = fd.get('company') || '';
      const msg = fd.get('message') || '';
      const eventType = fd.get('event_type') || '';
      const body = `Ad Soyad: ${name}\nŞirket: ${company}\nEtkinlik Türü: ${eventType}\n\n${msg}`;
      window.location.href = `mailto:info@promexturkey.com?subject=${encodeURIComponent('Teklif Talebi - ' + name)}&body=${encodeURIComponent(body)}`;
      if (mailtoNote) { mailtoNote.style.display = 'block'; }
      submitBtn.disabled = false;
      submitBtn.textContent = CONFIG.lang === 'en' ? 'Send Request' : 'Teklif Talep Et';
    };

    if (!CONFIG.formEndpoint) { mailtoFallback(); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = lang === 'en' ? 'Sending…' : 'Gönderiliyor…';

    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch(CONFIG.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data),
      });

      if ([404, 405, 501].includes(res.status)) { mailtoFallback(); return; } // sunucuda PHP yoksa e-posta uygulamasına düş

      if (res.ok) {
        form.style.display = 'none';
        if (successEl) {
          successEl.style.display = 'block';
          // Tik çizme animasyonu
          setTimeout(() => {
            const circle = successEl.querySelector('.circle-path');
            const check = successEl.querySelector('.check-path');
            if (circle) circle.classList.add('drawn');
            setTimeout(() => { if (check) check.classList.add('drawn'); }, 500);
          }, 100);
        }
      } else {
        throw new Error('server');
      }
    } catch (err) {
      if (statusEl) {
        statusEl.className = 'form-status error';
        statusEl.textContent = lang === 'en'
          ? 'Something went wrong. Please try again or email us directly.'
          : 'Bir hata oluştu. Lütfen tekrar deneyin veya doğrudan e-posta gönderin.';
      }
      submitBtn.disabled = false;
      submitBtn.textContent = lang === 'en' ? 'Send Request' : 'Teklif Talep Et';
    }
  });
}

/* =====================================================
   GSAP SCROLL TRİGGER ANIMASYONLAR (masaüstü)
   ===================================================== */
function initGSAPAnimations() {
  if (prefersReducedMotion || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const ctaText = document.querySelector('.cta-band-text');
  if (ctaText) {
    gsap.fromTo(ctaText, { x: -24 }, {
      x: 24, ease: 'none',
      scrollTrigger: { trigger: '#cta-band', start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }

  const heroContent = document.querySelector('.hero-content');
  if (heroContent) {
    gsap.to(heroContent, {
      y: -70, opacity: 0.25, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
    });
  }

  // Manifesto: kelimeler kaydırmayla belirir (scrub)
  const mWords = gsap.utils.toArray('.manifesto-text .w');
  if (mWords.length) {
    gsap.set(mWords, { opacity: 0.16 });
    gsap.to(mWords, {
      opacity: 1, ease: 'none', stagger: 0.25,
      scrollTrigger: { trigger: '#manifesto', start: 'top 78%', end: 'center 45%', scrub: true },
    });
  }

  initServicesPin(gsap.matchMedia());
  initTimeline();

  // Yazı tipi/görsel yüklenince ölçüleri yenile; sonra #hash varsa oraya git
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener('load', () => {
    refresh();
    if (location.hash && lenis) {
      const t = document.querySelector(location.hash);
      if (t) lenis.scrollTo(t, { offset: (t.id === 'services' && pinActive) ? 0 : -72, immediate: true });
    }
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
}

/* =====================================================
   BAŞLATMA
   ===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initLenis();
  initProgressBar();
  initHeader();
  initMobileMenu();
  initLangSwitcher();
  initSectionNav();
  initCustomCursor();
  initHeroCanvas();
  initMarquee();
  initScrollAnimations();
  initCounters();
  initServicesAccordion();
  initRefMarquee();
  initCardGlow();
  initActiveNav();
  initProjectCards();
  initHeroPillars();
  initAnchorLinks();
  initForm();

  // GSAP gerektiren animasyonlar (CDN yüklendikten sonra)
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    initGSAPAnimations();
  } else {
    initTimeline(); // CDN yoksa: tüm adımlar görünür
  }

  // Intro (en son, diğer animasyonlar hazır olduktan sonra)
  if (!sessionStorage.getItem('promex-intro-done')) {
    initIntro();
  } else {
    const overlay = document.getElementById('intro-overlay');
    if (overlay) overlay.classList.add('done');
    initHeroAnimations();
  }
});
