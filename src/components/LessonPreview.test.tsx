import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createGoldenPathDraft, lostStoryPathMission } from '../domain/lesson-factories'
import type { LessonSection } from '../domain/lesson-schemas'
import { LessonPreview, type AcceptedLessonPreview } from './LessonPreview'

const sections: LessonSection[] = [
  'class-context', 'tangible-resources', 'lesson-identity', 'learning-intention',
  'success-criteria', 'mission-story', 'plan', 'build-and-explain',
  'test-and-debug', 'reflect-and-improve', 'assessment-evidence',
  'learner-support', 'extension-challenge',
]

function acceptedLesson(overrides: Partial<AcceptedLessonPreview> = {}): AcceptedLessonPreview {
  const draft = createGoldenPathDraft('2026-08-30T12:00:00.000Z')
  return {
    classContext: draft.classContext,
    resources: draft.resources,
    groupingPlan: draft.groupingPlan,
    mission: { ...lostStoryPathMission, title: 'Debug the Kelpie’s Story Route' },
    adaptations: {
      supports: ['reduced-reading', 'visual-instructions'],
      extensions: ['loop-challenge'],
      supportInstructions: 'Use concise visual prompts for each route step.',
      extensionInstructions: 'Invite pupils to replace repeated moves with a loop.',
      sectionsToUpdate: [],
      noAdditionalAdaptation: false,
    },
    validation: { readiness: 'ready', preparedOutputs: [] },
    ...overrides,
  }
}

const provenance = Object.fromEntries(sections.map((section, index) => [section, index % 2 === 0 ? 'teacher-accepted' : 'teacher-authored'])) as Partial<Record<LessonSection, 'teacher-authored' | 'teacher-accepted'>>

function renderPreview(accepted = acceptedLesson(), pendingCount = 0) {
  return render(<LessonPreview accepted={accepted} provenance={provenance} pendingCount={pendingCount} />)
}

