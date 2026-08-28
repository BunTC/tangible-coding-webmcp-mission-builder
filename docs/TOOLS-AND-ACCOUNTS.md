# Tools, Accounts and Access Inventory

## Required before coding

- [ ] Codex project created from the repository
- [ ] Git installed locally
- [ ] Node.js current supported LTS installed
- [ ] Package manager available
- [ ] Modern browser available
- [ ] Code editor or Codex desktop environment available
- [ ] `AGENTS.md` loaded and verified

## Source control

### GitHub

Purpose:

- public challenge repository;
- dated commit evidence;
- issues and milestones;
- public licence;
- optional pull requests and Codex review.

Required actions:

- [ ] Create `tangible-coding-webmcp-mission-builder`
- [ ] Create under the company-approved GitHub owner
- [ ] Set public visibility when authorised
- [ ] Add README and MIT licence
- [ ] Enable Issues
- [ ] Protect main from accidental force-push if practical
- [ ] Install and authenticate GitHub CLI with `gh auth login` for Codex PR context if using local review
- [ ] Connect the repository to Codex cloud if cloud tasks are used

The GitHub ChatGPT plugin is helpful for repository and pull-request work but is not required for local Git and Codex CLI. Connect it only if the team wants ChatGPT to access repository data directly.

## Codex

Use one of:

- Codex in ChatGPT desktop with a local environment;
- Codex CLI launched from the Git repository;
- Codex cloud connected to GitHub.

Official OpenAI documentation confirms that Codex reads root `AGENTS.md` as durable project guidance and that Codex cloud can connect to a selected GitHub repository and reproducible environment.

Setup checks:

- [ ] Open the project root in Codex
- [ ] Ask Codex to list loaded instruction files
- [ ] Ask Codex to summarise the Source of Truth
- [ ] Confirm it names exactly five WebMCP tools
- [ ] Confirm it identifies human-only approval
- [ ] Confirm it identifies Tangible Coding Ltd as entrant and IP owner, Bun Tang as representative, and Ian's 2026-08-28 written WhatsApp authorisation as completed

## Development stack

Required:

- TypeScript
- React
- HTML5 and CSS
- Runtime schema validation
- Browser local storage
- Test runner
- Linter and formatter

Confirmed implementation choices:

- Vite with React and TypeScript
- Vitest for unit tests
- React Testing Library for UI behaviour
- Zod for runtime schemas

Codex must record the reason before adding a dependency.

## WebMCP testing

Required clients:

- ChatGPT in-app browser when available
- Google Chrome with WebMCP testing enabled

Testing evidence to retain:

- browser and version;
- date tested;
- tools discovered;
- golden-path result;
- validation result;
- approval-boundary result;
- screenshots or short recording.

## Deployment

Confirmed provider for the competition build: **Vercel**.

Selection criteria:

- public HTTPS URL;
- fast deployment from GitHub;
- no credentials required for judges;
- stable client-side routing;
- easy rollback;
- WebMCP works in the deployed origin.

Required actions:

- [ ] Create or access the Vercel account controlled by Bun Tang for Tangible Coding Ltd
- [ ] Import the confirmed GitHub repository
- [ ] Set the production branch to `main`
- [ ] Verify the Vite build command and output directory
- [ ] Record the public production URL in the submission inventory
- [ ] Test WebMCP discovery and the golden path on the deployed origin

## Private authorisation record

- [x] Ian received the competition terms from Bun Tang
- [x] Ian gave an unambiguous affirmative WhatsApp reply on 2026-08-28
- [x] Retain the dated evidence outside the public repository
- [x] Evidence location recorded privately by Bun Tang
- [x] Company authorisation recorded as complete; do not publish the private evidence

## Competition management

- Devpost account
- WebMCP Challenge draft project
- Official rules and resources
- Public YouTube account for the demo video
- Screenshot or image editor for 3:2 gallery images

## Documentation and study

- NotebookLM for internal study notes and slides
- Markdown editor or Obsidian for working notes
- This starter pack as the canonical repository documentation

## Secrets and environment variables

The golden path should require no independent AI API key.

If any service later requires a secret:

- store it in the deployment provider's secret manager;
- provide `.env.example` with names only;
- add `.env*` to `.gitignore` except `.env.example`;
- never paste secrets into documentation, issues or Devpost.

## Optional, not required now

- Codex GitHub Action
- Automatic Codex pull-request review
- Error analytics
- Production database
- Authentication provider
- PDF-generation service
- School-system integrations
