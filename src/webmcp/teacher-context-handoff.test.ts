import { describe, expect, it } from 'vitest'
import { createCleanDraft, createGoldenPathDraft, lostStoryPathMission } from '../domain/lesson-factories'
import { createTeacherContextPackage } from '../domain/lesson-context-package'
import { importProposalPackage } from '../domain/lesson-proposal-package'
import { createPendingChangeSet, receiveChangeSet, resolveOperation } from '../domain/lesson-change-control'
import { createLessonCommandBoundary } from '../state/lesson-state'
import { createProductionWebMcpHandlers } from './use-webmcp'

const now = '2026-08-30T12:00:00.000Z'
const signal = () => new AbortController().signal

function teacherDraft() {
  const draft = createGoldenPathDraft(now)
  return {
    ...draft,
    title: lostStoryPathMission.title,
    mission: structuredClone(lostStoryPathMission),
    adaptations: {
      supports: ['visual-instructions' as const], extensions: [] as Array<'loop-challenge'>,
      supportInstructions: 'Use accepted visual steps.', extensionInstructions: '', sectionsToUpdate: [], noAdditionalAdaptation: false,
    },
  }
}

function missionInput() {
  return {
    title: 'Transient mission', theme: 'A fictional story', challengeLevel: 'core',
    learningIntention: 'Test and debug a sequence.', successCriteria: ['I can test.', 'I can debug.'], missionStory: 'Repair the fictional path.',
    plan: 'Plan.', planDurationMinutes: 10, buildAndExplain: 'Build.', buildAndExplainDurationMinutes: 15,
    testAndDebug: 'Test.', testAndDebugDurationMinutes: 15, reflectAndImprove: 'Reflect.', reflectAndImproveDurationMinutes: 5,
    assessmentEvidence: ['Explain the repaired instruction.'],
  } as const
}

describe('isolated browser teacher-context handoff', () => {
  it('runs resources, mission and adaptation transiently without mutating the agent browser', async () => {
    const accepted = teacherDraft()
    const serialized = JSON.stringify(await createTeacherContextPackage(accepted, now))
    const local = createCleanDraft(now)
    const snapshot = structuredClone(local)
    let publications = 0
    const commands = createLessonCommandBoundary(local, () => { publications += 1 })
    const handlers = createProductionWebMcpHandlers(commands)

    const resources = await handlers.select_tangible_resources?.({ robots: 0, tileSets: 0, activityMats: 0, instructionCardPacks: 0, allowTileOnlyGroups: false, teacherContext: serialized }, { signal: signal() }) as Record<string, unknown>
    expect(resources).toMatchObject({ ok: true, stateChanged: false, delivery: 'portable-package-only', resourceWarnings: [expect.stringContaining('Blocking:')], proposalPackage: { schemaVersion: 2 } })

    const mission = await handlers.build_tangible_mission?.({ ...missionInput(), teacherContext: serialized }, { signal: signal() }) as Record<string, unknown>
    expect(mission).toMatchObject({ ok: true, stateChanged: false, delivery: 'portable-package-only', feasibilityWarnings: [], proposalPackage: { schemaVersion: 2 } })

    const adaptation = await handlers.adapt_for_learners?.({
      supports: ['reduced-reading'], extensions: ['loop-challenge'], supportInstructions: 'Use short visual steps.', extensionInstructions: 'Add a loop.',
      sectionsToUpdate: ['learner-support', 'extension-challenge'], cycleSections: [], teacherContext: serialized,
    }, { signal: signal() }) as Record<string, unknown>
    expect(adaptation).toMatchObject({ ok: true, stateChanged: false, delivery: 'portable-package-only', proposalPackage: { schemaVersion: 2 } })
    const adaptationPackage = adaptation.proposalPackage as { operations: Array<{ section: string; before: unknown }> }
    expect(adaptationPackage.operations.find(({ section }) => section === 'learner-support')).toMatchObject({ before: { supports: ['visual-instructions'], supportInstructions: 'Use accepted visual steps.' } })
    expect(commands.getDraft()).toEqual(snapshot)
    expect(publications).toBe(0)
  })

  it('uses only supplied accepted state for transient validation and persists nothing', async () => {
    const accepted = teacherDraft()
    accepted.adaptations = { ...accepted.adaptations, extensions: ['loop-challenge'], extensionInstructions: 'Add a loop.' }
    const serialized = JSON.stringify(await createTeacherContextPackage(accepted, now))
    const cleanLocal = createCleanDraft(now)
    const historical = createPendingChangeSet(cleanLocal, 'set_class_context', [{ section: 'class-context', before: cleanLocal.classContext, proposed: { ...cleanLocal.classContext, classSize: 20 } }], { changeSetId: 'local-history', operationIds: ['local-history-operation'], createdAt: now })
    const withHistory = resolveOperation(receiveChangeSet(cleanLocal, historical, now), 'local-history', 'local-history-operation', 'reject', now)
    const pending = createPendingChangeSet(withHistory, 'set_class_context', [{ section: 'class-context', before: withHistory.classContext, proposed: { ...withHistory.classContext, classSize: 21 } }], { changeSetId: 'local-pending', operationIds: ['local-pending-operation'], createdAt: now })
    const local = receiveChangeSet(withHistory, pending, now)
    const snapshot = structuredClone(local)
    let publications = 0
    const commands = createLessonCommandBoundary(local, () => { publications += 1 })
    const result = await createProductionWebMcpHandlers(commands).validate_and_prepare_lesson?.({ runMode: 'validate-and-prepare', teacherContext: serialized }, { signal: signal() }) as Record<string, unknown>
    expect(result).toMatchObject({ readiness: 'ready', stateChanged: false, delivery: 'transient-result-only', preparationImplemented: false, preparedOutputs: [] })
    expect(result).toHaveProperty('usedContextFingerprint')
    expect(commands.getDraft()).toEqual(snapshot)
    expect(publications).toBe(0)
    expect(commands.getDraft().approvedAt).toBeUndefined()
  })

  it('completes Chrome copy to transient invocation to version-2 Chrome import across isolated stores', async () => {
    const chrome = teacherDraft()
    const chatGpt = createCleanDraft(now)
    const chromeCommands = createLessonCommandBoundary(chrome, () => undefined)
    const chatCommands = createLessonCommandBoundary(chatGpt, () => undefined)
    const teacherContext = JSON.stringify(await createTeacherContextPackage(chromeCommands.getDraft(), now))
    const result = await createProductionWebMcpHandlers(chatCommands).adapt_for_learners?.({
      supports: ['reduced-reading'], extensions: [], supportInstructions: 'Use less text.', extensionInstructions: '',
      sectionsToUpdate: ['learner-support'], cycleSections: [], teacherContext,
    }, { signal: signal() }) as { ok: boolean; proposalPackage: unknown; stateChanged: boolean }
    expect(result).toMatchObject({ ok: true, stateChanged: false })
    expect(chatCommands.getDraft()).toEqual(chatGpt)
    expect(await importProposalPackage(JSON.stringify(result.proposalPackage), chromeCommands.getDraft(), chromeCommands.receiveChangeSet)).toMatchObject({ ok: true })
    expect(chromeCommands.getDraft().pendingChanges).toHaveLength(1)
    expect(chromeCommands.getDraft().adaptations.supportInstructions).toBe('Use accepted visual steps.')
    expect(chromeCommands.getDraft().approvedAt).toBeUndefined()
  })
})
