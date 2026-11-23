# Family Rewards — Child UI age-mode design guidelines

**Status:** Required UI acceptance standard for PR #51 (Child Experience 2.0), and subsequent child-facing work.  
**Scope:** Child picker, chore kiosk, profile, achievements, avatar workshop and navigation.  
**Core principle:** **One coherent application with three adaptive presentations**, not three duplicated page implementations.

## Source of truth and age resolution

Use `resolveKioskMode(ageYears, kioskMode)` in `src/lib/kiosk-age-mode.ts`; do not make up separate age thresholds in UI components.

| Resolved mode | AUTO age range | Tone | Information density |
| --- | --- | --- | --- |
| **JUNIOR** | unknown age, ages 0–7 | Friendly, playful, simple | Low |
| **EXPLORER** | ages 8–12 | Adventurous, game-like, encouraging | Medium |
| **TEEN** | ages 13+ | Mature, tidy, respectful, not babyish | Higher, still uncluttered |

Parent-configured `JUNIOR`, `EXPLORER` or `TEEN` overrides `AUTO` for layout; allow a parent to choose the presentation that best suits an individual child's needs regardless of chronological age. **Presentation mode must never override security, content eligibility, parent approvals, age-based avatar permissions, balances or rules.** Those stay enforced by their existing server-side policies.

## Shared design language: required for ALL modes

- Retain a consistent Family Rewards navigation model, component vocabulary and theme. Change density, typography, phrasing and emphasis, not route semantics or currency math.
- Prioritise one clear primary action per card/screen; avoid multiple competing CTAs and stacked/nested panels repeating the same information.
- Aim for efficient space use through content-aware grid/container responsive layouts. Avoid forced vertical scrolling, horizontal overflow, huge blank areas and dead zones on landscape displays.
- Preserve readable contrast, visible keyboard focus, clear disabled/error/loading states, screen-reader labels and understandable icons paired with text.
- Touch controls: aim for **at least 48 x 48 CSS px** across child screens; **56–64 px** on core Junior actions where practical. Maintain spacing between destructive and confirm controls.
- Minimum normal text size **16 px**; Junior primary copy generally **18–22 px**. Supporting labels may be smaller when genuinely secondary, but never tiny for crucial information.
- Support reduced motion, user sound preferences and low-stimulation interaction: avoid continuously pulsing buttons, mandatory confetti, blocking achievement celebrations, or animations needed to understand a result.
- Use concise, consistent language; reserve celebration colours for actual success/milestones; keep locked items visibly distinct without making descriptions unreadable.
- XP, Stars and themed currency share the same values/API regardless of age mode. Details about earning rules should be accessible on demand, not repeated as persistent help paragraphs.
- Keep navigation consistent across kiosk/profile/achievements/workshop, preserving sensible back behavior and the existing idle-to-home policy.

## JUNIOR: 0–7 years (or parent override)

**Visual target:** Simple, warm, icon-led and high contrast; no busy dashboard look.

- **Chores:** Large picture/icon, short task label and Star reward. Make completion a single large, obvious action. Substeps are large, sequential and easy to tick. Show only essential current states; hide secondary analytics, technical words and detailed totals.
- **Profile:** One friendly, large avatar; first-name greeting; one easy-to-read Level + XP indicator; compact Stars and currency row; two obvious actions — **Dress Up** and **Badges**. Avoid separate large statistics panels.
- **Achievements:** Large badge pictures, clear locked/unlocked states and visual progress; hide long descriptions until selected. One badge/goal can be highlighted at a time.
- **Workshop:** Large character preview, visible colour/part thumbnails, few category choices shown at a time. A selected option should be obvious; avoid dense text or multiple modal layers.
- **Navigation:** Large icon + short word; minimise destinations and choices. Reinforce success with a subtle sound/short toast when configured, never a forced acknowledgement.
- **Responsive approach:** Typically one-column chore cards on narrow screens and two when space actually allows; do not squeeze targets to force columns.
- **Copy examples:** “My Chores”, “I did it!”, “Dress Up”, “My Badges”, “Stars”.

