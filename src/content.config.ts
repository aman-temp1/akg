import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const work = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/work' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string(),
      category: z.string(),
      tags: z.array(z.string()),
      year: z.number(),
      role: z.string(),
      stack: z.array(z.string()),
      cover: image(),
      coverAlt: z.string(),
      order: z.number(),
      featured: z.boolean().default(false),
      metrics: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
      links: z
        .object({ repo: z.url().optional(), live: z.url().optional() })
        .default({}),
    }),
});

const writing = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tag: z.string(),
  }),
});

export const collections = { work, writing };
