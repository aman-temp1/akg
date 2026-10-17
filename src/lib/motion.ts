import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

/** One easing and three durations, used everywhere. */
export const EASE = 'expo.out';
export const DUR = { ui: 0.4, reveal: 0.9, page: 1.2 } as const;

export const prefersMotion = () => document.documentElement.classList.contains('motion');

type Cleanup = () => void;

/**
 * Masked text reveal. `data-reveal="chars"` rises by character (titles),
 * anything else rises by line (paragraphs). Splits are reverted after playing.
 */
export function revealText(root: ParentNode = document, { immediate = false, skipHero = false } = {}): Cleanup {
  const els = gsap.utils
    .toArray<HTMLElement>('[data-reveal]', root as Element)
    .filter((el) => !skipHero || !el.closest('[data-hero]'));
  const splits: SplitText[] = [];
  els.forEach((el) => {
    const byChar = el.dataset.reveal === 'chars';
    const delay = Number(el.dataset.delay ?? 0);
    const split = SplitText.create(el, {
      type: byChar ? 'lines,chars' : 'lines',
      mask: 'lines',
      linesClass: 'line-mask',
      autoSplit: true,
      onSplit(self) {
        gsap.set(el, { visibility: 'visible' });
        const targets = byChar ? self.chars : self.lines;
        return gsap.from(targets, {
          yPercent: 115,
          duration: byChar ? 1.1 : DUR.reveal,
          ease: EASE,
          stagger: byChar ? 0.018 : 0.07,
          delay,
          scrollTrigger: immediate ? undefined : { trigger: el, start: 'top 88%', once: true },
          onComplete: () => self.revert(),
        });
      },
    });
    splits.push(split);
  });
  return () => splits.forEach((s) => s.revert());
}

/** Fade-and-rise for blocks (images, rows). */
export function fadeUp(root: ParentNode = document) {
  gsap.utils.toArray<HTMLElement>('[data-fade]', root as Element).forEach((el) => {
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 40 },
      {
        autoAlpha: 1,
        y: 0,
        duration: DUR.reveal,
        ease: EASE,
        delay: Number(el.dataset.delay ?? 0),
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      },
    );
  });
}

/** Words fill from muted to ink while scrolling through the element. */
export function scrollFill(root: ParentNode = document): Cleanup {
  const splits: SplitText[] = [];
  gsap.utils.toArray<HTMLElement>('[data-fill]', root as Element).forEach((el) => {
    const split = SplitText.create(el, {
      type: 'words',
      autoSplit: true,
      onSplit(self) {
        return gsap.fromTo(
          self.words,
          { opacity: 0.16 },
          {
            opacity: 1,
            ease: 'none',
            stagger: 0.1,
            scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: 0.6 },
          },
        );
      },
    });
    splits.push(split);
  });
  return () => splits.forEach((s) => s.revert());
}

/** Clip-path reveal for images: `data-clip`. */
export function clipReveal(root: ParentNode = document) {
  gsap.utils.toArray<HTMLElement>('[data-clip]', root as Element).forEach((el) => {
    const img = el.querySelector('img');
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' });
    if (img) tl.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.8, ease: EASE }, 0);
  });
}

/** Elements drift toward the pointer: `data-magnetic`. */
export function magnetic(root: ParentNode = document): Cleanup {
  if (!matchMedia('(pointer: fine)').matches) return () => {};
  const offs: Cleanup[] = [];
  gsap.utils.toArray<HTMLElement>('[data-magnetic]', root as Element).forEach((el) => {
    const strength = Number(el.dataset.magnetic || 0.3);
    const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => {
      xTo(0);
      yTo(0);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    offs.push(() => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      gsap.set(el, { clearProps: 'transform' });
    });
  });
  return () => offs.forEach((f) => f());
}

export { gsap, ScrollTrigger, SplitText };
