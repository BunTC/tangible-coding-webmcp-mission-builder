import { describe, expect, it } from 'vitest'
import { createGoldenPathDraft, goldenPathResources, lostStoryPathMission } from './lesson-factories'
import { createPendingChangeSet, receiveChangeSet } from './lesson-change-control'
import {
  acceptedContextFromDraft,
  createTeacherContextPackage,
  fingerprintTeacherContext,
  MAX_TEACHER_CONTEXT_CHARACTERS,
  parseTeacherContextPackage,
  validateJsonStructureAndDepth,
} from './lesson-context-package'

const now = '2026-08-30T12:00:00.000Z'

function acceptedDraft() {
  const draft = createGoldenPathDraft(now)
  return {
    ...draft,
    title: lostStoryPathMission.title,
    mission: structuredClone(lostStoryPathMission),
    adaptations: {
      supports: ['visual-instructions' as const], extensions: ['loop-challenge' as const],
      supportInstructions: 'Show each fictional instruction visually.', extensionInstructions: 'Add one loop challenge.',
      sectionsToUpdate: ['learner-support'], noAdditionalAdaptation: false,
    },
  }
}

describe('teacher accepted-context packages', () => {
  it('validates JSON structure and depth iteratively without stack overflow', async () => {
    const deepArrays = `${'['.repeat(8_000)}0${']'.repeat(8_000)}`
    const deepObjects = `${'{"a":'.repeat(3_000)}0${'}'.repeat(3_000)}`
    expect(deepArrays.length).toBeLessThan(MAX_TEACHER_CONTEXT_CHARACTERS)
    expect(deepObjects.length).toBeLessThan(MAX_TEACHER_CONTEXT_CHARACTERS)
    await expect(parseTeacherContextPackage(deepArrays)).resolves.toMatchObject({ ok: false, code: 'excessive-depth' })
    await expect(parseTeacherContextPackage(deepObjects)).resolves.toMatchObject({ ok: false, code: 'excessive-depth' })

    const nested = (depth: number) => {
      let value: unknown = 0
      for (let index = 0; index < depth; index += 1) value = [value]
      return value
    }
    expect(validateJsonStructureAndDepth(nested(6))).toBe('valid')
    expect(validateJsonStructureAndDepth(nested(7))).toBe('excessive-depth')
    expect(validateJsonStructureAndDepth(Object.assign(Object.create({ inherited: true }), { value: 1 }))).toBe('non-json')
    const cyclic: unknown[] = []
    cyclic.push(cyclic)
    expect(validateJsonStructureAndDepth(cyclic)).toBe('cyclic')
  })

  it('exports the exact strict accepted-only shape regardless of pending, history, validation or approval metadata', async () => {
    const accepted = acceptedDraft()
    const pending = createPendingChangeSet(accepted, 'set_class_context', [{ section: 'class-context', before: accepted.classContext, proposed: { ...accepted.classContext, classSize: 18 } }], { changeSetId: 'pending-set', operationIds: ['pending-operation'], createdAt: now })
    const decorated = {
      ...receiveChangeSet(accepted, pending, now),
      approvedAt: undefined,
      validation: { readiness: 'blocked' as const, score: 1, checks: [], preparedOutputs: [] as [], acknowledgedWarningIds: ['VAL-11'] },
      changeHistory: [],
    }
    const result = await createTeacherContextPackage(decorated, now)
    expect(result).toEqual({
      format: 'tangible-coding-teacher-context', schemaVersion: 1,
      contextFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/), exportedAt: now,
      classContext: accepted.classContext, tangibleResources: accepted.resources,
      mission: accepted.mission,
      learnerAdaptations: {
        supports: accepted.adaptations.supports, extensions: accepted.adaptations.extensions,
        supportInstructions: accepted.adaptations.supportInstructions, extensionInstructions: accepted.adaptations.extensionInstructions,
        noAdditionalAdaptation: false,
      },
    })
    const serialized = JSON.stringify(result)
    expect(serialized).not.toMatch(/pendingChanges|changeHistory|activityLog|validation|acknowledged|groupingPlan|preparedOutputs|approvedAt|status|resolution|changeSetId|operationId|createdAt|updatedAt|sectionsToUpdate/)
    expect(result.classContext.classSize).toBe(24)
  })

  it('canonicalizes object keys, preserves array order and changes for every accepted content area', async () => {
    const content = acceptedContextFromDraft(acceptedDraft())
    const reordered = { learnerAdaptations: content.learnerAdaptations, mission: content.mission, tangibleResources: content.tangibleResources, classContext: content.classContext }
    expect(await fingerprintTeacherContext(reordered)).toBe(await fingerprintTeacherContext(content))
    const twoFocuses = { ...content, classContext: { ...content.classContext, learningFocus: ['debugging' as const, 'sequencing' as const] } }
    expect(await fingerprintTeacherContext({ ...twoFocuses, classContext: { ...twoFocuses.classContext, learningFocus: [...twoFocuses.classContext.learningFocus].reverse() } })).not.toBe(await fingerprintTeacherContext(twoFocuses))
    for (const changed of [
      { ...content, classContext: { ...content.classContext, classSize: 23 } },
      { ...content, tangibleResources: { ...content.tangibleResources, robots: 2 } },
      { ...content, mission: { ...content.mission, title: 'Changed mission' } },
      { ...content, learnerAdaptations: { ...content.learnerAdaptations, supportInstructions: 'Changed support.' } },
    ]) expect(await fingerprintTeacherContext(changed)).not.toBe(await fingerprintTeacherContext(content))
  })

  it('round-trips valid JSON and rejects privacy, unknown, duplicate, deep, oversized, wrong-version and fingerprint changes', async () => {
    const valid = await createTeacherContextPackage(acceptedDraft(), now)
    expect(await parseTeacherContextPackage(JSON.stringify(valid))).toMatchObject({ ok: true, package: valid })
    const cases: Array<[string, string]> = [
      [JSON.stringify({ ...valid, unknown: true }), 'invalid-package'],
      [JSON.stringify({ ...valid, schemaVersion: 2 }), 'wrong-version'],
      [JSON.stringify({ ...valid, contextFingerprint: '0'.repeat(64) }), 'fingerprint-mismatch'],
      [JSON.stringify({ ...valid, classContext: { ...valid.classContext, learningFocus: ['debugging', 'debugging'] } }), 'invalid-package'],
      [JSON.stringify({ ...valid, mission: { ...valid.mission, missionStory: 'Contact pupil name: Example Child' } }), 'personal-data'],
      [JSON.stringify({ ...valid, mission: { ...valid.mission, nested: { a: { b: { c: { d: { e: { f: 1 } } } } } } } }), 'excessive-depth'],
      ['{', 'malformed-json'],
      ['x'.repeat(MAX_TEACHER_CONTEXT_CHARACTERS + 1), 'excessive-size'],
    ]
    for (const [serialized, code] of cases) expect(await parseTeacherContextPackage(serialized)).toMatchObject({ ok: false, code })
  })

  it('requires every accepted-content field explicitly without inserting defaults', async () => {
    const valid = await createTeacherContextPackage(acceptedDraft(), now)
    const requiredPaths = [
      ['classContext'], ['classContext', 'stage'], ['classContext', 'classSize'], ['classContext', 'durationMinutes'], ['classContext', 'learningFocus'], ['classContext', 'subjectContext'], ['classContext', 'teacherConfidence'],
      ['tangibleResources'], ['tangibleResources', 'robots'], ['tangibleResources', 'tileSets'], ['tangibleResources', 'activityMats'], ['tangibleResources', 'instructionCardPacks'], ['tangibleResources', 'roleCards'], ['tangibleResources', 'allowTileOnlyGroups'],
      ['mission'], ['mission', 'title'], ['mission', 'theme'], ['mission', 'challengeLevel'], ['mission', 'learningIntention'], ['mission', 'successCriteria'], ['mission', 'missionStory'], ['mission', 'plan'], ['mission', 'planDurationMinutes'], ['mission', 'buildAndExplain'], ['mission', 'buildAndExplainDurationMinutes'], ['mission', 'testAndDebug'], ['mission', 'testAndDebugDurationMinutes'], ['mission', 'reflectAndImprove'], ['mission', 'reflectAndImproveDurationMinutes'], ['mission', 'assessmentEvidence'],
      ['learnerAdaptations'], ['learnerAdaptations', 'supports'], ['learnerAdaptations', 'extensions'], ['learnerAdaptations', 'supportInstructions'], ['learnerAdaptations', 'extensionInstructions'], ['learnerAdaptations', 'noAdditionalAdaptation'],
    ] as const
    for (const path of requiredPaths) {
      const incomplete = structuredClone(valid) as Record<string, unknown>
      let parent = incomplete
      for (const key of path.slice(0, -1)) parent = parent[key] as Record<string, unknown>
      delete parent[path.at(-1)!]
      const snapshot = structuredClone(incomplete)
      await expect(parseTeacherContextPackage(JSON.stringify(incomplete)), path.join('.')).resolves.toMatchObject({ ok: false, code: 'invalid-package' })
      expect(incomplete, path.join('.')).toEqual(snapshot)
      const content = {
        classContext: incomplete.classContext,
        tangibleResources: incomplete.tangibleResources,
        mission: incomplete.mission,
        learnerAdaptations: incomplete.learnerAdaptations,
      }
      await expect(fingerprintTeacherContext(content as Parameters<typeof fingerprintTeacherContext>[0]), path.join('.')).rejects.toThrow()
    }
  })

  it('rejects obvious personal data during export', async () => {
    const draft = acceptedDraft()
    draft.mission = { ...draft.mission, missionStory: 'Contact pupil name: Example Child' }
    await expect(createTeacherContextPackage(draft, now)).rejects.toThrow(/personal-data pattern/)
  })

  it('retains existing resource limits in exported content', async () => {
    const draft = acceptedDraft()
    draft.resources = { ...goldenPathResources, robots: 13 }
    await expect(createTeacherContextPackage(draft, now)).rejects.toThrow()
  })
})
