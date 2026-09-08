# Aurelia Estates

A cinematic luxury real-estate portfolio concept, built as the frontend foundation of a future property platform. Phase 1 focuses on art direction, considered motion, accessible interaction and a maintainable data model.

**Aurelia Estates is fictional.** Listings, developers, prices, dates, distances, brand statistics and testimonials are illustrative. Photography is architectural mood imagery and does not depict the listed residences. Forms do not create real bookings, collect leads or transmit contact details.

## Phase 1

- Full-screen architectural hero with a wordmark prelude, coordinated GSAP reveal, subtle pointer depth and magnetic primary action.
- Responsive desktop navigation and a choreographed mobile menu with focus management and Escape dismissal.
- Eight typed residences across Hyderabad, Visakhapatnam, Bengaluru, Goa, Chennai and Pune.
- Working local filters for location, property type, bedrooms and maximum price; combined filters, clear and empty states.
- Large residence cards with a desktop ScrollTrigger horizontal sequence, direct mobile swiping and shared-image Motion layout IDs for detail panels.
- Five-scene pinned story: architecture, craft, lifestyle, connectivity and private living. Stacked scenes on mobile and reduced motion.
- Asymmetric signature developments, animated concept statistics, interactive locations, amenities, sample resident perspectives and an editorial journal.
- Aurelia AI local preview: deterministic intent parsing for city, BHK, property type and budgets in Crores or Lakhs. Recommendations come from the same property dataset.
- Validated demo visit/advisor forms, newsletter preview, social and legal concept panels.
- Responsive WebP photography at 640, 1,200 and 1,800 pixels, local static image loader and lazy loading. Only the hero is prioritized.
- Static export: no backend, database, authentication, maps, real AI, WhatsApp or Three.js packages.

## Stack

Next.js 16.3.4 with App Router, React 19, TypeScript, Tailwind CSS 4, Motion for React, GSAP + ScrollTrigger, Lenis and Lucide React. Base UI supplies accessible dialog/select primitives. Oxlint and Oxfmt handle linting and formatting. Exact installed versions are recorded in `package.json` and `package-lock.json`.

## Local setup

Use Node.js 22.13 or newer and npm. Node 24 was used for validation.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. No environment variables, API keys or account setup are needed.

```sh
npm run build
npm start
```

The production export is written to `out/`. `npm start` serves that exact export at http://localhost:3001 using the small built-in Node static preview server. This server is a development utility, not a production hosting server.

## Scripts

| Script                             | Purpose                                               |
| ---------------------------------- | ----------------------------------------------------- |
| `npm run dev`                      | Next development server on port 3000                  |
| `npm run build`                    | Typecheck and build static export                     |
| `npm start`                        | Preview static export on port 3001                    |
| `npm run typecheck`                | TypeScript validation                                 |
| `npm run lint`                     | Type-aware lint and accessibility rules               |
| `npm test`                         | Local dataset, filtering, intent and formatting tests |
| `npm run format -- --write`        | Format source                                         |
| `node scripts/optimize-images.mjs` | Regenerate local WebP variants from source JPG files  |

On Windows, use `npm.cmd` if your PowerShell execution policy prevents running `npm.ps1`.

## Structure

```text
app/                         App Router composition, metadata and design tokens
components/animation/        Lenis/GSAP lifecycle, cursor and magnetic interaction
components/layout/           Navigation, footer, shared panel state and dialogs
components/sections/         Hero, discovery, pinned story and editorial sections
components/property/         Reusable residence card
components/ui/               Small set of shared accessible primitives
hooks/                       Reserved for reusable feature hooks
lib/discovery.ts             Pure local filtering and recommendation adapter
lib/image-loader.ts          Static responsive image routing
lib/utils.ts                 Class composition helper
data/properties.ts           Eight complete fictional residence records
data/editorial.ts            Scenes, destinations and sample testimonials
types/property.ts            Shared domain contracts
public/images/               Local source photos and optimized variants
scripts/                     Image preparation and static preview utilities
tests/                       Deterministic domain behavior checks
.openai/hosting.json          Private Sites project and static output configuration
```

## Design and animation architecture

