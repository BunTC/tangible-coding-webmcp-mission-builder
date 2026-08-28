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

## D-013 — Resource station and grouping capacity

- Date: 2026-08-28
- Decision: Use a maximum group size of eight pupils; require three tile sets and one instruction-card pack for each basic station; require one robot and one activity mat in addition for each robot-active station; allow basic stations to operate without robots or mats only when tile-only groups are enabled; and exclude role cards from station capacity.
- Owner: Bun Tang
- Status: Confirmed
- Effect: Required groups are `ceil(pupils / 8)`. Base station capacity is limited by complete bundles of three tile sets and one instruction-card pack. Robot station capacity is further limited by robots and activity mats. Tile-only mode uses base capacity; robot-only mode uses robot station capacity. Rotation is required only when positive simultaneous capacity is below required groups, and a lesson is blocked when pupils require groups but simultaneous capacity is zero. This supersedes the earlier ambiguous `max(robotCount, activityMatCount)` grouping rule.

## D-014 — Manual learner-adaptation state

- Date: 2026-08-28
- Decision: Manual Step 5 uses separate support and extension instruction fields with 500-character limits and a persisted `noAdditionalAdaptation` boolean for an explicit teacher decline. It does not use a third 200-character note, rewrite Step 4 mission prose or populate `sectionsToUpdate`.
- Owner: Bun Tang
- Status: Confirmed
- Effect: Selecting no additional adaptation clears conflicting selections and instructions while leaving the controls available; entering instructions or selecting an adaptation clears the decline state. Manual adaptation completion requires non-empty support or extension instructions, or the explicit decline. `sectionsToUpdate` remains reserved for later WebMCP and change-control pending proposals.

## D-015 — Manual lesson validation semantics

- Date: 2026-08-28
- Decision: Manual Step 6 uses deterministic validation with explicit positive-integer durations for all four learning-cycle stages, whose sum must equal the lesson duration. Assessment validation is completeness-only. Existing support and extension instructions provide adaptation and beginner preparation guidance. Obvious personal-data detection is limited to ordinary email addresses, explicitly labelled phone numbers, clearly international `+number` forms and explicitly labelled pupil or student names. Warnings are acknowledged individually by stable rule ID.
- Owner: Bun Tang
- Status: Confirmed
- Effect: Errors and unacknowledged warnings prevent readiness. With no errors, all warnings acknowledged and no pending changes, manual validation may move a draft to `ready`, meaning ready for human teacher review only. Any Steps 1–5 edit returns a ready lesson to `draft` and clears stale validation results and acknowledgements. Validation never approves a lesson and leaves `preparedOutputs` empty. The narrow personal-data check is not comprehensive safeguarding detection, and assessment-to-success-criterion mapping is deferred beyond this prototype slice.

## D-016 — Transport-independent agent change control

- Date: 2026-08-28
- Decision: Implement transport-independent, section-by-section agent change control before WebMCP transport. Every proposal uses injected opaque change-set and operation IDs, an injected ISO timestamp, one of exactly five approved tool names, and operations targeting a closed named-section catalogue. Accepted teacher content remains separate from proposals until a human teacher accepts an operation.
- Owner: Bun Tang
- Status: Confirmed
- Effect:
  1. Every change set has an injected opaque `changeSetId`; every operation has an injected opaque `operationId`; and `createdAt` is injected as an ISO timestamp. IDs and timestamps remain transport-independent and deterministic in tests. Duplicate change-set or operation IDs are rejected atomically.
  2. Operation states are `pending`, `accepted`, `rejected` and `superseded`. Aggregate change-set status is derived, never maintained independently. Resolved operations cannot return to pending.
  3. Decisions are section-by-section. Each operation targets exactly one closed, named lesson section. Arbitrary JSON paths are prohibited.
  4. The closed section catalogue is `class-context`, `tangible-resources`, `lesson-identity`, `learning-intention`, `success-criteria`, `mission-story`, `plan`, `build-and-explain`, `test-and-debug`, `reflect-and-improve`, `assessment-evidence`, `learner-support` and `extension-challenge`. Grouping plans and validation results are derived state and cannot be proposed as lesson sections.
  5. The fixed tool authority is: `set_class_context` may propose `class-context`; `select_tangible_resources` may propose `tangible-resources`; `build_tangible_mission` may propose the named mission sections from `lesson-identity` through `assessment-evidence`; `adapt_for_learners` has the scope in item 6; and `validate_and_prepare_lesson` creates no accepted-content proposal. There are exactly five approved tool names and no sixth tool.
  6. `adapt_for_learners` may propose only `plan`, `build-and-explain`, `test-and-debug`, `reflect-and-improve`, `learner-support` and `extension-challenge`. It may not change `class-context`, `tangible-resources`, `lesson-identity`, `learning-intention`, `success-criteria`, `mission-story` or `assessment-evidence`.
  7. Only overlapping operations become superseded. Staleness is determined by structural comparison with the recorded `before` value. Teacher edits always take precedence, while unrelated pending operations remain reviewable.
  8. `Edit and accept` atomically accepts a teacher-edited `acceptedValue`. The original proposed value remains unchanged in history, and the final value is attributed as teacher modified.
  9. Accepted proposal history retains tool provenance. A later teacher edit changes visible section attribution to teacher-edited without deleting history. Attribution never affects validation, readiness or approval authority.
  10. `pendingChanges` contains unresolved change sets only. Fully resolved sets move atomically to `changeHistory`. Rejected and superseded proposals remain in history until bounded cleanup.
  11. Retain the newest 20 resolved change sets for the current draft and remove the oldest resolved set first. Never prune pending proposals. Clear proposal state when starting a new mission, resetting or loading the P4 demo, or replacing the mission. This is a bounded local prototype history, not a permanent audit archive.
  12. `validate_and_prepare_lesson` calls the same pure deterministic validator as Manual Step 6. Validation results update directly and never become proposals. Validation never accepts content and never approves a lesson.
  13. `preparedOutputs` remains empty during this slice. `Ready` means ready for human teacher review only. Output preparation is not implemented.
  14. Any valid pending proposal changes lesson status to `needs-review`, clears stale validation results and warning acknowledgements, and preserves currently accepted lesson content.
  15. When no pending operation remains, status becomes `draft`; validation must be rerun manually and `ready` is never restored automatically.
  16. Migration preserves valid existing Steps 1–6 lesson content, adds an empty `changeHistory` to legacy drafts and migrates legacy empty `pendingChanges`. Malformed legacy proposal data is discarded without discarding otherwise valid lesson content. Validation state is cleared if migration makes existing readiness evidence stale.
  17. Manual Step 7 testing uses production-valid schemas with a test-only fixture and documented localStorage seeding procedure. No production or development `simulate agent` control is added, and fixture helpers do not enter the production bundle.
  18. Accepting, rejecting or superseding proposals cannot set `approvedAt`, approve a lesson or mark it ready. Final approval remains a separate later human-only action.
  19. This slice implements transport-independent change control only. It adds no browser globals, feature detection, WebMCP API syntax, registration, descriptors or tool execution, and the UI continues to state that WebMCP is not connected.
  20. Earlier decisions, especially D-015, remain unchanged. The Formal Specification is updated only where required to make D-016 authoritative.

## New decision template

```markdown
## D-XXX — Title

- Date: YYYY-MM-DD
- Decision:
- Owner:
- Status: Open / Confirmed / Rejected / Superseded
- Effect:
```
