# Crystal of Atlan dungeon planner

Weekly gold planner for Crystal of Atlan raid dungeons. Enter each character's name and power; the app assigns attempts so every character lands as close as possible to the **1,000,000** weekly gold cap.

**Live site:** [https://sphynx-henryay.github.io/coa-dungeon-planner/](https://sphynx-henryay.github.io/coa-dungeon-planner/)

## Rules

- Each character can take a dungeon at most **3** times per week.
- Account-wide cap is **18** reward claims per dungeon per week (same as the totals row on the Excel dungeon tab).
- Weekly gold is capped at **1,000,000** per character.
- Power gates:
  - King, Queen, TOF, AD: no limit
  - DL: 40,000
  - SP, DD, HT, KS: 60,000
- Gold per clear is taken from the dungeon-tab headers in `燒賣 裝備.xlsx`.

Weaker characters are planned first so they keep the no-limit high-gold dungeons. Stronger characters fill 60k-gated dungeons first.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL Vite prints, add powers for the preloaded spreadsheet names (or your own roster), then click **Calculate weekly plan**.

## Deploy GitHub Pages

Pushes to `main` deploy automatically via GitHub Actions. To publish the current build immediately:

```bash
npm run deploy:pages
```