The visual system uses ivory, deep olive-charcoal and restrained bronze, with editorial serif display type and neutral sans-serif controls. Large imagery, generous negative space and asymmetric editorial layouts provide rhythm.

`MotionEngine` owns one Lenis instance synchronized to the GSAP ticker and ScrollTrigger. It removes its ticker callback, subscriptions and cursor listeners on cleanup. Component scroll timelines are scoped with GSAP contexts and media queries. The residence rail pins above 1,000px; the story uses the same breakpoint. Natural mobile scroll remains available.

Motion handles mobile-menu choreography, image layout IDs, testimonials, destination changes and button feedback. Shared `ExperienceProvider` state keeps property detail, visit, advisor, assistant and information panels consistent. Dialogs use Base UI focus trapping, scroll locking, Escape handling and focus return.

Reduced-motion preferences remove the loader, smooth scrolling, custom cursor and pinned sequences. All story chapters become ordinary document content. Native focus indicators and links remain usable. The scene layout also has a CSS fallback when enhancement is absent.

`HeroVisual` and `StoryVisual` expose replaceable React children. A future dynamically loaded R3F canvas or rendered film can occupy these media slots while retaining the surrounding content, accessibility and navigation. Property images use stable `property-image-${id}` layout IDs as the starting point for connected property-page transitions. Actual detail routes and 3D scenes are deliberately deferred.

The future assistant boundary is `recommendProperties(prompt): Recommendation`. Its current parser supports city names (including Vizag), BHK/bedroom counts, property type and `under`, `below`, `up to` or `budget` amounts expressed in Cr/Crore/Lakhs. It is not a language model: unsupported requests receive a transparent collection fallback. The future flow is intent extraction → data query → ranking → recommendation → lead capture → visit.

## Content and privacy

All form values and assistant queries remain in React memory. Closing a panel or reloading clears them. No analytics, cookies or browser storage are used by this application. Hosting infrastructure can still process ordinary request logs. The domain `aurelia.example` is an intentional placeholder; its action opens the demo advisor panel.

Prices use Crores/Lakhs and `en-IN` area formatting. Distances and possession dates are concept metadata, not verified commercial information. Search applies a maximum total price to the illustrative starting price.

## Photography credits

Photos are used under the [Unsplash License](https://unsplash.com/license). They are mood references only.

| Asset               | Photographer        | Source                                  |
| ------------------- | ------------------- | --------------------------------------- |
| Hero villa          | Avi Werde           | https://unsplash.com/photos/hHz4yrvxwlA |
| Private villa       | John Fornander      | https://unsplash.com/photos/y3_AHHrxUBY |
| Exterior            | Florian Schmidinger | https://unsplash.com/photos/b_79nOqf95I |
| Interior            | Roberto Nickson     | https://unsplash.com/photos/rEJxpBskj3Q |
| Pool                | Lefteris Kallergis  | https://unsplash.com/photos/ewSBvLSp3Tc |
| Garden              | Drew Coffman        | https://unsplash.com/photos/wH1ykpPWwzI |
| Residential setting | Daniel Barnes       | https://unsplash.com/photos/RKdLlTyjm5g |

## Validation

See `QUALITY-AUDIT.md` for the executed checks and their practical limits. Automated domain tests cover combined filtering, no matches, Indian budget parsing, assistant result selection, unique records and price formatting. Browser checks cover the rendered experience and local interactions; these are not a substitute for future cross-device performance testing.

## Roadmap

| Phase | Scope                                                              |
| ----- | ------------------------------------------------------------------ |
| 2     | Advanced animation and transition polish                           |
| 3     | Blender + React Three Fiber property experience                    |
| 4     | Dedicated property pages and advanced discovery                    |
| 5     | PostgreSQL + Prisma + Neon database                                |
| 6     | Authentication and customer accounts                               |
| 7     | Admin CRM, property/unit workflows and leads                       |
| 8     | Real AI property assistant and recommendation pipeline             |
| 9     | WhatsApp Cloud API and Google Maps integrations                    |
| 10    | Analytics, expanded testing, performance and production deployment |

Before real-world use, replace all fictional content, review regulatory and privacy requirements, add secure server-side validation, validate factual property information and perform cross-browser/device testing. This phase establishes the interface and integration boundaries; it does not claim production backend readiness.
