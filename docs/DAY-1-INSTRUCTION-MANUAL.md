---
type: instruction-manual
title: Tangible Coding WebMCP Day 1
date: 2026-08-27
status: active
project: Tangible Coding Studio Mission Builder
source_plan: Tangible-Coding-WebMCP-Challenge-Action-Plan.md
---

# Tangible Coding Studio WebMCP Prototype

## 2026-08-27 Instruction Manual and Checklist

## Purpose of today

Today is the **scope-freeze and ownership day**. The objective is not to start building screens or writing the five WebMCP tools. The objective is to remove the decisions that could stop or redirect development later.

By the end of 2026-08-27, the team must know:

- who is entering the competition;
- who is authorised to represent the entry;
- what Tangible Coding Ltd is permitting the team to open-source;
- exactly what the prototype does;
- exactly what the prototype does not do;
- which user journey will be demonstrated;
- which five WebMCP tools will be built;
- where the public code repository is located;
- which tasks are critical for submission.

## Expected time

Allow approximately three focused hours:

- Decision and ownership review: 30–45 minutes
- Product and demonstration freeze: 45 minutes
- IP and open-source boundary: 30–45 minutes
- Repository and documents: 45–60 minutes
- Final checkpoint: 20 minutes

If Ian is not available for a live discussion, send him the approval message in Step 2 and retain his written response. Do not assume company approval for public release merely because the broader Tangible Coding Studio concept has already been discussed.

## Required inputs

Have these available before beginning:

- Tangible Coding Studio WebMCP Prototype Formal Specification v1.0
- Tangible Coding WebMCP Challenge Action Plan
- Tangible Coding Ltd company details
- Current understanding of the 50/50 company ownership
- Access to the GitHub account or organisation that will own the repository
- Access to the Devpost competition page
- A way to retain Ian's written approval

## End-of-day deliverables

- [ ] One signed-off Entry and IP Decision Record
- [ ] One frozen prototype definition
- [ ] One frozen golden-path demonstration
- [ ] One frozen list of five WebMCP tools
- [ ] One frozen nine-step teacher journey
- [ ] One explicit out-of-scope list
- [ ] One public GitHub repository
- [ ] One initial commit dated 2026-08-27
- [ ] README containing the prior-work distinction
- [ ] Open-source licence covering prototype code only
- [ ] IP and sample-content notice
- [ ] Critical and optional GitHub issues
- [ ] Completed go/no-go checkpoint

## Step 1 — Create today's decision record

### Action

Create a working note named:

```text
docs/ENTRY-AND-IP-DECISIONS.md
```

Copy this decision block into it:

```markdown
# Entry and IP Decisions

Date: 2026-08-27

## D1 — Competition entrant

Decision: Tangible Coding Ltd.

## D2 — Authorised representative

Decision: Bun Tang.

## D3 — Prototype owner

Decision: New competition prototype work is owned by Tangible Coding Ltd. Ian's written authorisation must be retained before public release or submission.

## D4 — Material permitted in the public repository

Decision: Prototype source code and fictional sample content specifically included in the competition repository.

## D5 — Material prohibited from the public repository

Decision: Wider curriculum, commercial lesson packs, trademarks, confidential company material, real school or pupil data, and supplier- or third-party-owned assets.

## D6 — Open-source licence

Decision: MIT, covering authorised repository code only.

## D7 — Prototype scope

Decision: Tangible Coding Studio — Mission Builder, as defined in Formal Specification v1.0.

## D8 — Final approval authority

Decision: Final lesson approval is a human-only teacher action. No WebMCP tool can approve a lesson.

## Confirmation

Bun Tang:
Ian Cameron:
Confirmation method: Ian's affirmative Email or WhatsApp reply, saved privately with its date.
```

### Checklist

- [ ] The decision record uses the date 2026-08-27.
- [ ] D1 to D8 are present.
- [ ] Unconfirmed decisions remain visibly unconfirmed.
- [ ] No public-release permission is inferred from silence.

### Completion test

The team has one document in which every company, ownership and open-source decision will be recorded.

## Step 2 — Confirm the competition entrant and representative

