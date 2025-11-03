## Purpose

This file gives concise, repo-specific guidance for AI coding assistants working on Droop ERP (Next.js + Firebase + Cloud Functions).

---

## Big-picture architecture (quick)

- Frontend: Next.js (app directory) in the repository root (`app/`). UI components live under `components/` and `app/` pages/layouts.
- Client Firebase code: `firebase/` — contains the client initialization helper (`firebase/index.ts`) and React providers used in `app/layout.tsx`.
- Server: Cloud Functions for Firebase in `functions/src/` (TypeScript). `functions/src/index.ts` re-exports all function handlers. These compile to `functions/lib` when built.
- AI/autmation: repo has both server-side workers (`functions/src/aiAutomationWorker.ts`) and local/dev AI flows under `src/ai/` used by `genkit` tooling.
- External adapters: `droop-payment-bridge/` hosts a small server (Node `server.js`) and a `lib/bankomatDriver.js` for payment devices — treat this as a separate process integration.

## Key conventions and patterns to follow

- Firebase initialization: `firebase/index.ts` intentionally attempts to call `initializeApp()` without args first (so Firebase Hosting can inject env). Do not change this pattern; in development fallback uses `firebase/config.ts`.
- Cloud Functions entrypoint: add new function handlers under `functions/src/` and export them from `functions/src/index.ts`. The functions project is built with `tsc` and deployed from `functions/`.
- AI dev tooling: `genkit` is used for local AI flows. Root package.json has `genkit:dev` and `genkit:watch` which run `src/ai/dev.ts` (this wires local AI flows). Use these when iterating on AI assistants.
- Types & build: `next.config.ts` currently disables blocking on TypeScript and ESLint during build (keep this in mind when fixing types versus CI enforcement). Functions have their own `tsc` build step.
- State & Providers: global providers are wired in `app/layout.tsx` (`FirebaseClientProvider`, `AiStateProvider`, `CashDrawerProvider`). For UI changes, prefer updating providers/hooks in `hooks/` and `firebase/` exports.

## Local developer workflows (quick commands)

- Install deps (root):
  - PowerShell: `npm install`
- Run Next.js dev server (root):
  - PowerShell: `npm run dev`  # uses `next dev --turbopack`
- AI dev flows (root):
  - PowerShell: `npm run genkit:dev`  # starts genkit and runs `src/ai/dev.ts`
  - `npm run genkit:watch` watches AI flows
- Cloud Functions (inside `functions/`):
  - Build: `cd functions; npm run build`
  - Emulate: `cd functions; npm run serve`  # runs `firebase emulators:start --only functions` after build
  - Deploy functions: `cd functions; npm run deploy`
  - View logs: `cd functions; npm run logs`

## Integration points to be careful with

- Stripe and payment device code live in `functions/src/stripe.ts` and `functions/src/paymentDevice.ts`. Webhook and device callbacks are exported from `functions/src/index.ts` — changes here affect live billing flows.
- POS/UI and offline sync: `app/dashboard/pos/`, `functions/src/syncOfflineTransactions.ts`, and `droop-payment-bridge/` must remain consistent when changing transaction shapes.
- Externally sensitive configuration: `firebase/config.ts` contains project keys for local dev; production hosting injects vars at runtime — do not hardcode production secrets in source.

## Where to look for examples

- Global wiring: `app/layout.tsx` (shows providers order and usage)
- Firebase client pattern: `firebase/index.ts` (no-arg initialize fallback behavior)
- Cloud functions exports: `functions/src/index.ts` (how server-side handlers are organized)
- AI flow bootstrap: `src/ai/dev.ts` (imports flows) and `components/ai/` (example UI integration)

## Quick code examples (copyable patterns)

- Adding a new Cloud Function:

  1. Create `functions/src/myHandler.ts` and export a function (use existing functions as examples).
  2. Add an export in `functions/src/index.ts`: `export { myHandler } from './myHandler';`
  3. From `functions/` run `npm run build` and `npm run serve` to test locally.

- Using the Firebase client in a component:

  - Import from the firebase barrel: `import { initializeFirebase, getSdks } from 'firebase';` — see `firebase/index.ts` for helpers.

## Templates & snippets

Below are small, copy-paste-ready examples that are commonly useful when working in this repo.

- Cloud Function (TypeScript) template — put in `functions/src/myHandler.ts` and export from `functions/src/index.ts`:

```ts
import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

export const myHandler = onRequest(async (req, res) => {
  try {
    // example: read/write Firestore
    const db = admin.firestore();
    // ... your logic here ...
    res.status(200).send({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'internal' });
  }
});
```

Notes: functions use `admin.initializeApp()` at `functions/src/index.ts`. Keep handlers small; move heavy jobs to workers under `functions/src/` or `src/`.

## What NOT to change without coordination

