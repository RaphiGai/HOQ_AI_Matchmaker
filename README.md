# HoQ AI Matchmaker

Mockup of a web app that turns a **customer request** into a weighted **House of Quality** (QFD).
Student project in the DTU course *38108 Technology & Innovation Management* together with Meili Robots.

**Live demo:** https://raphigai.github.io/HOQ_AI_Matchmaker/

> **Status: clickable mockup.** All projects are fictitious examples, the AI is simulated with keyword rules, and the
> relationship values are illustrative team estimates. Not an official Meili Robots product.

## Concept

```
Customer request ──► documents ──► AI draft + follow-up questions ──► team review / override ──► approve ──► PDF report
```

1. **Project = one customer request** (RFI or inquiry): customer, vertical, region, description.
2. **Upload documents**: RFI forms, site plans, IT requirements, notes.
3. **AI draft**: the AI weights the customer needs, adds needs it finds in the documents, fills the relationship
   matrix and the roof, and asks follow-up questions about what is missing. Every change comes with a reason and a source.
4. **Review**: the team edits everything (importance, 9/3/1 relationships, roof, direction, needs, characteristics,
   competitor ratings). Cells that differ from the AI draft are marked. Regenerating the draft keeps manual changes.
5. **Report**: top-3 technical characteristics, ranked needs, the full House of Quality, answers, reasoning, change log.
   Export as PDF via the browser print dialog.

### QFD cascade

| | Rows (WHATs) | Columns (HOWs) | Status |
|---|---|---|---|
| **House 1** | Customer needs | Meili’s technical characteristics (from the team’s Excel draft) | in the mockup |
| **House 2** | Prioritised characteristics | Partner technologies (sensing, network, robots, lifts) → suggested package | planned |

The template (needs, importance, characteristics, directions, roof, competitors) comes from the team’s Excel draft
`House_of_Quality_Meili.xlsx`. Its relationship matrix and competitor ratings were still empty; the matrix in
[`src/data/template.ts`](src/data/template.ts) holds illustrative estimates, competitor ratings start empty.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5173/HOQ_AI_Matchmaker/
npm run build      # type check + production build into dist/
```

Pushing to `main` deploys to GitHub Pages via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Project structure

```
src/
  ai/provider.ts        AiProvider interface (contract for the real AI)
  ai/mockProvider.ts    simulated AI: keyword rules + follow-up questions
  data/template.ts      House of Quality template from the Excel draft
  data/seed.ts          fictitious example projects
  lib/hoq.ts            scores, change tracking (diff / re-apply), status
  lib/store.ts          projects in localStorage, JSON import
  components/           pages and the HouseOfQuality grid
```

## Connecting a real AI

Implement `AiProvider` (`src/ai/provider.ts`) and swap it in `src/components/DraftTab.tsx`.

- **Never put an API key into this repo or the frontend.** GitHub Pages is public; the model must be called through a
  small backend or serverless function that holds the key.
- The backend parses PDF/Office files (the mockup only stores file names for those) and returns an `AiDraft`
  (`house`, `questions`, `rationale`) as structured JSON.
- Keep the human in the loop: the AI drafts, the team decides. The UI already tracks every override.
- Only anonymised data in public AI services.

## Data and confidentiality

- The site is public. Use fictitious or anonymised data only.
- Projects are stored in the viewer’s browser (`localStorage`). Share a project with **Export JSON** / **Import JSON**.

## Contributing

1. Create a branch, e.g. `feature/house-2`.
2. `npm run build` must pass.
3. Open a pull request into `main`; merging deploys the demo.

Open points: real AI provider and backend, House 2 (partner technologies), competitor ratings with Meili, shared storage
instead of `localStorage`.

## Use of AI

Code and texts of this mockup were created with the help of Claude Code (Anthropic) and reviewed by the team, in line
with the course’s policy on marking AI-generated content.
