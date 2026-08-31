# Tangible Coding Studio: Mission Builder

Mission Builder is a teacher-facing WebMCP Challenge prototype for jointly designing one fictional P4 tangible coding lesson on a shared visual canvas. A compatible browser agent can propose structured changes and run deterministic validation, while the teacher reviews every content proposal. Final acceptance and lesson approval remain human-only.

The current interface groups the unchanged teacher journey into six compact website-style workspaces: **Setup**, **Mission**, **Adapt**, **Review**, **Validate** and **Preview**. Review still uses the existing inline proposal controls. Preview provides browser-derived Teacher Guide, Pupil Mission Card and Observation Checklist views using currently accepted content only, with native printing for the selected view. Navigation and preview-selection state are transient UI state only and do not alter lesson persistence or any WebMCP contract.

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

Teacher approval and prepared-file generation are not implemented in the current application. Preview is a browser presentation of accepted state, not a generated or approved teaching-material pack: `preparationImplemented` remains `false` and `preparedOutputs` remains `[]`. Manual Steps 1–7 remain available without WebMCP.

## Browser baseline and WebMCP enablement

The tested baseline is Chrome 149 or later. For the first public Chrome test:

1. Open `chrome://flags/#enable-webmcp-testing`.
2. Enable the WebMCP testing flag.
3. Relaunch Chrome when prompted.
4. Open the application and inspect DevTools → Application → WebMCP.
5. Restore the flag to its previous setting and relaunch Chrome after testing if it was changed.

An official origin-trial token may be used later only after genuine enrollment for the deployed public origin. No origin-trial token is included in this repository. Public-origin discovery and invocation were verified against the production deployment on 31 August 2026 using a real WebMCP-capable browser agent.

## Verified production runtime test

A real end-to-end WebMCP agent test was completed against the public
production deployment on 31 August 2026.

- All five registered WebMCP tools were discovered in canonical order.
- All five tools executed successfully.
- The first four tools created pending teacher-review proposals rather
  than directly changing accepted lesson content.
- Thirteen proposal operations were reviewed and individually accepted.
- Deterministic validation passed 13 of 13 checks with zero errors and
  zero warnings.
- Teacher Guide, Pupil Mission Card and Observation Checklist previews
  rendered accepted content only.
- Accepted lesson content, resources, provenance and validation survived
  a production-page reload.
- Readiness remained “Ready for teacher review”; no tool approved the
  lesson.
- preparationImplemented remained false and preparedOutputs remained [].

This verifies the demonstrated production golden path. It does not claim
that teacher approval, generated teaching-material files, authentication,
cloud storage or a commercial production service has been implemented.

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

Different browser applications and profiles have separate storage even on the same URL. Portable proposal packages provide a teacher-controlled ChatGPT-to-Chrome bridge for pending proposals. A complementary `Copy accepted context for ChatGPT` action copies only accepted fictional class, resource, mission and adaptation content for verified transient use by the four downstream tools. It never imports accepted state into ChatGPT, synchronizes drafts, transfers history/validation/approval, or bypasses teacher review.

Transient-context proposals use proposal package version 2 and bind the package to the copied accepted-context SHA-256 fingerprint. Existing version-1 proposal packages remain compatible. The fingerprint detects content changes but is not authentication or signing.

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

Ian Cameron's written company authorisation is retained privately by Bun Tang and must not be committed. The competition entry is being made by Tangible Coding Ltd as a United Kingdom organisation, with Bun Tang as its authorised representative. Final eligibility remains subject to the official competition rules and organiser verification.

## Licence scope

The MIT License applies to the software source code and demonstration
materials expressly included in this WebMCP Challenge repository.

“Tangible Coding”, “Tangible Coding Studio”, associated logos and other
Tangible Coding Ltd brand assets are not licensed for use as identifiers
of third-party products or services.

Commercial curriculum packs, teacher-training materials, hardware
designs, customer data, school implementation materials and other
Tangible Coding Ltd products are not included in this repository unless
expressly identified.

See [TRADEMARKS.md](TRADEMARKS.md) for the repository’s brand and
trademark-use boundary.
