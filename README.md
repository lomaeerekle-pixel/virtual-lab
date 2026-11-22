# 🔬 ვირტუალური ლაბორატორია — Virtual School Lab

A Georgian-language virtual lab for schools when physical equipment isn't available. Works in any browser on computers and phones, and installs as an app (PWA, works offline).

**Live:** https://radiant-meringue-3ae1a6.netlify.app

## What's inside
- **🔌 Circuit Designer** (Tinkercad-style): 27 components, breadboard, real electrical simulation, Arduino code, 18 starter projects and 9 auto-checked challenges.
- **⚡ Technical Lab**: Arduino C++ simulator with LEDs, button, sensors, servo, motor, serial monitor and 7 auto-tested exercises.
- **🔬 STEM Lab**: 37 interactive simulations in physics, chemistry, math, biology, geography, astronomy and informatics, with 115 challenges and a "subject + code" bridge.
- **📐 Formula reference**: 218 formulas across 8 subjects with calculators that solve for any variable and links to simulations.
- **🏫 Roles**: one Admin, Teachers (classes, assignments, grading) and Students (join classes, complete and submit work).

## Demo accounts
| Role | Email | Password |
|---|---|---|
| Admin | admin@lab.ge | Admin2026! |
| Teacher | teacher@lab.ge | teacher123 |
| Student | student@lab.ge | student123 |

## Run locally
No build step and no dependencies: open `index.html`, or run `python3 -m http.server 8080` in this folder and open http://localhost:8080.

## Deploy
Static site: publish the repository root as-is (Render, Netlify, Vercel, GitHub Pages, Cloudflare Pages). When releasing an update, bump `VERSION` in `sw.js` so installed apps refresh.

> Data is stored in each browser's `localStorage`. To share classes and assignments between devices, connect `js/core/store.js` (`VL.api`) to a backend such as Supabase or Firebase.
