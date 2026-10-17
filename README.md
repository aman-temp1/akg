# amangupta.me

Portfolio of Aman Gupta, full-stack GenAI engineer in Pune, India.

A typography-first, pure monochrome site built with **Astro 7**, **Tailwind CSS 4**, **GSAP** (ScrollTrigger, SplitText, Flip) and **Lenis**, with native view transitions between pages.

## Run it

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # type-checks, then builds the static site into dist/
npm run preview   # serves dist/
```

Node 22 or newer.

## Pages

| Route | What it is |
| --- | --- |
| `/` | Hero with the neural field, selected work, statement, latest writing |
| `/work` | All projects, filter by tag, grid or list view (animated with Flip) |
| `/work/[id]` | Case study; the cover morphs in from the work grid |
| `/writing`, `/writing/[id]` | Posts by year; posts have a progress bar and table of contents |
| `/about` | Story, experience, stack, certifications, resume |
| `/lab` | "Ask my portfolio", BM25 retrieval over every case study and post, in the browser |
| `/contact` | Copy-to-clipboard email and a contact form |
| `/404` | The neural field spells 404 and scatters away from the cursor |

Also generated: `/rss.xml`, `/sitemap-index.xml`, `/lab-index.json`.

## Adding content

- **A project:** add `src/content/work/<id>.mdx` and its cover to `src/assets/work/`. Front matter is validated by `src/content.config.ts`. `featured: true` puts it on the home page; `order` sets its position.
- **A post:** add `src/content/writing/<id>.md` with `title`, `description`, `date` and `tag`.

Both are picked up by the Lab search automatically.

## Motion

All motion lives in `src/lib/`:

- `motion.ts`: the shared easing (`expo.out`), durations, and effects: masked text reveals (`data-reveal`, `data-reveal="chars"`), `data-fade`, `data-fill` (words fill on scroll), `data-clip` (image wipe) and `data-magnetic`.
- `app.ts`: Lenis, the cursor, the theme toggle's circular reveal, the first-visit preloader, the footer marquee, the work-list image follower, and setup/teardown around Astro page swaps.
- `neural-field.ts`: the canvas dot network in the hero and on the 404 page.

With `prefers-reduced-motion: reduce`, smooth scroll, the cursor, the preloader and all reveals are off, page transitions become a 200 ms fade, and the neural field draws once as a static grid. Content is fully visible without JavaScript.

## Optional settings

Copy `.env.example` to `.env`:

- `PUBLIC_FORMSPREE_ID`: send the contact form through Formspree. Without it, the form opens the visitor's email app.
- `PUBLIC_ASK_ENDPOINT`: an endpoint that receives `{ question, context }` and streams back an answer, which turns the Lab demo from extractive answers into generated ones.

## Deploying

The output is a static `dist/` folder, so it runs on any static host. Redirects from the old site's URLs (`/project.html`, `/projects/*.html`, `/blogs/*.html` and so on) are included for Cloudflare Pages and Netlify (`public/_redirects`) and Vercel (`vercel.json`). The `CI` workflow type-checks and builds every push and pull request.