### Recommended decision

Subject to Tangible Coding Ltd's internal agreement and the official entry form, use:

- **Entrant:** Tangible Coding Ltd
- **Representative:** Bun Tang
- **Team contribution:** Bun leads product, operations and prototype build; Ian provides curriculum and teacher-practice review.

This keeps the project aligned with the confirmed Tangible Coding company and avoids creating uncertainty over whether the competition prototype belongs personally to Bun or Ian.

If the team cannot authorise a company entry today, pause the decision and verify the official rules before selecting an individual entry. Do not silently change the ownership of the prototype to solve an administrative delay.

### Information to record

- Legal entrant name
- Country of organisation or residence
- Representative's full name
- Representative's email
- Team members
- Authority for the representative to act
- Confirmation that the entrant is eligible

### Short approval message to Ian

```text
Hi Ian,

I am preparing a narrow Tangible Coding Studio prototype for the OpenAI WebMCP Challenge. The proposed entry is “Tangible Coding Studio — Mission Builder”: a teacher-facing demonstration in which a teacher and an AI agent create, adapt and validate one P4 tangible coding lesson.

The public repository would contain only the competition prototype code, generic interface assets and limited fictional sample content. It would not contain our full curriculum, commercial lesson packs, school data, pricing, supplier-owned code or proprietary RoBico assets.

My recommended arrangement is for Tangible Coding Ltd to own the new prototype work and enter the competition, with me acting as the authorised representative and you reviewing the curriculum and teacher-practice elements.

Please confirm whether you agree with:
1. Tangible Coding Ltd owning and entering the prototype;
2. Bun acting as the competition representative;
3. releasing only the limited prototype code and fictional sample content under an approved open-source licence;
4. keeping the wider curriculum and commercial IP outside the public repository.

Thank you,
Bun
```

### Checklist

- [ ] The proposed entrant has been identified.
- [ ] The representative has been identified.
- [ ] Ian has received or approved the decision in writing.
- [ ] The representative's authority is recorded.
- [ ] The entry is not being submitted using a Hong Kong-resident identity.
- [ ] D1 and D2 in the decision record are complete or visibly awaiting confirmation.

### Stop condition

Do not publish proprietary company content if company approval is missing. A repository shell containing only generic documents may be created, but curriculum or branded assets must not be added.

## Step 3 — Freeze the product identity

### Record the following without rewriting it

**Product:** Tangible Coding Studio  
**Prototype:** Mission Builder  
**Competition title:** Tangible Coding Studio — Mission Builder  
**Tagline:** Design a teachable tangible coding mission with your AI partner.

**One-sentence definition:**

> A teacher and an AI agent jointly create, adapt, validate and approve a tangible coding lesson on the same visual lesson canvas.

**Prototype role:**

> A teacher-facing backstage planning tool, not pupil-facing software and not the complete commercial Tangible Coding Studio.

### Action

Create:

```text
docs/SCOPE.md
```

Add the product, prototype, tagline, one-sentence definition and prototype role exactly as above.

### Checklist

- [ ] The name is `Tangible Coding Studio — Mission Builder`.
- [ ] The product is described as teacher-facing.
- [ ] The agent works on a shared visual lesson canvas.
- [ ] The prototype is not described as a pupil product.
- [ ] The prototype is not described as the complete Studio.
- [ ] The title and definition are identical in the decision record, scope file and README.

### Completion test

Every team member can explain the prototype using the same sentence.

## Step 4 — Freeze the golden-path demonstration

### Approved fictional teacher scenario

- Stage: P4
- Class size: 24
- Duration: 45 minutes
- Subject context: Literacy and storytelling
- Computational-thinking focus: Debugging
- Teacher confidence: Beginner
- Resources: Three robots, nine tile sets, three activity mats and three instruction-card packs
- Learner support: Reduced reading load and visual instructions
- Extension: Loop challenge for confident learners
- Mission sample: The Lost Story Path

### Approved demonstration prompt

