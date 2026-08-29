# Tangible Coding Studio: Mission Builder

Mission Builder is a teacher-facing WebMCP Challenge prototype for jointly designing one fictional P4 tangible coding lesson on a shared visual canvas. A compatible browser agent can propose structured changes and run deterministic validation, while the teacher reviews every content proposal. Final acceptance and lesson approval remain human-only.

## Current implementation

The application provides Manual Steps 1–7 for class context, tangible resources and grouping, mission building, learner adaptation, deterministic validation and section-level change review. The manual workflow remains available when WebMCP is unsupported, inaccessible or unable to register.

When WebMCP is supported, registration is guarded and all-or-none: the application registers exactly these five tools in canonical order, or registers none:

1. `set_class_context`
2. `select_tangible_resources`
3. `build_tangible_mission`
4. `adapt_for_learners`
5. `validate_and_prepare_lesson`

The first four tools create pending, section-scoped teacher-review proposals. Tool calls do not directly mutate accepted lesson content, and proposals are never accepted automatically. The teacher may accept, edit-and-accept or reject each applicable operation through the visible change-review interface.

Successful calls to those four tools also return a strictly versioned `proposalPackage`. This JSON object contains only the untrusted pending proposal and structural `before` values needed for freshness checking. A teacher can copy it from an isolated agent browser and paste it into **Import agent proposal** in Step 7 in their normal browser. Import validates the package and creates a pending proposal only; it never imports an authoritative lesson, accepts content or grants approval.

`validate_and_prepare_lesson` calls the same deterministic validator used by Manual Step 6 and creates no proposal. It supports `validate` and `validate-and-prepare` modes. Actual output preparation is intentionally not implemented: `preparationImplemented` is `false` and `preparedOutputs` is always `[]`. Validation can mark a lesson ready for human teacher review, but no WebMCP tool can approve it.

Teacher approval, output generation, printing and deployment are not implemented in the current application. Manual Steps 1–7 remain available without WebMCP.

## Browser baseline and WebMCP enablement

The tested baseline is Chrome 149 or later. For the first public Chrome test:

1. Open `chrome://flags/#enable-webmcp-testing`.
2. Enable the WebMCP testing flag.
3. Relaunch Chrome when prompted.
4. Open the application and inspect DevTools → Application → WebMCP.
5. Restore the flag to its previous setting and relaunch Chrome after testing if it was changed.

An official origin-trial token may be used later only after genuine enrollment for the deployed public origin. No origin-trial token is included in this repository. Public-origin discovery and invocation through ChatGPT's desktop in-app browser remain required before competition submission and have not yet been recorded as passed.

## Local development

Requirements:

- Node.js 22 or a compatible current LTS release;
- npm.

Install and run locally:

```sh
npm install
npm run dev
```

Run verification and create the production build:

```sh
npm run test
npm run lint
npm run build
```

The production build is written to `dist/`. It can be inspected locally with:

```sh
npm run preview
```

## Vercel deployment settings

The intended first public deployment uses the current GitHub `main` branch with:

- Framework Preset: `Vite`;
- Root Directory: repository root;
- Build Command: `npm run build`;
- Output Directory: `dist`;
- environment variables: none;
- backend or production database: none;
- custom domain: not required.

The current application has one root route, so no Vercel rewrite is required. Deployment must be separately reviewed and authorised; this repository does not contain Vercel project linkage or credentials.

## Local persistence

The fictional lesson draft is stored in browser `localStorage`, which is scoped to the exact origin:

- localhost data does not migrate to Vercel;
- Vercel preview and production URLs maintain separate stored drafts;
- changing the hostname, scheme or port starts separate origin-local state;
- there is no server synchronization or account-based recovery.

Different browser applications and profiles have separate storage even on the same URL. Portable proposal packages provide an explicit teacher-controlled copy/paste bridge for pending proposals only. They do not synchronize drafts or move accepted lesson content.

## Privacy and security boundaries

- Use fictional sample information only. Do not enter pupil names, school details, diagnoses, attainment records or personal data.
- No credentials, model API key, environment variable, backend, database, agent network call or independent model API is required.
- WebMCP registration uses the default same-origin or built-in-browser-agent boundary and omits `exposedTo`.
- No tool automatically accepts or approves lesson content.
- No tool generates prepared outputs, prints, deploys or publishes anything.
- Personal-data validation is a narrow obvious-pattern check, not comprehensive safeguarding detection.

## Prototype and licence boundary

Tangible Coding Studio, its wider curriculum direction, trademarks, teaching methods and commercial materials predate this challenge. This repository contains only the limited fictional Mission Builder prototype content needed for the competition demonstration.

Authorised prototype code in this repository is provided under the [MIT License](LICENSE). The licence does not grant rights to Tangible Coding Ltd trademarks, wider commercial curriculum, proprietary lesson packs, supplier-owned materials or other excluded company intellectual property.

Ian Cameron's written company authorisation is retained privately by Bun Tang and must not be committed. Entrant-jurisdiction eligibility remains a separate unresolved compliance check.
