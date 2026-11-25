# Liberty's Cause — American Revolution RTS

A browser-based, from-scratch real-time strategy prototype made with HTML, CSS, JavaScript modules, and Canvas. It has no engine installation or external assets. The game is intentionally built in playable increments rather than claiming the entire historical RTS brief is already complete.

## Play locally

Run a local static server from the project directory (recommended for browser JavaScript modules):

```bash
python3 -m http.server 8080
```

Open <http://localhost:8080> in a modern desktop browser.

## Current playable features

- Thirteen-settlement campaign map with faction ownership, roads, rivers, local garrison counts, and travelling armies.
- Click a city to view its own roster. Garrisoned soldiers are never held in a shared recruitable pool.
- Recruit only from American-controlled cities. Recruitment costs money, takes time, and completes into that city's own garrison subject to local capacity.
- Send a chosen class and number of soldiers between friendly cities. They leave the source garrison while travelling and join the destination only on arrival.
- Select an American city, then click a British settlement on the map to dispatch all stationed troops. Ungarrisoned settlements are occupied on arrival; defended settlements start a real-time tactical encounter.
- In tactical battles, select soldiers individually or with a drag box; right-click to move. Soldiers automatically seek and fire on nearby enemies. Casualties are removed from the correct roster; surviving attackers capture the town or return to origin after defeat/retreat.
- American-controlled settlements generate shared campaign income over time. Captures award a one-time purse.
- Washington/history panel includes contextual historical information and notes about the limitations of the simplified map.

## Controls

- **Campaign:** click a settlement; use the right panel to recruit or transfer troops. To attack, select a Continental city, then click a Crown city on the map.
- **Battle:** left-click a soldier to select; left-drag to select a group; right-click to move selected soldiers. Units attack automatically in range. Use the right-panel buttons for formations, hold, and retreat.

## Render deployment

Create a **Static Site**. Leave the build command empty and set the publish directory to `.` (repository root).

## Structure

- `index.html`, `styles.css` — interface and responsive layout.
- `src/main.js` — campaign loop, canvas rendering, recruitment, movement, battle simulation, UI.
- `src/campaign.js` — city/road data.
- `src/models.js` — city garrisons and travelling armies.
- `src/config.js` — faction and unit stats.
- `src/gameRules.js` — roster operations.

## Not implemented yet

The full brief remains larger than this prototype: historical mission scripting and event chain, enemy strategic AI/counterattacks, French allies, supply/food effects, city upgrades, save/load, detailed city-specific battle maps, advanced formations/terrain modifiers, multiple objectives, sound, and extensive testing/balancing are future work. The initial map's ownership and positions are fictionalized for gameplay and should not be read as a precise historical map.
