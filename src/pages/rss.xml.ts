import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE } from '@/lib/site';

export async function GET(context: APIContext) {
  const posts = (await getCollection('writing')).sort((a, b) => +b.data.date - +a.data.date);
  return rss({
    title: 'Aman Gupta, writing',
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.date,
      link: `/writing/${p.id}/`,
      categories: [p.data.tag],
    })),
  });
}