```text
Create a 45-minute P4 storytelling mission for 24 pupils. We have three robots, nine tile sets, three activity mats and three instruction-card packs. Focus on debugging. Use reduced reading and visual instructions, then add a loop challenge for confident learners. Validate the lesson and prepare it for my review.
```

### Expected result

The prototype prepares:

- Learning intention
- Two to four observable success criteria
- Story mission
- Group and equipment plan
- Plan
- Build and Explain
- Test and Debug
- Reflect and Improve
- Learner support
- Extension challenge
- Assessment evidence
- Teacher Guide
- Pupil Mission Card
- Observation Checklist

### Action

Add this scenario, prompt and expected result to `docs/SCOPE.md` under `Golden path`.

### Checklist

- [ ] Only fictional information is used.
- [ ] The scenario uses P4 and 24 pupils.
- [ ] The lesson duration is 45 minutes.
- [ ] The equipment matches the agreed demonstration inventory.
- [ ] The focus is debugging through storytelling.
- [ ] Support and extension are included.
- [ ] The final action is preparation for teacher review, not autonomous approval.

### Completion test

The same prompt can be used later in development testing, the README, judge instructions and the demonstration video.

## Step 5 — Freeze the nine-step user journey

### Approved sequence

1. Start
2. Define class context
3. Define tangible resources
4. Build the mission
5. Adapt for learners
6. Validate the lesson
7. Review agent changes
8. Teacher approval
9. Preview and print

### For each step, record the completion condition

```markdown
1. Start — A valid local lesson draft exists.
2. Class — Required class fields are valid.
3. Resources — A feasible grouping or visible warning exists.
4. Mission — Every required lesson card contains draft content.
5. Adapt — Support or extension is recorded or explicitly declined.
6. Validate — No blocking errors remain.
7. Review — No agent proposal remains undecided.
8. Approve — The teacher completes the human-only approval action.
9. Output — The three approved output views are available to print.
```

### Action

Add the sequence and completion conditions to `docs/SCOPE.md`.

### Checklist

- [ ] All nine steps are present.
- [ ] Review occurs before approval.
- [ ] Validation occurs before approval.
- [ ] Approval is human-only.
- [ ] Output follows approval.
- [ ] No payment, account or pupil-assessment step has been inserted.

### Completion test

The journey can be drawn as one uninterrupted flow without adding a missing product function.

## Step 6 — Freeze the five WebMCP tools

### Approved tool list

#### 1. `set_class_context`

Defines stage, class size, duration, focus, subject context and teacher confidence.

#### 2. `select_tangible_resources`

Defines equipment and calculates grouping or rotation constraints.

#### 3. `build_tangible_mission`

Creates structured lesson sections on the visible lesson canvas.

#### 4. `adapt_for_learners`

Modifies only relevant sections for learner support and extension.

#### 5. `validate_and_prepare_lesson`

Runs deterministic checks and prepares three output views without approving the lesson.

### Expected golden-path order

```text
set_class_context
→ select_tangible_resources
→ build_tangible_mission
→ adapt_for_learners
→ validate_and_prepare_lesson
→ teacher reviews and approves through the UI
```

### Non-negotiable rules

- Every tool updates structured page state.
- A tool must not merely return a prose answer.
- Agent changes become pending proposals.
- Teacher-entered values take priority over stale proposals.
- No tool may set lesson status to Approved.

### Action

Add the tool list, order and rules to `docs/SCOPE.md`.

### Checklist

- [ ] Exactly five tools are listed.
- [ ] Tool names match the formal specification.
- [ ] The role of each tool is limited and distinct.
- [ ] Every tool affects visible structured state.
- [ ] No sixth convenience tool has been added.
- [ ] No approval tool exists.

### Completion test

The developer can explain why each tool exists and why ordinary UI clicking is not sufficient.

## Step 7 — Freeze the out-of-scope boundary

### Add this list to `docs/SCOPE.md`

- Pupil accounts
- Real pupil, SEND or attainment data
- School administration dashboard
- Production authentication and permissions
- Subscription and payment
- Complete P1–P7 curriculum library
- Full CfE database or certification claim
- Pupil progress history
- Advanced analytics
- Direct RoBico hardware connection
- Production PDF-generation service
- Microsoft 365, Google Classroom or MIS integration
- Multi-school lesson sharing
- Full commercial version history
- Proprietary curriculum packs
- Supplier-owned code or assets
- Independent in-app AI model integration
- Autonomous lesson approval