- The no-arg `initializeApp()` pattern in `firebase/index.ts` (used for Firebase Hosting env injection).
- Function export layout in `functions/src/index.ts` (keeps deployments explicit).
- The `droop-payment-bridge/` integration files — treat as an external adapter.

## Final notes

- Prefer small, focused edits. When touching functions, run the functions emulator and check logs (`npm run serve` then `npm run logs`).
- If you add new long-running background tasks for AI or automation, prefer building them under `functions/src/` (for deployment) or `src/ai/` + `genkit` for local/dev experiments.

---

## Troubleshooting (quick)

- Emulator doesn't start / missing exports: run a clean build in `functions/` before starting the emulator to ensure `lib/` is up to date:

```powershell
cd functions; npm run build; npm run serve
```

- Frequent error: "initializeApp() called with no app" in dev — this repo intentionally tries no-arg `initializeApp()` for Firebase Hosting. In dev ensure `firebase/config.ts` is present and `NODE_ENV` is not 'production'. To debug locally, set `process.env.FIREBASE_CONFIG` or initialize with the config object temporarily.

- Type errors blocked by Next build: `next.config.ts` sets `typescript.ignoreBuildErrors = true` and `eslint.ignoreDuringBuilds = true`. Use `npm run typecheck` and `npm run lint` locally to find issues the CI may surface later.

- Cloud Functions deploy fails with Node engine mismatch: the functions `package.json` requires `node: 20`. Ensure your local Firebase CLI and Node version match (use nvm or similar).

## Team policy (short)

- Commit message prefix: use `feat:`, `fix:`, `chore:`, `docs:` for consistency. Keep subject under 72 chars.
- PR labels: `type: feature`, `type: bug`, `area: functions`, `area: web`, `needs: review`. Add `area: functions` when changing anything under `functions/` to prompt emulator testing.

---

## CI/CD & deployment (recommended)

This project uses Next.js hosting and Firebase Cloud Functions. Below are recommended CI/CD practices, a deploy checklist, and notes for GitHub Actions.

- Deploy checklist (run locally before pushing a release):
  1. Run a full TypeScript check and lint at the root: `npm run typecheck` and `npm run lint`.
 2. Build the Next app: `npm run build` (this sets NODE_ENV=production in the root script).
 3. Build Cloud Functions: `cd functions; npm run build` to regenerate `functions/lib`.
 4. Run quick smoke tests and, if applicable, the functions emulator: `cd functions; npm run serve` and exercise key endpoints.
 5. Verify secrets/hosting config in GitHub repo settings (see required secrets below).

- GitHub Actions guidance (high level):
  - Use two-step deploys: build artifact step (install deps, run typecheck, build Next and functions) followed by deploy step that runs `firebase deploy --only hosting,functions`.
  - Use Node 20 in action runners to match functions engine. Example: `actions/setup-node@v4` with `node-version: '20'`.
  - Cache node_modules for both root and `functions/` to speed up builds.
  - Require manual approvals or deploy to a preview/staging project first. Use separate Firebase projects for staging and production.

- Required secrets / repo variables:
  - `FIREBASE_SERVICE_ACCOUNT` (JSON) — service account key with deploy permissions for `firebase-tools`.
  - `FIREBASE_PROJECT` — the production Firebase project id (or use per-environment variables).
  - `GENKIT_*` envs if running genkit flows in CI (only if needed).

- Example notes to make Actions safer:
  - Run `npm run typecheck` and `npm run lint` and fail early on errors.
  - Build `functions/` before `firebase deploy` to ensure `lib/` matches `src/`.
  - Prefer `firebase deploy --only hosting` for quick frontend pushes, and `--only functions` for function releases to reduce blast radius.

- Minimal GitHub Actions recipe (leave in the doc as an example; do not auto-create workflows):

```yaml
# Build and deploy (conceptual)
name: Build and deploy
on:
  push:
    branches: [ main ]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install root deps
        run: npm ci
      - name: Typecheck & Lint
        run: npm run typecheck && npm run lint
      - name: Build app
        run: npm run build
      - name: Build functions
        run: cd functions && npm ci && npm run build
      - name: Deploy to Firebase
        env:
          FIREBASE_SERVICE_ACCOUNT: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          FIREBASE_PROJECT: ${{ secrets.FIREBASE_PROJECT }}
        run: |
          echo "$FIREBASE_SERVICE_ACCOUNT" > /tmp/firebase-sa.json
          npx firebase-tools deploy --project "$FIREBASE_PROJECT" --only hosting,functions --token "$FIREBASE_TOKEN" || true
```

Notes: replace the `firebase-tools` deploy invocation with your preferred method. Use `--token` only if you store `FIREBASE_TOKEN` as a secret and prefer token-based auth. The snippet above is conceptual and intentionally conservative.


If anything here is unclear or you want more detail about a specific area (AI flows, deployment, or payment bridge), tell me which area and I will expand the file. 
