# Liberty's Cause — American Revolution RTS

A from-scratch browser game prototype about the American Revolutionary War. It uses native HTML, CSS, JavaScript modules, and Canvas: there is no engine installation or external asset dependency. This keeps the project easy to run, inspect, and expand, and makes a lightweight web release straightforward.

## Run locally

Open `index.html` in a modern browser, or serve the project folder (recommended for JavaScript modules):

```bash
python3 -m http.server 8080
```

Then visit <http://localhost:8080>.

## Phase 1: playable foundation

- Stylized campaign map with thirteen settlements, roads, rivers, faction colors, and local garrison counts.
- Click a city to inspect its owner and its independent, class-by-class roster.
- Send a chosen number of a unit class between American-controlled cities. Units leave the source garrison immediately, travel visibly, and join the destination garrison on arrival.
- Dispatch all stationed troops from an American city to an unoccupied British settlement; they travel on the map and occupy it when they arrive.
- Troops in another city or in transit do not automatically join a garrison. A force aimed at a defended enemy city is not launched; tactical battles are not implemented yet.
- Campaign totals are derived from local rosters and travelling forces; there is no recruitable or stationed global soldier pool.

The initial map is a simplified, fictionalized setup for gameplay and is not an exact historical depiction of 1775 territorial control. The prototype does not yet include recruitment, income simulation, tactical combat, upgrades, or campaign progression; those belong to later phases.

## Project structure

- `index.html`, `styles.css` — accessible game shell and responsive interface.
- `src/main.js` — rendering, interaction, travel and campaign state updates.
- `src/campaign.js` — settlement and road data.
- `src/models.js` — independent city garrisons and travelling forces.
- `src/config.js` — factions and unit definitions.
- `src/gameRules.js` — roster operations and validation helpers.
- `src/battle.js` — explicit Phase 1 placeholder; no battle is claimed to be implemented.

## Render

For this static browser prototype, create a **Static Site** in Render. Use the repository root as the publish directory. No build command is required. If deploying as a Web Service instead, serve the static files with a small web server; do not use a Node app start command for this no-build project.