### Rule for new ideas

If a new idea appears after scope freeze:

1. Add it to `Future roadmap`.
2. Do not add it to the current build.
3. Reconsider it only after submission.

### Checklist

- [ ] The out-of-scope list is present in `docs/SCOPE.md`.
- [ ] The same boundary is summarised in README.
- [ ] Future ideas have somewhere to be recorded without entering the build.
- [ ] The build is still one teacher and one lesson workflow.

### Completion test

The team can reject a new feature by pointing to the agreed boundary rather than reopening the entire product discussion.

## Step 8 — Complete the IP and public-release audit

### Create

```text
docs/IP-NOTICE.md
```

### Use three categories

#### Green — permitted in the public prototype

- Original prototype source code authorised for release
- Generic interface components
- Generic robot, tile, mat and classroom icons created or licensed for reuse
- Fictional class context
- Limited fictional sample mission
- Generic lesson-planning structures
- WebMCP tool definitions
- Validation rules written for the competition prototype

#### Red — prohibited from the public repository

- Full Tangible Coding curriculum packs
- Commercial lesson library
- Internal pricing or commercial strategy
- School, teacher or pupil personal data
- Real SEND or attainment records
- MARUSYSedu or RoBico source code
- Supplier-owned images, manuals or assets without permission
- Confidential JV or shareholder documents
- Credentials, API keys or private URLs

#### Amber — requires written review before use

- Tangible Coding logo files
- Product photographs
- RoBico name or image in screenshots
- Existing worksheets or lesson content
- Third-party icon packs
- Any material created jointly with an external collaborator

### Licence recommendation

For the limited prototype source code, **MIT** is the simplest competition-friendly option. It allows broad reuse and includes a warranty disclaimer. This recommendation applies only after Tangible Coding Ltd confirms that the listed prototype code may be released.

Do not interpret the code licence as permission to publish the wider curriculum, trademarks, commercial content or third-party assets.

### Suggested IP notice

```markdown
# Intellectual Property and Sample Content Notice

This repository contains a limited WebMCP competition prototype developed for the 2026 OpenAI WebMCP Challenge.

The open-source licence applies to the source code contained in this repository unless a file states otherwise. It does not grant rights to Tangible Coding Ltd trademarks, the wider Tangible Coding curriculum, commercial lesson packs, third-party products, supplier-owned materials or content not included in this repository.

All class information and lesson examples in this prototype are fictional demonstration data. No real pupil or school data is required or included.
```

### Checklist

- [ ] Green, red and amber categories have been reviewed.
- [ ] Ian has confirmed or been asked to confirm the release boundary.
- [ ] No third-party asset is assumed to be reusable.
- [ ] Prototype code and curriculum content are treated separately.
- [ ] The selected licence is recorded in D6.
- [ ] The IP notice states that sample data is fictional.

### Stop condition

If the team cannot clearly establish ownership or permission for an asset, exclude it from the competition repository.

## Step 9 — Create the public GitHub repository

### Recommended repository name

```text
tangible-coding-webmcp-mission-builder
```

### Recommended repository owner

Use the Tangible Coding organisation if it exists and is controlled by the company. Otherwise use the account agreed in the Entry and IP Decision Record, while clearly recording Tangible Coding Ltd's ownership and authorisation.

### GitHub web steps

1. Sign in to GitHub.
2. Select `New repository`.
3. Enter `tangible-coding-webmcp-mission-builder`.
4. Add description: `WebMCP prototype for teacher–agent tangible coding lesson design.`
5. Set visibility to `Public`.
6. Add `README.md`.
7. Add the approved licence.
8. Do not add proprietary project files.
9. Create the repository.
10. Record the repository URL in the decision record.

### Minimum structure for today

```text
tangible-coding-webmcp-mission-builder/
├── README.md
├── LICENSE
└── docs/
    ├── ENTRY-AND-IP-DECISIONS.md
    ├── SCOPE.md
    └── IP-NOTICE.md
```

