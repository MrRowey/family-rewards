import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const schema = z.object({
  title: z.string(),
  description: z.string(),
  status: z.enum(['draft', 'verified']).default('draft'),
  order: z.number().default(0),
});
export const collections = {
  documentation: defineCollection({ loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/documentation' }), schema }),
  features: defineCollection({ loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/features' }), schema }),
  changelog: defineCollection({ loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/changelog' }), schema }),
};
