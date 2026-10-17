import Lenis from 'lenis';
import {
  gsap,
  ScrollTrigger,
  SplitText,
  EASE,
  prefersMotion,
  revealText,
  fadeUp,
  scrollFill,
  clipReveal,
  magnetic,
} from './motion';
import { mountNeuralField } from './neural-field';
import { SITE } from './site';

gsap.registerPlugin(ScrollTrigger, SplitText);

let lenis: Lenis | null = null;
let cleanups: Array<() => void> = [];
let booted = false;

/* ---------------- Global, run once ---------------- */

function setupLenis() {
  if (!prefersMotion() || matchMedia('(pointer: coarse)').matches) return;
  lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function setupCursor() {
  const cursor = document.querySelector<HTMLElement>('[data-cursor]');
  if (!cursor || !prefersMotion() || !matchMedia('(pointer: fine)').matches) return;
  const label = cursor.querySelector<HTMLElement>('[data-cursor-label]')!;
  const xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3.out' });
  const yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3.out' });
  gsap.set(cursor, { x: innerWidth / 2, y: -40 });
  addEventListener('pointermove', (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
  });
  document.addEventListener('pointerover', (e) => {
    const t = e.target as Element;
    const labelled = t.closest<HTMLElement>('[data-cursor-text]');
    const hidden = t.closest('[data-cursor-hide]');
    const interactive = t.closest('a, button, [role="button"], input, textarea, label, select');
    cursor.classList.toggle('is-label', !!labelled);
    cursor.classList.toggle('is-hidden', !!hidden && !labelled);
    cursor.classList.toggle('is-hover', !!interactive && !labelled && !hidden);
    label.textContent = labelled?.dataset.cursorText ?? '';
  });
  document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
  document.addEventListener('pointerenter', () => cursor.classList.remove('is-hidden'));
}

/** Hide the header while scrolling down, bring it back on the way up. */
function setupHeaderAutoHide() {
  let last = scrollY;
  const root = document.documentElement;
  addEventListener(
    'scroll',
    () => {
      const y = scrollY;
      if (Math.abs(y - last) < 6) return;
      root.classList.toggle('header-hidden', y > last && y > 240);
      last = y;
    },
    { passive: true },
  );
  document.addEventListener('astro:after-swap', () => {
    root.classList.remove('header-hidden');
    last = 0;
  });
}

function setupClock() {
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: SITE.timeZone });
  const tick = () =>
    document.querySelectorAll('[data-clock]').forEach((el) => (el.textContent = `${fmt.format(new Date())} IST`));
  tick();
  setInterval(tick, 10_000);
}

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme;
}

function setupTheme() {
  document.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLElement>('[data-theme-toggle]');
    if (!btn) return;
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('theme', next);
    } catch {}
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
    if (!doc.startViewTransition || !prefersMotion()) return applyTheme(next);
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const root = document.documentElement;
    root.style.setProperty('--tx', `${x}px`);
    root.style.setProperty('--ty', `${y}px`);
    root.style.setProperty('--tr', `${radius}px`);
    root.classList.add('theme-switching');
    doc.startViewTransition(() => applyTheme(next)).finished.finally(() => root.classList.remove('theme-switching'));
  });
}

function setupDelegatedClicks() {
  document.addEventListener('click', async (e) => {
    const t = e.target as Element;
    const copy = t.closest<HTMLElement>('[data-copy]');
    if (copy) {
      const value = copy.dataset.copy!;
      const label = copy.querySelector<HTMLElement>('[data-copy-label]') ?? copy;
      const original = label.textContent;
      try {
        await navigator.clipboard.writeText(value);
        label.textContent = 'Copied to clipboard';
      } catch {
        location.href = `mailto:${value}`;
        return;
      }
      setTimeout(() => (label.textContent = original), 1600);
    }
    if (t.closest('[data-to-top]')) {
      lenis ? lenis.scrollTo(0, { duration: 1.6 }) : scrollTo({ top: 0, behavior: 'smooth' });
    }
    const menuBtn = t.closest<HTMLElement>('[data-menu-toggle]');
    if (menuBtn) toggleMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.documentElement.classList.contains('menu-open')) toggleMenu(false);
  });
}

