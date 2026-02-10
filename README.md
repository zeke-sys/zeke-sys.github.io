# zeke-sys.github.io

<ins>**About This Portfolio**</ins>

This is my personal portfolio website, built from the ground up using HTML, CSS, and JavaScript. The goal of this project is to showcase my technical skills, professional background, and software projects in a clean, responsive, and premium-feeling interface.

## Site Structure

The site currently includes:

- **Home** – Hero section, years-in-audit / degrees / certifications stats, concise introduction, featured work (RSA toolkit and trie autocomplete), skills & tech stack, and a call-to-action to get in touch.
- **Projects** – Curated project cards with images, short "Impact / what I learned" lines for key projects, tech stack, GitHub links, and a live trie demo link. Includes a short "How I approach work" section, "Jump to" filters by project type, and a new card for EvidenceIQ (AI-powered audit workspace).
- **About** – Narrative overview of my background, Education, Strengths & Focus, Now & Next, Experience, Certifications, How I Work, and Personal Interests with a small photo gallery and a lightbox that supports next/previous navigation between images.
- **Trie Demo** – Browser-based autocomplete demo backed by a trie visualization, plus an "Under the hood" explanation tying it back to the C++ implementation, and a clear link back to the Projects tab.
- **Writing** – Short notes on audit-informed code reviews, building a trie autocomplete, bringing security thinking into early designs, turning audit findings into tests, and small automations that actually ship.
- **Contact** – Focused page with links to my LinkedIn and resume for quick outreach.

All pages share a fixed, glassy navbar with a custom ZI logo, theme toggle (light/dark), and consistent footer with GitHub/LinkedIn links.

## Features & Implementation

This portfolio demonstrates my ability to:

- Build responsive layouts from scratch with semantic HTML and a shared CSS design system.
- Implement UI animations, a global theme toggle, and small interaction details (lightbox gallery with next/previous controls, scroll-in animations).
- Reuse components (cards, pills, stats, sections) across pages for a cohesive, maintainable design.
- Present security, audit, and systems experience alongside hands-on C++ and Java projects, plus work on an AI-powered audit workspace (EvidenceIQ), in a recruiter-friendly way.

## Tech Stack

- **Frontend:** HTML5, modern CSS (flexbox/grid, custom properties), vanilla JavaScript
- **Projects showcased:** C++ (algorithms, cryptography, trie autocomplete), Java (menu-driven application)
- **Tooling:** Lightweight static site, optional local HTTP server for development

## Running the Site Locally

You can view the site locally by opening `index.html` in a browser:

1. Clone or download this repository.
2. Open the folder in your file explorer.
3. Double-click `index.html` (or use "Open with" → your browser of choice).

For a slightly closer-to-production setup (and to avoid any browser restrictions on local files), you can also serve it with a simple HTTP server (for example, `python -m http.server` from the project folder) and visit `http://localhost:8000`.

## Planned Improvements

- Add more interactive demos tied to backend or systems-focused projects.
- Expand the Writing section with deeper dives into security, audit, and reliability topics.
- Introduce basic CI (linting/build checks) for consistency as the site grows.

More features and content will be added over time as I continue to grow and expand my technical capabilities.



