---
type: source-of-truth
title: Tangible Coding Studio WebMCP Challenge
version: 1.3
date: 2026-08-28
status: build-candidate
owner: Tangible Coding Ltd
---

# Tangible Coding Studio WebMCP Challenge — Source of Truth

## Canonical rule

This file contains the current approved facts for the competition project. Do not mix superseded Tangible Coding models or expand the prototype from older documents. A change to this file requires an explicit decision recorded in `DECISION-LOG.md`.

## Project identity

- Product: Tangible Coding Studio
- Prototype: Mission Builder
- Competition name: Tangible Coding Studio: Mission Builder
- Tagline: Design a teachable tangible coding mission with your AI partner.
- Company: Tangible Coding Ltd, company number SC883320
- Product role: teacher-facing backstage planning tool
- Competition deadline: 2026-09-03
- Post-submission review: 2026-09-04

## One-sentence definition

A teacher and an AI agent jointly create, adapt, validate and approve a tangible coding lesson on the same visual lesson canvas.

The agent assists with preparation and validation. The word `approve` in the product sentence describes the overall teacher–agent journey; the final approval action always belongs exclusively to the teacher.

## Problem

Primary teachers must combine curriculum intent, time, class size, physical equipment, learner differences, participation and assessment evidence. A conventional chatbot can generate prose but does not reliably share page state, modify only selected sections, respect inventory or provide controlled review.

## Solution

Mission Builder exposes structured WebMCP tools inside a visible lesson-design interface. The agent works on the same structured lesson canvas as the teacher. Every agent change is reviewable and deterministic validation checks whether the lesson is teachable.

## Primary user

- Scottish primary teacher
- Non-specialist or beginner computing confidence
- Prototype scenario uses P4 only
- Wider Tangible Coding market remains Scottish primary P1–P7 according to school need, but that wider range is not the competition build

## Golden-path scenario

- 24 fictional P4 pupils
- 45-minute literacy and storytelling lesson
- Computational-thinking focus: debugging
- 3 robots
- 9 tile sets
- 3 activity mats
- 3 instruction-card packs
- Support: reduced reading load and visual instructions
- Extension: loop challenge
- Sample mission: The Lost Story Path

## Golden-path prompt

Create a 45-minute P4 storytelling mission for 24 pupils. We have three robots, nine tile sets, three activity mats and three instruction-card packs. Focus on debugging. Use reduced reading and visual instructions, then add a loop challenge for confident learners. Validate the lesson and prepare it for my review.

## Resource station and grouping rule

- Maximum group size is 8 pupils.
- Each basic group station requires 3 tile sets and 1 instruction-card pack.
- A robot-active station additionally requires 1 robot and 1 activity mat.
- When tile-only groups are enabled, a basic station may operate without a robot or activity mat.
- When tile-only groups are disabled, every simultaneous station requires both 1 robot and 1 activity mat.
- Role cards support pupil roles but do not determine station capacity.

```text
requiredGroups = pupils <= 0 ? 0 : ceil(pupils / 8)
baseStationCapacity = min(floor(tileSets / 3), instructionCardPacks)
robotStationCapacity = min(robotCount, activityMatCount, baseStationCapacity)
simultaneousCapacity = tileOnlyEnabled ? baseStationCapacity : robotStationCapacity
rotationRequired = simultaneousCapacity > 0 and requiredGroups > simultaneousCapacity
blocking = requiredGroups > 0 and simultaneousCapacity = 0
```

This rule supersedes the earlier ambiguous `max(robotCount, activityMatCount)` grouping rule.

## Nine-step journey

1. Start
2. Define class context
3. Define tangible resources
4. Build the mission
5. Adapt for learners
6. Validate the lesson
7. Review agent changes
8. Teacher approval
9. Preview and print

The compact application shell presents this unchanged teacher journey through six website-style workspaces in order: Setup, Mission, Adapt, Review, Validate and Preview. This is a presentation and navigation grouping only. Review retains the existing inline Section 7 controls. Preview renders one browser-derived Teacher Guide, Pupil Mission Card or Observation Checklist at a time from currently accepted content only; pending and rejected proposal values are excluded.

