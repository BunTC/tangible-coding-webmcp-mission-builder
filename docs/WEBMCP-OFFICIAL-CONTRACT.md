# WebMCP official contract

## Evidence pin

- Access date for every source below: 2026-08-29.
- Pinned specification revision: `41d12f057167ccf5954dbcf49d99502cb6c84491`.
- Normative source used by this repository: [WebMCP specification source at the pinned revision](https://github.com/webmachinelearning/webmcp/blob/41d12f057167ccf5954dbcf49d99502cb6c84491/index.bs).
- Repository: [Web Machine Learning Community Group WebMCP repository](https://github.com/webmachinelearning/webmcp).
- Licence: the pinned specification repository uses the [W3C Software and Document License](https://github.com/webmachinelearning/webmcp/blob/41d12f057167ccf5954dbcf49d99502cb6c84491/LICENSE.md). This document summarises the application-relevant contract and does not reproduce the specification.

The pinned normative specification governs the transport implementation. Official Chrome material is implementation and testing guidance. OpenAI and Devpost pages govern competition participation and submission. Examples and recommendations are not promoted to normative browser behaviour.

## Authoritative source register

| Source | Date shown | Classification | Application-relevant material |
| --- | --- | --- | --- |
| [WebMCP specification source](https://github.com/webmachinelearning/webmcp/blob/41d12f057167ccf5954dbcf49d99502cb6c84491/index.bs), “WebMCP” | Pinned by commit; no page publication date | Normative specification | Web IDL, registration, descriptors, execution, cancellation, exposure and security model |
| [WebMCP repository](https://github.com/webmachinelearning/webmcp), “WebMCP” | Commit history | Official specification repository; README is explanatory | Revision history, open work and licence location |
| [WebMCP overview](https://developer.chrome.com/docs/ai/webmcp), “WebMCP” | Published 2026-05-18; updated 2026-08-07 | Official Chrome implementation guidance | Availability, imperative and declarative overview, origin-trial path |
| [Imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api), “WebMCP imperative API” | Published 2026-05-18; updated 2026-08-20 | Official Chrome implementation guidance and non-normative examples | Feature detection, registration examples, descriptors, outputs, cancellation and TypeScript guidance |
| [Secure tools](https://developer.chrome.com/docs/ai/webmcp/secure-tools), “Build secure WebMCP tools” | Published 2026-06-09; updated 2026-07-01 | Official Chrome security guidance | Runtime validation, least authority, confirmation and safe error handling |
| [Best practices](https://developer.chrome.com/docs/ai/webmcp/best-practices), “WebMCP best practices” | Published and updated 2026-05-18 | Official Chrome guidance | Naming and character-budget recommendations |
| [WebMCP evaluation](https://developer.chrome.com/docs/ai/webmcp/evals), “Evaluate WebMCP tools” | Published 2026-05-19; page metadata reports updated 2026-05-28 | Official Chrome testing guidance | Agent-based evaluation workflow |
| [Chrome DevTools WebMCP](https://developer.chrome.com/docs/devtools/application/webmcp), “Debug WebMCP tools” | Updated 2026-05-12 | Official Chrome debugging guidance | Registered-tool inspection in DevTools |
| [WebMCP origin trial](https://developer.chrome.com/blog/ai-webmcp-origin-trial), “WebMCP is available for early preview” | Published and updated 2026-06-09 | Official Chrome origin-trial guidance | Trial enrolment and supported testing path |
| [`webmcp-types@0.1.5`](https://www.npmjs.com/package/webmcp-types/v/0.1.5), “webmcp-types” | Published 2026-08-20 | Package metadata for the type package recommended by official Chrome guidance | Version, declaration surface and MIT licence |
| [OpenAI WebMCP Challenge](https://openai.com/webmcp-challenge/), “WebMCP Challenge” | No publication date shown | Official competition overview | Challenge purpose, judging context and ChatGPT in-app-browser testing direction |
| [Devpost resources](https://webmcp.devpost.com/resources), “WebMCP Challenge: Resources” | No publication date shown | Official competition guidance and optional resources | Submission resources and deadline display |
| [Devpost rules](https://webmcp.devpost.com/rules), “WebMCP Challenge: Official Rules” | No publication date shown | Mandatory competition rules | Eligibility, deadlines, public project and submission requirements |
| [OpenAI supported countries and territories](https://developers.openai.com/api/docs/supported-countries), “Supported countries and territories” | No publication date shown | Official OpenAI eligibility reference | Supported-country list used with the challenge rules |

## Application-relevant browser contract

### Availability and registration

- Feature detection uses `"modelContext" in document`; the normative surface is `document.modelContext` on `Document` in a secure context. See the pinned specification's `Document` partial interface and the Chrome [imperative API feature-detection guidance](https://developer.chrome.com/docs/ai/webmcp/imperative-api).
- `registerTool(tool, options = {})` returns `Promise<undefined>` in the pinned Web IDL. The application must await registration and surface registration failures honestly.
- A tool descriptor requires `name`, `description` and `execute`. `title`, `inputSchema` and `annotations` are optional in the browser contract, though this application supplies schemas and annotations for all five tools.
- Tool names are 1–128 ASCII alphanumeric, underscore, hyphen or period characters in the pinned specification. The five approved repository names satisfy that restriction.
- Registering a duplicate name raises `InvalidStateError` under the pinned registration algorithm. The application therefore owns one registration lifecycle and must not rely on duplicate registration as replacement.
- Registration receives an optional `AbortSignal`. Aborting it unregisters the tool. A React integration must use one `AbortController` per mounted registration lifecycle and abort it during cleanup, including Strict Mode's development mount-cleanup-remount cycle.

### Inputs and execution

- `inputSchema` uses JSON Schema draft 2020-12 according to the pinned specification. Browser schema screening does not replace the application's existing Zod runtime validation and authority checks.
- The execution callback receives the parsed input object and an invocation context containing `signal`. It may return a JSON-serialisable value or a promise resolving to one.
- Expected validation, authority, prerequisite, stale-state and precondition failures resolve as safe structured results. Unexpected faults may reject or throw; their public handling must not expose stack traces, paths or sensitive state.
- The invocation `AbortSignal` is the supported cancellation signal for active work. Handlers must check it before committing local state. The pinned material does not define a portable tool-call identity, so this application does not invent one.
- Tools may be invoked concurrently. Repository handlers must preserve the existing atomic proposal and stale-state invariants and must not assume serial invocation or exactly-once delivery.

### Exposure and security

- This application omits `exposedTo`, retaining the default same-origin or built-in-browser-agent exposure boundary from the pinned specification. Cross-origin iframe agents are unsupported in this slice.
- The `tools` Permissions Policy defaults to `self` in the pinned specification. No cross-origin delegation is added.
- WebMCP is a secure-context API. Competition deployment must use HTTPS. The pinned origin-isolation requirements also mean the implementation must not disable origin-keyed agent clustering through incompatible `document.domain` behaviour.
- Content Security Policy remains the application's defence for its own resource loading, but the cited sources do not define a WebMCP-specific CSP directive. No such directive is invented here.
- Every transport input remains untrusted and is validated at runtime. Tool handlers receive only the authority assigned by the fixed tool-to-section allowlists and never receive approval authority.

### Descriptors, annotations and result budgets

- All five descriptors use `readOnlyHint: false`, because each may update local application state, including validation state.
- The four proposal-producing tools use `untrustedContentHint: true`. `validate_and_prepare_lesson` uses `untrustedContentHint: false` because its results come from the deterministic local validator.
- Chrome's [best-practices guidance](https://developer.chrome.com/docs/ai/webmcp/best-practices) recommends concise names, parameter descriptions and results, including approximate budgets of 30 characters for names and parameter names, 500 for descriptions, 150 for parameter descriptions and 1,500 for output. These are design guidance, not normative serialization limits.
- The authoritative sources inspected do not specify a general maximum serialized payload size. Application schemas impose their existing bounded strings and arrays; no browser limit is guessed.

## Repository transport boundary

When supported, the application will register exactly:

1. `set_class_context`;
2. `select_tangible_resources`;
3. `build_tangible_mission`;
4. `adapt_for_learners`;
5. `validate_and_prepare_lesson`.

The first four create reviewable pending change sets through the transport-independent Step 7 domain. They do not mutate accepted lesson content. `validate_and_prepare_lesson` calls the same pure validator as Manual Step 6 and updates validation state directly; it creates no content proposal, accepts no content, prepares no output and grants no approval. All handler prerequisite failures use structured expected-error results, while all five names remain registered regardless of current lesson state.

Unsupported browsers retain every manual workflow and display an honest unavailable state. A registration error is distinct from unsupported availability and must also be shown honestly. No tool can set `approvedAt`; `ready` continues to mean ready for human teacher review only; `preparedOutputs` remains empty.

## Type strategy and package comparison

The application will use minimal local ambient declarations for only `document.modelContext`, `registerTool`, the descriptor fields, registration options, execution context and annotation fields it consumes. Those declarations are pinned to specification commit `41d12f057167ccf5954dbcf49d99502cb6c84491`.

Chrome's [imperative API guidance](https://developer.chrome.com/docs/ai/webmcp/imperative-api) identifies `webmcp-types`; the inspected [`webmcp-types@0.1.5`](https://www.npmjs.com/package/webmcp-types/v/0.1.5) release is optional, not required by the browser. It uses the MIT licence. It does not exactly match the [pinned draft](https://github.com/webmachinelearning/webmcp/blob/41d12f057167ccf5954dbcf49d99502cb6c84491/index.bs): it omits that draft's `executeTool` surface and models an execution return as synchronous-or-promise where the pinned Web IDL callback is promise-returning. Because this application does not consume discovery or `executeTool`, adding that package would widen and blur the pinned surface. D-018 therefore selects local declarations and no dependency change.

## Official testing and competition evidence

- Browser baseline: Chrome 149 or later with `chrome://flags/#enable-webmcp-testing`, or an enrolled origin trial, following the Chrome [imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api) and [origin-trial announcement](https://developer.chrome.com/blog/ai-webmcp-origin-trial). Later lifecycle improvements, including behaviour reported for Chrome 153, are enhancements rather than the minimum contract.
- Agent baseline: test discovery and invocation through ChatGPT's desktop in-app browser as directed by the [OpenAI challenge page](https://openai.com/webmcp-challenge/).
- Debugging: inspect registered tools using the official [Chrome DevTools WebMCP panel](https://developer.chrome.com/docs/devtools/application/webmcp). The inspected authoritative material does not establish a Lighthouse registered-tools audit, so none is required by this contract.
- Capture dated evidence of the feature state, all five registered descriptors, successful and structured-error invocations, visible pending proposals, human review boundaries, unsupported-browser behaviour and the golden path. Evidence must contain only fictional data and no credentials.
- The [Devpost rules](https://webmcp.devpost.com/rules) set the submission deadline at 2026-09-03 1:00 PM Pacific Time and govern entrant eligibility. They require a public, live, judge-accessible application and a public source repository with licence and setup information, an English project description and the prescribed submission materials. The official competition pages require a public YouTube demonstration video with audio under three minutes. Existing projects must show a meaningful WebMCP extension supported by dated challenge-period evidence. Judging considers WebMCP leverage and execution, impact and creativity. The [Devpost resources](https://webmcp.devpost.com/resources) are guidance and optional sponsor resources unless incorporated by the rules.

## Unresolved external areas

The [pinned specification source](https://github.com/webmachinelearning/webmcp/blob/41d12f057167ccf5954dbcf49d99502cb6c84491/index.bs) and its linked issue markers leave evolving or unresolved work around registration return semantics, unregistering during active invocation, more granular browser error contracts, discovery and `executeTool`, portable invocation identity, consequential-action annotation, declarative tools and consent or agent identity. The repository must not turn these areas into requirements or browser behaviour. Bounded implementation uses only the pinned registration surface and conservative application-level safeguards described above.

If later official browser behaviour conflicts with this pin, implementation pauses for a documented decision rather than silently changing the contract.
