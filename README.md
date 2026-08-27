# Tangible Coding Studio: Mission Builder

Mission Builder is a teacher-facing WebMCP Challenge prototype for designing one fictional P4 tangible coding lesson on a shared visual canvas. The current repository stage provides the Vite, React and TypeScript application foundation and a static representation of the approved golden path. WebMCP tools are not registered yet.

## Current foundation

The application currently provides:

- a branded Mission Builder header;
- the nine-step teacher journey;
- a three-column desktop workspace;
- the fictional 24-pupil P4 storytelling and debugging scenario;
- visible wording that final approval belongs only to the teacher;
- a Zod-validated fictional sample context;
- build, lint and smoke-test scripts.

It does not yet provide WebMCP tools, agent change sets, lesson editing, deterministic readiness validation, output printing or deployment configuration.

## Pre-existing Tangible Coding concept

Tangible Coding Studio, its wider curriculum direction, trademarks, teaching methods and commercial materials existed before the WebMCP Challenge. Those wider assets are not published or licensed through this repository. This prototype uses only limited, fictional sample content needed to demonstrate the competition workflow.

## Built during the WebMCP Challenge

The Mission Builder competition prototype and the code in this repository are challenge-period work. The planned prototype demonstrates how a primary teacher and an AI agent can create, adapt, validate and review one tangible coding lesson on the same visible canvas while the teacher retains final approval.

The approved future WebMCP surface is limited to the five tools named in `docs/SOURCE-OF-TRUTH.md`. This foundation does not implement or register them.

## Prototype-code licence boundary

Authorised prototype code in this repository is provided under the [MIT License](LICENSE). The licence applies only to authorised repository contents. It does not grant rights to Tangible Coding Ltd trademarks, the wider commercial curriculum, proprietary lesson packs, supplier-owned materials or other company intellectual property unless expressly stated.

## Private development and release gate

This repository remains under private development. It must not be made public, deployed as the company release or submitted to Devpost until Ian Cameron's affirmative Email or WhatsApp authorisation has been received and retained in the private project record. That evidence must cover Tangible Coding Ltd entering, Bun Tang acting as representative, company ownership of the new prototype work and publication of the limited prototype code under MIT.

Do not commit the private authorisation evidence to this repository.

## Local development

Requirements:

- Node.js 22 or a compatible current LTS release;
- npm.

Install and run locally:

```sh
npm install
npm run dev
```

Verification:

```sh
npm run build
npm run lint
npm run test
```

Use fictional sample information only. Do not enter pupil names, school details or personal data.
