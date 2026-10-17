import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

/** Chunks of every case study and post, used by the retrieval demo in /lab. */
export interface Chunk {
  id: number;
  title: string;
  section: string;
  url: string;
  kind: 'Case study' | 'Post';
  text: string;
}

const clean = (md: string) =>
  md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>]/g, '')
    .replace(/^\s*[-\d.]+\s+/gm, '')
    .trim();

function chunk(body: string, base: Omit<Chunk, 'id' | 'section' | 'text'>, out: Omit<Chunk, 'id'>[]) {
  let section = 'Introduction';
  let buf: string[] = [];
  const flush = () => {
    const text = clean(buf.join(' ')).replace(/\s+/g, ' ');
    if (text.split(' ').length > 12) out.push({ ...base, section, text });
    buf = [];
  };
  for (const block of body.split(/\n{2,}/)) {
    const h = block.match(/^#{2,4}\s+(.*)/);
    if (h) {
      flush();
      section = h[1].trim();
      continue;
    }
    buf.push(block);
    if (buf.join(' ').split(/\s+/).length > 110) flush();
  }
  flush();
}

export const GET: APIRoute = async () => {
  const out: Omit<Chunk, 'id'>[] = [];
  for (const p of await getCollection('work')) {
    out.push({ title: p.data.title, url: `/work/${p.id}`, kind: 'Case study', section: 'Summary', text: `${p.data.summary} Built with ${p.data.stack.join(', ')}. ${p.data.metrics.map((m) => `${m.label}: ${m.value}.`).join(' ')}` });
    chunk(p.body ?? '', { title: p.data.title, url: `/work/${p.id}`, kind: 'Case study' }, out);
  }
  for (const p of await getCollection('writing')) {
    chunk(p.body ?? '', { title: p.data.title.split(':')[0], url: `/writing/${p.id}`, kind: 'Post' }, out);
  }
  return new Response(JSON.stringify(out.map((c, id) => ({ id, ...c }))), {
    headers: { 'Content-Type': 'application/json' },
  });
};
