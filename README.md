# Little Heroes Village Website

Independent public website and documentation. Never merge application branches into gh-pages.

## Development
Use Node.js 24 LTS (at least 24.0.0) or a compatible newer release meeting Astro's engine requirements. Run `npm ci`, `npm run dev`, `npm run check`, and `npm run build`. Preview with `npm run preview`. Use `npm audit` to review dependency advisories.

## Content
Markdown and MDX collections live in `src/content/`. Entries require title and description; status defaults to draft. Verify content against the application before publication. Use fictional family data only.

## Deployment
Select GitHub Actions in Settings > Pages when ready to publish. The workflow validates builds on pushes to gh-pages; deployment requires a manual workflow dispatch with publish enabled. Never publish application source or private data.
