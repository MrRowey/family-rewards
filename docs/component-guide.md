# Website component guide

Use Base for the homepage and ContentPage for internal pages. Brand, NavLinks and ThemeToggle are shared by the site shell. Navigation and base-aware URLs live in src/lib/site.ts. ButtonLink, FeatureCard, SectionHeading and Notice provide reusable UI. Keep existing application terminology until verified. Test keyboard navigation, Escape to close mobile menu, light/dark persistence, and narrow viewports (320, 375, 768, 1100, 1280px). No application source belongs on this branch.
