# American Revolution RTS

A complete browser-based real-time strategy foundation for the American Revolutionary War (1775–1783).

## Development

Open `index.html` directly in a modern browser, or serve the folder with:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## First prototype

- 13-city strategic campaign map
- American and British ownership
- Independent city garrisons
- City-only recruitment
- Real travel-time army transfers
- Basic enemy-city battles
- Capturing settlements and casualty outcomes
- Shared campaign money and independent city income

## Technology

Vanilla HTML5 Canvas and JavaScript were chosen for zero-install setup, fast iteration, and browser accessibility. The game is organised into model, campaign, economy/battle rule, and interface modules so engine systems can grow without rewriting the prototype.
