import { gsap } from 'gsap';

interface Chunk {
  id: number;
  title: string;
  section: string;
  url: string;
  kind: string;
  text: string;
}

const STOP = new Set(
  'a an and are as at be but by can do does for from how i in is it its me my of on or so that the this to was what when where which who why will with you your about into than then them they their there these those has have had not no yes using use used'.split(
    ' ',
  ),
);

const tokenize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map((t) => t.replace(/(ing|ed|es|s)$/, '') || t);

/** Okapi BM25 over pre-chunked passages. */
function buildIndex(chunks: Chunk[]) {
  const docs = chunks.map((c) => tokenize(`${c.title} ${c.section} ${c.text}`));
  const df = new Map<string, number>();
  docs.forEach((d) => new Set(d).forEach((t) => df.set(t, (df.get(t) ?? 0) + 1)));
  const avg = docs.reduce((n, d) => n + d.length, 0) / docs.length;
  const N = docs.length;
  const k1 = 1.4;
  const b = 0.75;
  return (query: string) => {
    const q = [...new Set(tokenize(query))];
    return docs
      .map((d, i) => {
        let score = 0;
        for (const t of q) {
          const f = d.filter((x) => x === t).length;
          if (!f) continue;
          const idf = Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
          score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.length) / avg)));
        }
        return { chunk: chunks[i], score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
  };
}

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function highlight(text: string, query: string) {
  const terms = [...new Set(tokenize(query))].filter((t) => t.length > 2);
  let html = escape(text);
  if (!terms.length) return html;
  const re = new RegExp(`\\b(${terms.map((t) => t.replace(/[-]/g, '\\-')).join('|')})\\w*`, 'gi');
  return html.replace(re, '<mark>$&</mark>');
}

function bestSentence(text: string, query: string) {
  const q = new Set(tokenize(query));
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  let best = sentences[0];
  let top = -1;
  for (const s of sentences) {
    const score = tokenize(s).filter((t) => q.has(t)).length / Math.sqrt(s.length / 80 + 1);
    if (score > top) {
      top = score;
      best = s;
    }
  }
  return best.trim();
}

export async function mountAsk(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>('[data-ask]')!;
  const input = form.querySelector('input')!;
  const results = root.querySelector<HTMLElement>('[data-results]')!;
  const answer = root.querySelector<HTMLElement>('[data-answer]')!;
  const answerText = root.querySelector<HTMLElement>('[data-answer-text]')!;
  const steps = [...root.querySelectorAll<HTMLElement>('[data-step]')];
  const count = root.querySelector<HTMLElement>('[data-count]')!;
  const endpoint = root.dataset.endpoint;
  const motion = document.documentElement.classList.contains('motion');

  const chunks: Chunk[] = await fetch('/lab-index.json').then((r) => r.json());
  const search = buildIndex(chunks);
  const wait = (ms: number) => new Promise((r) => setTimeout(r, motion ? ms : 0));
  const setStep = (i: number) =>
    steps.forEach((s, j) => {
      s.classList.toggle('is-active', j === i);
      s.classList.toggle('is-done', j < i);
    });

  let run = 0;
  const ask = async (q: string) => {
    if (!q.trim()) return;
    const id = ++run;
    results.innerHTML = '';
    answer.hidden = true;
    setStep(0);
    await wait(280);
    setStep(1);
    const counter = { v: 0 };
    if (motion) gsap.to(counter, { v: chunks.length, duration: 0.5, ease: 'power2.out', onUpdate: () => (count.textContent = String(Math.round(counter.v))) });
    else count.textContent = String(chunks.length);
    const ranked = search(q).slice(0, 3);
    await wait(560);
    if (id !== run) return;
    setStep(2);
    await wait(320);
    results.innerHTML = ranked.length
      ? ranked
          .map(
            (r) => `<li><a href="${r.chunk.url}">
              <span><span class="mono muted">${escape(r.chunk.kind)}</span><br><span class="r-title">${escape(r.chunk.title)}</span><br><span class="muted">${escape(r.chunk.section)}</span></span>
              <span class="r-text">${highlight(r.chunk.text, q)}</span>
              <span class="mono muted r-score">${r.score.toFixed(2)}</span></a></li>`,
          )
          .join('')
      : `<li><p class="muted" style="padding:24px 0">Nothing matched. Try asking about a project, a tool, or one of the posts.</p></li>`;
    if (motion) gsap.from(results.children, { y: 24, autoAlpha: 0, duration: 0.8, ease: 'expo.out', stagger: 0.08 });
    setStep(3);
    if (!ranked.length) return setStep(4);
    answer.hidden = false;
    if (endpoint) {
      answerText.textContent = '';
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q, context: ranked.map((r) => r.chunk) }),
        });
        const reader = res.body!.getReader();
        const dec = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done || id !== run) break;
          answerText.textContent += dec.decode(value, { stream: true });
        }
      } catch {
        answerText.textContent = bestSentence(ranked[0].chunk.text, q);
      }
    } else {
      const text = `“${bestSentence(ranked[0].chunk.text, q)}”`;
      if (motion) {
        answerText.textContent = '';
        for (const word of text.split(' ')) {
          if (id !== run) return;
          answerText.textContent += (answerText.textContent ? ' ' : '') + word;
          await wait(28);
        }
      } else answerText.textContent = text;
    }
    setStep(4);
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    ask(input.value);
  });
  root.querySelectorAll<HTMLButtonElement>('[data-suggest]').forEach((b) =>
    b.addEventListener('click', () => {
      input.value = b.textContent!.trim();
      ask(input.value);
    }),
  );
}