### README content for today's initial commit

```markdown
# Tangible Coding Studio — Mission Builder

Mission Builder is a teacher-facing WebMCP prototype in which a primary teacher and an AI agent jointly create, adapt, validate and review one tangible coding lesson on a shared visual canvas.

## Competition prototype

This repository contains a limited prototype for the 2026 OpenAI WebMCP Challenge. It is not the complete commercial Tangible Coding Studio.

## Pre-existing concept

Before the competition, Tangible Coding Ltd had defined Tangible Coding as a three-part school system: physical resources, curriculum and teacher support, and an AI-supported backstage Studio concept.

## Built during the challenge

The WebMCP-enabled Mission Builder implementation, registered page tools, structured lesson canvas, agent change-control workflow, deterministic validation and competition demonstration are being developed during the challenge period.

## Golden path

The prototype demonstrates one fictional P4 storytelling and debugging lesson for 24 pupils using limited tangible coding resources.

## Privacy

The prototype uses fictional sample information only. Do not enter real pupil or school data.

## Scope

See `docs/SCOPE.md`.

## IP notice

See `docs/IP-NOTICE.md`.

## Status

Scope frozen on 2026-08-27. Application build begins after the scope checkpoint.
```

### Optional command-line method

Use this only after the empty repository exists and the correct owner is confirmed:

```bash
git clone <repository-url>
cd tangible-coding-webmcp-mission-builder
git add README.md LICENSE docs
git commit -m "chore: freeze WebMCP prototype scope"
git push origin main
```

Do not paste credentials into the terminal or repository.

### Checklist

- [ ] Repository owner matches the decision record.
- [ ] Repository is public.
- [ ] Repository name is clear and competition-specific.
- [ ] README exists.
- [ ] Licence exists.
- [ ] Scope file exists.
- [ ] IP notice exists.
- [ ] Decision record exists without confidential shareholder details.
- [ ] The first commit is dated 2026-08-27.
- [ ] Commit history clearly begins the competition implementation period.
- [ ] No code or asset from an unauthorised source is present.

### Completion test

A judge or collaborator opening the repository can understand the project, prior concept, competition work, scope and IP boundary before any application code is added.

## Step 10 — Create the issue list

### Create these labels

- `critical`
- `optional`
- `webmcp`
- `ui`
- `validation`
- `privacy`
- `submission`
- `blocked`

### Create these critical issues

- [ ] `Build application shell and three-column layout`
- [ ] `Implement lesson domain model and local state`
- [ ] `Build class-context and resource controls`
- [ ] `Build structured lesson canvas`
- [ ] `Register set_class_context`
- [ ] `Register select_tangible_resources`
- [ ] `Register build_tangible_mission`
- [ ] `Register adapt_for_learners`
- [ ] `Register validate_and_prepare_lesson`
- [ ] `Implement agent change sets and review`
- [ ] `Implement deterministic validation`
- [ ] `Protect human-only lesson approval`
- [ ] `Build three printable outputs`
- [ ] `Test golden-path prompt`
- [ ] `Deploy public application`
- [ ] `Complete public README and testing instructions`
- [ ] `Record public video under three minutes`
- [ ] `Complete and submit Devpost entry`

### Create these optional issues

- [ ] `Add non-critical visual animation`
- [ ] `Add additional sample mission`
- [ ] `Improve mobile layout beyond judge needs`
- [ ] `Add optional export of lesson JSON for debugging`

### Issue rule

An optional issue may start only when:

- all critical issues scheduled for that date are complete;
- the golden path still works;
- it cannot delay testing, deployment, video or submission.

### Checklist

- [ ] All critical issues exist.
- [ ] Every issue has a clear completion statement.
- [ ] Optional features are visibly separated.
- [ ] Blocked issues identify the decision or dependency.
- [ ] No excluded full-Studio feature appears as a competition issue.

### Completion test

Tomorrow's development can begin by selecting a critical issue without reopening product scope.

## Step 11 — Complete the scope-freeze checkpoint