function toggleMenu(force?: boolean) {
  const menu = document.querySelector<HTMLElement>('[data-mobile-menu]');
  const btn = document.querySelector<HTMLElement>('[data-menu-toggle]');
  if (!menu || !btn) return;
  const open = force ?? menu.hidden === true;
  btn.setAttribute('aria-expanded', String(open));
  btn.querySelector('span')!.textContent = open ? 'Close' : 'Menu';
  document.documentElement.classList.toggle('menu-open', open);
  if (open) {
    menu.hidden = false;
    lenis?.stop();
    if (prefersMotion()) {
      gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.8, ease: 'expo.inOut' });
      gsap.from(menu.querySelectorAll('li'), { yPercent: 60, autoAlpha: 0, duration: 0.8, ease: EASE, stagger: 0.05, delay: 0.25 });
    }
  } else {
    lenis?.start();
    if (prefersMotion()) {
      gsap.to(menu, { clipPath: 'inset(0 0 100% 0)', duration: 0.6, ease: 'expo.inOut', onComplete: () => (menu.hidden = true) });
    } else menu.hidden = true;
  }
}

function runPreloader(): Promise<void> {
  const root = document.documentElement;
  if (!root.classList.contains('is-loading')) return Promise.resolve();
  try {
    sessionStorage.setItem('visited', '1');
  } catch {}
  const el = document.querySelector<HTMLElement>('[data-preloader]')!;
  const count = el.querySelector<HTMLElement>('[data-preloader-count]')!;
  const state = { v: 0 };
  return new Promise((resolve) => {
    gsap
      .timeline({ onComplete: resolve })
      .to(state, {
        v: 100,
        duration: 1.2,
        ease: 'steps(12)',
        onUpdate: () => (count.textContent = String(Math.round(state.v)).padStart(2, '0')),
      })
      .add(() => {
        // Let the page reveal start underneath while the panel lifts
        setTimeout(resolve, 250);
      })
      .to(el, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' })
      .add(() => root.classList.remove('is-loading'));
  });
}

/* ---------------- Per page ---------------- */

function setActiveNav() {
  const path = location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll<HTMLAnchorElement>('.site-header nav a').forEach((a) => {
    const href = a.getAttribute('href')!;
    if (path === href || path.startsWith(`${href}/`)) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

function setupMarquee(): () => void {
  const track = document.querySelector<HTMLElement>('[data-marquee] .marquee-track');
  if (!track || !prefersMotion()) return () => {};
  const first = track.children[0] as HTMLElement;
  let x = 0;
  let dir = -1;
  const base = 0.045; // px per ms
  const tick = (_t: number, delta: number) => {
    const v = lenis?.velocity ?? 0;
    if (v !== 0) dir = v > 0 ? -1 : 1;
    x += dir * (base + Math.min(Math.abs(v) * 0.02, 0.8)) * delta;
    const w = first.offsetWidth;
    if (x <= -w) x += w;
    if (x > 0) x -= w;
    track.style.transform = `translate3d(${x}px,0,0)`;
  };
  gsap.ticker.add(tick);
  return () => gsap.ticker.remove(tick);
}

/** A preview image trails the cursor over rows with `data-preview`. */
function setupFollower(): () => void {
  const list = document.querySelector<HTMLElement>('[data-follower]');
  const box = document.querySelector<HTMLElement>('[data-follower-box]');
  if (!list || !box || !prefersMotion() || !matchMedia('(pointer: fine)').matches) return () => {};
  const imgs = gsap.utils.toArray<HTMLElement>('[data-follower-img]', box);
  const xTo = gsap.quickTo(box, 'x', { duration: 0.6, ease: 'power3.out' });
  const yTo = gsap.quickTo(box, 'y', { duration: 0.6, ease: 'power3.out' });
  const rTo = gsap.quickTo(box, 'rotation', { duration: 0.8, ease: 'power3.out' });
  let lastX = 0;
  let current = -1;
  const show = (i: number) => {
    if (i === current) return;
    imgs.forEach((img, j) => {
      if (j === i) {
        gsap.fromTo(img, { clipPath: 'inset(100% 0 0 0)', zIndex: 2 }, { clipPath: 'inset(0% 0 0 0)', duration: 0.7, ease: 'expo.out' });
      } else gsap.set(img, { zIndex: 1 });
    });
    current = i;
  };
  const move = (e: PointerEvent) => {
    xTo(e.clientX);
    yTo(e.clientY);
    rTo(gsap.utils.clamp(-12, 12, (e.clientX - lastX) * 0.6));
    lastX = e.clientX;
  };
  const enter = (e: PointerEvent) => {
    gsap.set(box, { x: e.clientX, y: e.clientY });
    gsap.to(box, { autoAlpha: 1, scale: 1, duration: 0.5, ease: EASE });
  };
  const leave = () => {
    gsap.to(box, { autoAlpha: 0, scale: 0.7, duration: 0.4, ease: EASE });
    current = -1;
  };
  const over = (e: Event) => {
    const row = (e.target as Element).closest<HTMLElement>('[data-preview]');
    if (row) show(Number(row.dataset.preview));
  };
  gsap.set(box, { autoAlpha: 0, scale: 0.7, xPercent: -50, yPercent: -50 });
  list.addEventListener('pointermove', move);
  list.addEventListener('pointerenter', enter);
  list.addEventListener('pointerleave', leave);
  list.addEventListener('pointerover', over);
  return () => {
    list.removeEventListener('pointermove', move);
    list.removeEventListener('pointerenter', enter);
    list.removeEventListener('pointerleave', leave);
    list.removeEventListener('pointerover', over);
  };
}

function setupProgress(): () => void {
  const bar = document.querySelector<HTMLElement>('[data-progress]');
  if (!bar) return () => {};
  const st = ScrollTrigger.create({
    trigger: document.querySelector('[data-progress-target]') ?? document.body,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => (bar.style.transform = `scaleX(${self.progress})`),
  });
  return () => st.kill();
}

async function initPage() {
  setActiveNav();
  toggleMenu(false);
  const pageCleanups: Array<() => void> = [];

  document.querySelectorAll<HTMLCanvasElement>('canvas[data-neural-field]').forEach((c) => {
    pageCleanups.push(mountNeuralField(c, { text: c.dataset.text }));
  });
  pageCleanups.push(magnetic(), setupProgress());

  if (prefersMotion()) {
    await document.fonts.ready;
    await runPreloader();
    const hero = document.querySelector('[data-hero]') ?? undefined;
    if (hero) pageCleanups.push(revealText(hero, { immediate: true }));
    pageCleanups.push(revealText(document, { skipHero: true }), scrollFill(), setupMarquee(), setupFollower());
    fadeUp();
    clipReveal();
    ScrollTrigger.refresh();
  }
  cleanups = pageCleanups;
  document.dispatchEvent(new CustomEvent('ag:page-ready'));
}

function cleanupPage() {
  cleanups.forEach((fn) => fn());
  cleanups = [];
  ScrollTrigger.getAll().forEach((st) => st.kill());
}

export function boot() {
  if (booted) return;
  booted = true;
  setupLenis();
  setupCursor();
  setupClock();
  setupHeaderAutoHide();
  setupTheme();
  setupDelegatedClicks();

  document.addEventListener('astro:page-load', initPage);
  document.addEventListener('astro:before-swap', (e) => {
    cleanupPage();
    // Keep theme and motion state on the incoming document
    const next = (e as unknown as { newDocument: Document }).newDocument.documentElement;
    const cur = document.documentElement;
    next.dataset.theme = cur.dataset.theme;
    const keep = [...cur.classList].filter((c) => !['is-loading', 'menu-open', 'header-hidden', 'theme-switching'].includes(c));
    next.classList.add(...keep);
  });
  document.addEventListener('astro:after-swap', () => {
    lenis?.scrollTo(0, { immediate: true, force: true });
    lenis?.resize();
  });
}
