# AGENTS.md

## Project mission

Build and submit the smallest coherent WebMCP prototype that proves a primary teacher and an AI agent can jointly create, adapt, validate and review one tangible coding lesson on a shared visual canvas.

## Source hierarchy

Read before implementation:

1. `docs/SOURCE-OF-TRUTH.md`
2. `docs/FORMAL-SPECIFICATION.md`
3. `docs/TIMELINE-AND-ACTION-PLAN.md`
4. `docs/DECISION-LOG.md`

The Source of Truth overrides every other internal document. Official competition rules override all project files.

## Frozen product boundaries

- Product: Tangible Coding Studio
- Prototype: Mission Builder
- User: primary teacher
- Demonstration: one fictional P4 storytelling and debugging lesson
- Class: 24 fictional pupils, with no names or personal data
- Duration: 45 minutes
- Equipment: 3 robots, 9 tile sets, 3 activity mats, 3 instruction-card packs
- Final approval: human-only
- Outputs: Teacher Guide, Pupil Mission Card, Observation Checklist

## Approved WebMCP tools

Implement exactly these five tools unless the Source of Truth is formally updated:

1. `set_class_context`
2. `select_tangible_resources`
3. `build_tangible_mission`
4. `adapt_for_learners`
5. `validate_and_prepare_lesson`

Do not create an approval tool. WebMCP tools must update visible structured page state, not merely return prose.

## Engineering expectations

- Use Vite, React and TypeScript.
- Use Zod for shared runtime schemas and every WebMCP tool input.
- Use Vercel as the competition deployment provider.
- Keep domain logic separate from UI and WebMCP handlers.
- Validate every tool input at runtime.
- Treat agent changes as pending change sets.
- Preserve teacher edits over stale agent proposals.
- Use deterministic validation for feasibility and readiness.
- Use fictional sample data only.
- Do not require an independent model API for the golden path.
- Do not add a production database unless the Source of Truth changes.
- Do not add dependencies without explaining why they are necessary.
- Never commit secrets, credentials, school data or unlicensed assets.
- Ian Cameron gave written WhatsApp authorisation on 2026-08-28 for Tangible Coding Ltd to enter, Bun Tang to act as representative, Tangible Coding Ltd to own the Mission Builder prototype IP, and the authorised limited prototype code to be published under MIT. The evidence is retained privately by Bun Tang and must not be committed.

## Verification commands

Once the project is scaffolded, keep these scripts working:

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run test`

Run build, lint and relevant tests after implementation changes. Report any command not yet configured rather than pretending it passed.

## Git workflow

- Preserve dated commit evidence for challenge-period work.
- Make focused commits with descriptive messages.
- Do not rewrite public history after submission evidence is created.
- Use feature branches or Codex worktrees for risky changes.
- Review diffs before commit and before deployment.
- Keep README claims aligned with what the application actually does.

## Scope control

When a new idea appears:

1. Check `docs/SOURCE-OF-TRUTH.md`.
2. If it is excluded, record it under future roadmap and do not implement it.
3. If it changes competition scope, stop and request a decision.
4. Protect the golden path, WebMCP implementation, validation and human approval before decorative work.

## Definition of done

Work is complete only when:

- the requested behaviour is implemented;
- relevant tests pass;
- the public build succeeds;
- no scope or privacy boundary is violated;
- user-visible wording is accurate;
- documentation and evidence are updated;
- remaining blockers are explicit.

## Code review rules

- Flag any path that permits the agent to approve a lesson.
- Flag agent writes that bypass pending change sets.
- Flag resource allocations that ignore inventory.
- Flag unsafe rendering of agent-provided text.
- Flag real or personally identifying pupil data.
- Flag hidden API keys or secrets.
- Flag claims not supported by the working prototype.
- Flag new features outside the frozen scope.