describe('accepted lesson preview', () => {
  it('defaults to one Teacher Guide article and switches among exactly three outputs', () => {
    renderPreview()
    const navigation = screen.getByRole('navigation', { name: 'Lesson preview outputs' })
    const destinations = within(navigation).getAllByRole('button')
    expect(destinations.map((button) => button.textContent)).toEqual(['Teacher Guide', 'Pupil Mission Card', 'Observation Checklist'])
    expect(destinations[0]).toHaveAttribute('aria-current', 'page')
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByRole('article', { name: 'Teacher Guide' })).toBeInTheDocument()

    fireEvent.click(destinations[1])
    expect(destinations[1]).toHaveAttribute('aria-current', 'page')
    expect(destinations[0]).not.toHaveAttribute('aria-current')
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByRole('article', { name: 'Pupil Mission Card' })).toBeInTheDocument()

    fireEvent.click(destinations[2])
    expect(destinations[2]).toHaveAttribute('aria-current', 'page')
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByRole('article', { name: 'Observation Checklist' })).toBeInTheDocument()
  })

  it('maps all accepted Teacher Guide fields without creating prepared output state', () => {
    renderPreview()
    const guide = screen.getByRole('article', { name: 'Teacher Guide' })
    expect(guide).toHaveTextContent('Debug the Kelpie’s Story Route')
    expect(guide).toHaveTextContent('storytelling')
    expect(guide).toHaveTextContent('24 fictional pupils')
    expect(within(guide).getByText('Robots').parentElement).toHaveTextContent('3')
    expect(guide).toHaveTextContent(lostStoryPathMission.learningIntention)
    lostStoryPathMission.successCriteria.forEach((criterion) => expect(guide).toHaveTextContent(criterion))
    expect(guide).toHaveTextContent(lostStoryPathMission.missionStory)
    expect(guide).toHaveTextContent(lostStoryPathMission.plan)
    expect(guide).toHaveTextContent(`${lostStoryPathMission.planDurationMinutes} minutes`)
    expect(guide).toHaveTextContent(lostStoryPathMission.buildAndExplain)
    expect(guide).toHaveTextContent(lostStoryPathMission.testAndDebug)
    expect(guide).toHaveTextContent(lostStoryPathMission.reflectAndImprove)
    expect(guide).toHaveTextContent('Use concise visual prompts for each route step.')
    expect(guide).toHaveTextContent('Invite pupils to replace repeated moves with a loop.')
    lostStoryPathMission.assessmentEvidence.forEach((evidence) => expect(guide).toHaveTextContent(evidence))
    expect(screen.getByText('Live preview of accepted lesson content. No prepared teaching-material files have been generated.')).toBeInTheDocument()
    expect(screen.queryByText(/preparationImplemented|preparedOutputs/)).not.toBeInTheDocument()
  })

  it('maps the pupil card and does not invent group roles or preparation prose', () => {
    renderPreview()
    fireEvent.click(screen.getByRole('button', { name: 'Pupil Mission Card' }))
    const card = screen.getByRole('article', { name: 'Pupil Mission Card' })
    expect(card).toHaveTextContent(lostStoryPathMission.missionStory)
    expect(card).toHaveTextContent(lostStoryPathMission.learningIntention)
    expect(card).toHaveTextContent(lostStoryPathMission.plan)
    expect(card).toHaveTextContent(lostStoryPathMission.buildAndExplain)
    expect(card).toHaveTextContent(lostStoryPathMission.testAndDebug)
    expect(card).toHaveTextContent(lostStoryPathMission.reflectAndImprove)
    expect(card).toHaveTextContent('Group roles have not been specified in the accepted lesson.')
    expect(card).not.toHaveTextContent(/navigator|robot operator|recorder/i)
    expect(card).not.toHaveTextContent(/print and cut|prepare worksheets/i)
  })

  it('maps accepted observation criteria, evidence and debugging prompts', () => {
    renderPreview()
    fireEvent.click(screen.getByRole('button', { name: 'Observation Checklist' }))
    const checklist = screen.getByRole('article', { name: 'Observation Checklist' })
    expect(within(checklist).getByRole('table', { name: 'Observable success criteria' })).toBeInTheDocument()
    lostStoryPathMission.successCriteria.forEach((criterion) => expect(checklist).toHaveTextContent(criterion))
    lostStoryPathMission.assessmentEvidence.forEach((evidence) => expect(checklist).toHaveTextContent(evidence))
    expect(checklist).toHaveTextContent(lostStoryPathMission.testAndDebug)
    expect(checklist).toHaveTextContent(lostStoryPathMission.reflectAndImprove)
  })

  it.each([
    ['not-checked', 'Not checked'],
    ['blocked', 'Blocked'],
    ['warning', 'Warning'],
    ['ready', 'Ready for teacher review'],
  ] as const)('shows %s readiness without claiming approval', (readiness, label) => {
    renderPreview(acceptedLesson({ validation: { readiness, preparedOutputs: [] } }))
    expect(screen.getByLabelText('Preview status')).toHaveTextContent(`Readiness: ${label}`)
    expect(screen.getByText(/Teacher approval remains required/)).toBeVisible()
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument()
  })

  it('shows honest empty and incomplete states', () => {
    const base = acceptedLesson()
    const { rerender } = render(<LessonPreview accepted={{ ...base, mission: { ...base.mission, title: '', learningIntention: '', missionStory: '', successCriteria: [], plan: '', planDurationMinutes: null, buildAndExplain: '', buildAndExplainDurationMinutes: null, testAndDebug: '', testAndDebugDurationMinutes: null, reflectAndImprove: '', reflectAndImproveDurationMinutes: null, assessmentEvidence: [] } }} provenance={provenance} pendingCount={0} />)
    expect(screen.getByLabelText('Preview status')).toHaveTextContent('Accepted lesson is empty')
    expect(screen.getAllByText('Not yet added').length).toBeGreaterThan(0)
    rerender(<LessonPreview accepted={{ ...base, mission: { ...base.mission, assessmentEvidence: [] } }} provenance={provenance} pendingCount={0} />)
    expect(screen.getByLabelText('Preview status')).toHaveTextContent('Incomplete accepted lesson preview')
  })

  it('shows accepted provenance and excludes pending suggestions by contract', () => {
    renderPreview(acceptedLesson(), 2)
    expect(screen.getAllByText('Teacher accepted').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Teacher authored').length).toBeGreaterThan(0)
    expect(screen.getByText('2 pending suggestions are excluded from this accepted-content preview.')).toBeVisible()
    expect(screen.queryByText('CONSPICUOUS PENDING VALUE')).not.toBeInTheDocument()
    expect(screen.queryByText('CONSPICUOUS REJECTED VALUE')).not.toBeInTheDocument()
  })

  it('prints only after deliberate activation and does not write localStorage', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    const setItem = vi.spyOn(window.localStorage, 'setItem')
    renderPreview()
    expect(print).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Observation Checklist' }))
    expect(print).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Print current preview' }))
    expect(print).toHaveBeenCalledTimes(1)
    expect(setItem).not.toHaveBeenCalled()
    print.mockRestore()
    setItem.mockRestore()
  })
})
