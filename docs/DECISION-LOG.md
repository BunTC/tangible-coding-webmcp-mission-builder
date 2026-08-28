# Decision Log

## Decision method

Each entry must include date, decision, owner, status and effect. A confirmed entry may change the Source of Truth. Do not silently implement an unresolved option.

## D-001 — Product identity

- Date: 2026-08-27
- Decision: Tangible Coding Studio: Mission Builder
- Owner: Bun Tang
- Status: Confirmed
- Effect: Use this name across repository and submission.

## D-002 — Prototype scope

- Date: 2026-08-27
- Decision: One teacher-facing P4 golden path with five WebMCP tools
- Owner: Bun Tang
- Status: Confirmed
- Effect: Wider Studio features are excluded.

## D-003 — Human approval

- Date: 2026-08-27
- Decision: No agent or WebMCP tool can approve a lesson
- Owner: Bun Tang
- Status: Confirmed
- Effect: Approval must be implemented as a human UI event.

## D-004 — Competition entrant

- Date: 2026-08-27
- Decision: Tangible Coding Ltd
- Owner: Bun Tang and Ian Cameron
- Status: Confirmed
- Effect: Use Tangible Coding Ltd as the entrant. Ian's written company authorisation was received on 2026-08-28.

## D-005 — Authorised representative

- Date: 2026-08-27
- Decision: Bun Tang
- Owner: Tangible Coding Ltd
- Status: Confirmed
- Effect: Bun Tang manages Devpost and the formal submission under the written company authorisation received on 2026-08-28.

## D-006 — Prototype IP ownership

- Date: 2026-08-27
- Decision: Tangible Coding Ltd owns new competition work
- Owner: Bun Tang and Ian Cameron
- Status: Confirmed
- Effect: Competition-period prototype IP belongs to Tangible Coding Ltd; wider curriculum, trademarks and third-party assets remain excluded from the public licence.

## D-007 — Open-source licence

- Date: 2026-08-27
- Decision: MIT for authorised prototype code only
- Owner: Tangible Coding Ltd
- Status: Confirmed
- Effect: Add a visible MIT licence to the public repository; it covers repository code only and does not license wider company IP.

## D-008 — Build tool

- Date: 2026-08-27
- Decision: Vite with React and TypeScript
- Owner: Build lead
- Status: Confirmed
- Effect: Scaffold and maintain the prototype with Vite, React and TypeScript.

## D-009 — Runtime schema library

- Date: 2026-08-27
- Decision: Zod
- Owner: Build lead
- Status: Confirmed
- Effect: Define shared Zod schemas and validate every WebMCP tool input at runtime.

## D-010 — Deployment provider

- Date: 2026-08-27
- Decision: Vercel
- Owner: Build lead
- Status: Confirmed
- Effect: Connect the GitHub repository to Vercel and use its public HTTPS production URL for judging.

## D-011 — Company-authorisation evidence

- Date: 2026-08-27
- Decision: Retain Ian Cameron's affirmative Email or WhatsApp reply
- Owner: Bun Tang
- Status: Confirmed
- Effect: The reply is the release gate for company entry, Bun's authority, company ownership of new prototype work and publication of limited prototype code under MIT. Store it privately; do not commit it to the public repository.

## D-012 — Company authorisation received

- Date: 2026-08-28
- Decision: Ian Cameron's written WhatsApp authorisation was received
- Owner: Bun Tang
- Status: Confirmed
- Effect: Tangible Coding Ltd may enter the WebMCP Challenge; Bun Tang is authorised to represent the company and submit the entry; the Mission Builder prototype IP remains owned by Tangible Coding Ltd; and the authorised limited prototype code may be published under MIT. The evidence is retained privately by Bun Tang. The company-authorisation release gate is satisfied. Entrant-jurisdiction eligibility remains a separate unresolved compliance check.

## New decision template

```markdown
## D-XXX — Title

- Date: YYYY-MM-DD
- Decision:
- Owner:
- Status: Open / Confirmed / Rejected / Superseded
- Effect:
```
