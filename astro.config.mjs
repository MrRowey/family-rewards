import { defineConfig } from 'astro/config';
import tailwind from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
export default defineConfig({site:'https://mrrowey.github.io',base:'/family-rewards',integrations:[mdx()],vite:{plugins:[tailwind()]}});