## EXPLORER: 8–12 years (or parent override)

**Visual target:** Game-like progression and independence, without unnecessary decorations.

- **Chores:** Two-up cards when width allows, concise subtasks and clearly visible completion status. Display Stars and a small shortcut to the profile.
- **Profile:** Avatar + name plus a compact Level/XP/currency strip; achievement preview and next-goal hint. Prioritise **Customise Avatar** and **Achievements**, with no repeated progress panels.
- **Achievements:** Responsive grid with badge, title and current/required progress. Category filters visible; extra descriptions revealed on tap/focus.
- **Workshop:** Efficient category tabs and multiple thumbnails per row, with owned, equipped and locked statuses distinguishable at a glance.
- **Navigation:** Clear Home/Chores, Profile and Shop targets. Optional secondary details via deliberate expand/info controls.
- **Copy examples:** “Today's Challenges”, “Level Up”, “Avatar Workshop”, “Achievements”.

## TEEN: 13+ years (or parent override)

**Visual target:** More mature, efficient, neutral layout; **never** forced infantile copy, bouncing graphics or oversized emoji-only tiles.

- **Chores:** Compact yet accessible multi-column/list layout, useful status groups (To Do, Awaiting Approval, Done), task detail on demand, obvious completion and Star values.
- **Profile:** Tighter avatar/name header, unobtrusive Level/XP progress and currency, small achievement highlights; no oversized hero consuming the first screen.
- **Achievements:** Denser filtered grid/list with precise progress and concise text; avoid oversized badges and celebratory overlays.
- **Workshop:** Space-efficient side-by-side preview + controls on wide viewports, more visible items per row, concise labels and clear ownership states.
- **Navigation:** Compact clear labels, consistent desktop and touch behavior; maintain 48 px tap targets even when the visual treatment is smaller.
- **Copy examples:** “Tasks”, “Progress”, “Appearance”, “Achievements”. No baby talk.
- **Celebrations:** Short, non-blocking, low-motion and easy to ignore.

## Cross-screen information hierarchy

| Screen | Always visible | Secondary / on demand | Remove from primary view |
| --- | --- | --- | --- |
| Chore kiosk | Child, Stars, chores & main action, Profile/Shop navigation | Pending/done detail | Full achievement grid, detailed XP explanations |
| Profile | Avatar, name, Level/XP, Stars, themed coins, two clear actions | Badge preview, reward details | Multiple giant stat panels, duplicate CTAs |
| Achievements | Badges, locked/progress states, filter/navigation | Descriptions, earning details | Modal celebrations, repeated large profile header |
| Workshop | Avatar preview, category selection, appearance grid, save | Details/cost confirmation | Dense instructional paragraphs, unused preview margins |

## Acceptance tests / regressions

1. In AUTO, validate age 7 = JUNIOR, 8 = EXPLORER, 12 = EXPLORER and 13 = TEEN; unknown ages fall back to JUNIOR.
2. Confirm each parent override renders its chosen layout regardless of DOB; no change to actual age-based permissions/eligibility.
3. Verify meaningful differences in **typography, content density, copy, card sizing, default information shown and celebration intensity**, not only different accent colours.
4. Test 360x800, 600x960, 800x1280, 1024x768 and 1920x1080; especially touch portrait and wider landscape layouts.
5. Ensure no clipped controls, horizontal overflow, tiny touch targets, excessive blank space or repeated information.
6. Verify keyboard access, screen readers, reduced motion, sound off, long names, empty states and unfamiliar/zero balances.
7. Regression-test existing kiosk sessions, chore submission, approvals, Stars, XP/levels, badge awards, Workshop ownership and parent PIN restrictions.
8. Produce screenshots **for each mode at portrait and wide sizes** where a browser runner is available. Never mark visual review completed solely because unit tests or a build passed.

This document describes UI presentation rules only. The current economic, migration, security and audit behaviour must remain unchanged.