## Tangible Learning Cycle

Every mission must include:

1. Plan
2. Build & Explain
3. Test & Debug
4. Reflect & Improve

## Approved WebMCP tools

1. `set_class_context`
2. `select_tangible_resources`
3. `build_tangible_mission`
4. `adapt_for_learners`
5. `validate_and_prepare_lesson`

No sixth tool is approved. No tool may set approval state.

## Change-control rule

- Agent calls create pending proposals.
- Proposed changes are visually identified.
- Teacher may accept, edit or reject.
- Teacher edits supersede stale agent proposals.
- Approval requires zero unresolved change sets.
- Editing an approved lesson returns it to Needs Review.

## Validation boundary

The prototype validates:

- completeness;
- lesson duration;
- equipment availability;
- participation and grouping;
- all four Tangible Learning Cycle stages;
- observable success criteria;
- assessment evidence;
- selected learner adaptations;
- obvious personal-data risks.

## Outputs

- Teacher Guide
- Pupil Mission Card
- Observation Checklist

Browser print views are sufficient. A production PDF service is not required.

The implemented Preview uses native printing for the selected accepted-content view only. It does not generate or persist teaching materials: `preparationImplemented` remains `false`, `preparedOutputs` remains `[]`, and readiness never implies approval.

## Technology decisions

- TypeScript
- React
- Vite build setup
- Zod runtime schema validation
- Vercel public deployment
- Browser local storage for one fictional draft
- Teacher-controlled copy/paste handoff: pending proposal packages travel from ChatGPT to the teacher browser, while strict accepted-context packages travel from the teacher browser to downstream WebMCP invocations for transient use only
- WebMCP imperative API
- Native browser print CSS
- No production database
- No independent AI model API required for the golden path

## Privacy and IP

- No real pupil or school data.
- No pupil accounts.
- No SEND diagnoses or attainment records.
- Accepted-context packages contain only the fictional accepted class context, resources, mission and learner adaptations. They exclude proposal state, history, validation, outputs and approval, and never synchronize or import accepted state into another browser.
- No supplier-owned code or images without permission.
- No full commercial curriculum pack in the public repository.
- Open-source licence applies only to authorised repository contents.
- Tangible Coding Ltd trademarks and wider commercial IP remain outside the code licence unless expressly stated.

## Explicitly not now

- Pupil-facing app
- School dashboard
- Production authentication
- Subscription and payment
- Complete P1–P7 content library
- Full CfE database
- Pupil progress history
- Advanced analytics
- Hardware connectivity
- Deep school-platform integrations
- Multi-school sharing
- Autonomous approval

## Entry and ownership position

- Entrant: Tangible Coding Ltd
- Representative: Bun Tang
- Ian Cameron: curriculum and teacher-practice reviewer
- New competition prototype work: owned by Tangible Coding Ltd
- Public prototype code licence: MIT
- Company-authorisation evidence: Ian Cameron's affirmative WhatsApp reply dated 2026-08-28, retained privately by Bun Tang

Ian Cameron's written authorisation was received by WhatsApp on 2026-08-28. It confirms that Tangible Coding Ltd may enter the WebMCP Challenge, Bun Tang is authorised to represent the company and submit the entry, the Mission Builder prototype IP belongs to Tangible Coding Ltd, and the authorised limited prototype code may be published under MIT. The evidence is retained privately by Bun Tang and must not be copied into the repository. Company authorisation is no longer a publication or submission blocker. Entrant-jurisdiction eligibility remains a separate unresolved compliance check.

## Submission requirements

- Public live URL
- Public source repository
- Visible open-source licence
- English project description
- Testing instructions
- Public English video under three minutes
- Accurate explanation of prior concept versus challenge-period work
- Tested WebMCP tools in an accepted client
- All team invitations accepted
- Entry submitted before 2026-09-03

## Success test

The project succeeds when the golden-path prompt drives the five tools, the visible lesson becomes resource-aware and complete, validation works, every agent change is reviewable, the agent cannot approve, and the teacher can approve and print the three outputs.