### Answer every question

- [ ] Is the entrant identified?
- [ ] Is the representative identified and authorised?
- [ ] Does Ian's written response support the public prototype boundary?
- [ ] Is Tangible Coding Ltd's ownership position recorded?
- [ ] Is the public-release boundary clear?
- [ ] Is the licence selected or awaiting one explicit decision?
- [ ] Is the prototype name frozen?
- [ ] Is the one-sentence definition frozen?
- [ ] Is the P4 golden path frozen?
- [ ] Are the five tools frozen?
- [ ] Is the nine-step journey frozen?
- [ ] Is the out-of-scope list frozen?
- [ ] Does the public repository exist?
- [ ] Does the first commit exist?
- [ ] Does README distinguish prior concept from challenge work?
- [ ] Does the repository contain no unauthorised asset?
- [ ] Do critical GitHub issues exist?
- [ ] Can development begin without a further product decision?

### Go decision

Select **GO** only when:

- entrant and representative are sufficiently clear;
- no unresolved IP question prevents a public code shell;
- the prototype and demonstration scope are frozen;
- the repository and critical task list exist.

Record:

```markdown
## 2026-08-27 Scope Freeze Result

Decision: GO / CONDITIONAL GO / NO-GO

Completed:
-

Open blockers:
-

Owner of each blocker:
-

Required resolution date:
- 2026-08-28
```

### Conditional go

Use **CONDITIONAL GO** if the generic application shell may begin on 2026-08-28 but a specific branded asset, licence or company-entry detail remains unresolved. State exactly what may and may not proceed.

### No-go

Use **NO-GO** only if:

- the company does not authorise the prototype;
- the team cannot establish who owns the work;
- the entry would use an ineligible identity;
- the project cannot satisfy the public repository requirement;
- the team refuses the frozen narrow scope.

## Final 2026-08-27 master checklist

### Entry and authority

- [ ] Entrant chosen
- [ ] Representative chosen
- [ ] Eligibility checked
- [ ] Representative authority retained in writing
- [ ] Ian's approval received or clearly pending

### Product freeze

- [ ] Mission Builder name frozen
- [ ] Product definition frozen
- [ ] Teacher-facing role frozen
- [ ] P4 golden path frozen
- [ ] Nine-step journey frozen
- [ ] Five tools frozen
- [ ] Human-only approval frozen
- [ ] Out-of-scope list frozen

### IP and public release

- [ ] Code-release boundary recorded
- [ ] Curriculum exclusion recorded
- [ ] Supplier-asset exclusion recorded
- [ ] School and pupil-data exclusion recorded
- [ ] Green, amber and red asset list completed
- [ ] Licence selected or assigned as a named blocker
- [ ] IP notice completed

### Repository

- [ ] Public repository created
- [ ] Correct owner selected
- [ ] README added
- [ ] Licence added
- [ ] `docs/SCOPE.md` added
- [ ] `docs/IP-NOTICE.md` added
- [ ] Decision record added
- [ ] Initial commit completed on 2026-08-27
- [ ] Repository URL recorded

### Work management

- [ ] Critical labels created
- [ ] Optional labels created
- [ ] Critical issues created
- [ ] Optional issues separated
- [ ] Blockers assigned
- [ ] Scope-freeze result recorded

## What not to do on 2026-08-27

- Do not design additional Studio modules.
- Do not build pupil accounts.
- Do not upload the full curriculum.
- Do not upload RoBico or supplier-owned assets without permission.
- Do not choose visuals before checking rights.
- Do not add a sixth WebMCP tool.
- Do not add autonomous lesson approval.
- Do not start production authentication.
- Do not spend time polishing animations.
- Do not treat an unanswered ownership or IP question as approval.

## Ready for 2026-08-28 when

The 2026-08-28 application-foundation work may start when:

- the frozen scope is available to the developer;
- the repository exists;
- the developer knows which content and assets are permitted;
- the five tools and nine-step journey cannot change without a formal scope decision;
- any unresolved company or licence issue is recorded with an owner and resolution date;
- the team has issued GO or a precisely limited CONDITIONAL GO.
