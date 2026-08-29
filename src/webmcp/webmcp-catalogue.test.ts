import { describe, expect, it } from 'vitest'
import { toolSectionAllowlists } from '../domain/lesson-schemas'
import { WEBMCP_TOOL_CATALOGUE, WEBMCP_TOOL_NAMES } from './webmcp-catalogue'

const expectedNames = ['set_class_context', 'select_tangible_resources', 'build_tangible_mission', 'adapt_for_learners', 'validate_and_prepare_lesson']
const text = (description: string, maxLength: number) => ({ type: 'string', description, maxLength })
const integer = (description: string, minimum: number, maximum?: number) => ({ type: 'integer', description, minimum, ...(maximum === undefined ? {} : { maximum }) })
const enumString = (description: string, values: readonly string[]) => ({ type: 'string', description, enum: values })
const cycleNames = ['plan', 'build-and-explain', 'test-and-debug', 'reflect-and-improve'] as const

const expectedSchemas = {
  set_class_context: {
    type: 'object', additionalProperties: false,
    properties: {
      stage: enumString('Primary stage.', ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']), classSize: integer('Number of fictional pupils.', 1, 40),
      durationMinutes: { type: 'integer', description: 'Lesson duration in minutes.', enum: [30, 45, 60, 90] },
      learningFocus: { type: 'array', description: 'Computational-thinking focuses.', items: enumString('One learning focus.', ['sequencing', 'algorithms', 'loops', 'debugging', 'conditionals', 'collaboration']), minItems: 1 },
      subjectContext: enumString('Curriculum subject context.', ['computing', 'literacy', 'maths', 'STEM', 'IDL']), teacherConfidence: enumString('Teacher confidence level.', ['beginner', 'developing', 'confident']), goal: text('Optional fictional lesson goal.', 280),
    }, required: ['stage', 'classSize', 'durationMinutes', 'learningFocus', 'subjectContext', 'teacherConfidence'],
  },
  select_tangible_resources: {
    type: 'object', additionalProperties: false,
    properties: { robots: integer('Available robots.', 0, 12), tileSets: integer('Available tile sets.', 0, 30), activityMats: integer('Available activity mats.', 0, 12), instructionCardPacks: integer('Available instruction-card packs.', 0, 12), roleCards: integer('Optional available pupil role cards.', 0, 40), allowTileOnlyGroups: { type: 'boolean', description: 'Whether tile-only stations are allowed.' } },
    required: ['robots', 'tileSets', 'activityMats', 'instructionCardPacks', 'allowTileOnlyGroups'],
  },
  build_tangible_mission: {
    type: 'object', additionalProperties: false,
    properties: {
      title: text('Mission title.', 100), theme: text('Mission theme.', 160), challengeLevel: enumString('Challenge level.', ['introductory', 'core', 'stretch']), learningIntention: text('Learning intention.', 240),
      successCriteria: { type: 'array', description: 'Observable success criteria.', items: text('One success criterion.', 180), minItems: 2, maxItems: 4 }, missionStory: text('Mission story or problem.', 700),
      plan: text('Plan stage content.', 500), planDurationMinutes: integer('Plan stage minutes.', 1), buildAndExplain: text('Build and Explain content.', 500), buildAndExplainDurationMinutes: integer('Build and Explain minutes.', 1), testAndDebug: text('Test and Debug content.', 500), testAndDebugDurationMinutes: integer('Test and Debug minutes.', 1), reflectAndImprove: text('Reflect and Improve content.', 500), reflectAndImproveDurationMinutes: integer('Reflect and Improve minutes.', 1),
      assessmentEvidence: { type: 'array', description: 'Observable assessment evidence.', items: text('One evidence statement.', 180), minItems: 1, maxItems: 5 },
    }, required: ['title', 'theme', 'challengeLevel', 'learningIntention', 'successCriteria', 'missionStory', 'plan', 'planDurationMinutes', 'buildAndExplain', 'buildAndExplainDurationMinutes', 'testAndDebug', 'testAndDebugDurationMinutes', 'reflectAndImprove', 'reflectAndImproveDurationMinutes', 'assessmentEvidence'],
  },
  adapt_for_learners: {
    type: 'object', additionalProperties: false,
    properties: {
      supports: { type: 'array', description: 'Selected support approaches.', items: enumString('One support approach.', ['reduced-reading', 'visual-instructions', 'fewer-steps', 'additional-time', 'paired-explanation', 'predictable-roles']) }, extensions: { type: 'array', description: 'Selected extension approaches.', items: enumString('One extension approach.', ['longer-route', 'extra-debugging-fault', 'loop-challenge', 'compare-solutions', 'design-new-mission']) }, supportInstructions: text('Learner-support instructions.', 500), extensionInstructions: text('Extension-challenge instructions.', 500),
      sectionsToUpdate: { type: 'array', description: 'Named sections to propose.', uniqueItems: true, items: enumString('One authorised section.', [...cycleNames, 'learner-support', 'extension-challenge']) }, cycleSections: { type: 'array', description: 'Matching cycle-section payloads.', uniqueItems: true, items: { type: 'object', additionalProperties: false, properties: { section: enumString('Cycle section name.', cycleNames), content: text('Cycle section content.', 500), durationMinutes: integer('Cycle section minutes.', 1) }, required: ['section', 'content', 'durationMinutes'] } },
    }, required: ['supports', 'extensions', 'supportInstructions', 'extensionInstructions', 'sectionsToUpdate', 'cycleSections'],
  },
  validate_and_prepare_lesson: { type: 'object', additionalProperties: false, properties: { runMode: enumString('Validation run mode.', ['validate', 'validate-and-prepare']) }, required: ['runMode'] },
} as const

const expectedMetadata = {
  set_class_context: ['Set class context', 'Propose a structured class context for teacher review.', 'Proposal identity, class-context section, normalized context and validation messages.'],
  select_tangible_resources: ['Select tangible resources', 'Propose tangible resource inventory for teacher review.', 'Proposal identity, resource section, normalized inventory and resource warnings.'],
  build_tangible_mission: ['Build tangible mission', 'Propose structured mission sections for teacher review.', 'Proposal identity, affected mission sections and feasibility warnings.'],
  adapt_for_learners: ['Adapt for learners', 'Propose named learner adaptations for teacher review.', 'Proposal identity, affected sections and before/proposed values.'],
  validate_and_prepare_lesson: ['Validate lesson', 'Run deterministic validation and report readiness for teacher review.', 'Deterministic checks, readiness and preparationImplemented false; no approval or outputs.'],
} as const

function collectDescriptions(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>
  return [...(typeof record.description === 'string' ? [record.description] : []), ...Object.values(record).flatMap(collectDescriptions)]
}

function collectPropertyNames(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>
  const own = record.properties && typeof record.properties === 'object' ? Object.keys(record.properties) : []
  return [...own, ...Object.values(record).flatMap(collectPropertyNames)]
}

describe('WebMCP descriptor catalogue', () => {
  it('defines the exact five names in deterministic order and their complete authority', () => {
    expect(WEBMCP_TOOL_NAMES).toEqual(expectedNames)
    expect(WEBMCP_TOOL_CATALOGUE.map(({ name, allowedSections }) => [name, allowedSections])).toEqual(expectedNames.map((name) => [name, toolSectionAllowlists[name as keyof typeof toolSectionAllowlists]]))
  })

  it('uses the D-018 annotations', () => {
    expect(WEBMCP_TOOL_CATALOGUE.map(({ name, annotations }) => [name, annotations])).toEqual([
      ['set_class_context', { readOnlyHint: false, untrustedContentHint: true }],
      ['select_tangible_resources', { readOnlyHint: false, untrustedContentHint: true }],
      ['build_tangible_mission', { readOnlyHint: false, untrustedContentHint: true }],
      ['adapt_for_learners', { readOnlyHint: false, untrustedContentHint: true }],
      ['validate_and_prepare_lesson', { readOnlyHint: false, untrustedContentHint: false }],
    ])
  })

  it('matches every authoritative descriptor field and input schema exactly', () => {
    for (const tool of WEBMCP_TOOL_CATALOGUE) {
      const [title, description, expectedOutputDescription] = expectedMetadata[tool.name]
      expect(tool).toEqual({ name: tool.name, title, description, inputSchema: expectedSchemas[tool.name], annotations: { readOnlyHint: false, untrustedContentHint: tool.name !== 'validate_and_prepare_lesson' }, allowedSections: toolSectionAllowlists[tool.name], expectedOutputDescription })
    }
    expect(JSON.stringify(WEBMCP_TOOL_CATALOGUE)).not.toContain('noAdditionalAdaptation')
  })

  it('stays within official guidance budgets', () => {
    for (const tool of WEBMCP_TOOL_CATALOGUE) {
      expect(tool.name.length).toBeLessThanOrEqual(30)
      expect(tool.description.length).toBeLessThanOrEqual(500)
      expect(tool.expectedOutputDescription.length).toBeLessThanOrEqual(1500)
      for (const description of collectDescriptions(tool.inputSchema)) expect(description.length).toBeLessThanOrEqual(150)
      for (const parameterName of collectPropertyNames(tool.inputSchema)) {
        if (parameterName === 'reflectAndImproveDurationMinutes') expect(parameterName.length).toBe(32)
        else expect(parameterName.length).toBeLessThanOrEqual(30)
      }
    }
  })
})
