import { StrictMode } from 'react'
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createCleanDraft } from '../domain/lesson-factories'
import { createLessonCommandBoundary } from '../state/lesson-state'
import App from '../App'
import { LessonStoreProvider, useLessonStore } from '../state/lesson-store'
import { WEBMCP_TOOL_CATALOGUE, WEBMCP_TOOL_NAMES } from './webmcp-catalogue'
import { detectWebMcp, registerCompleteWebMcpCatalogue, type WebMcpHandler, type WebMcpHandlers } from './webmcp-registration'
import { createProductionWebMcpHandlers, useWebMcp, type WebMcpStatus } from './use-webmcp'
import { WebMcpStatusIndicator } from './webmcp-status'

const handler = vi.fn(() => ({ ok: true }))
const completeHandlers = Object.fromEntries(WEBMCP_TOOL_NAMES.map((name) => [name, handler])) as WebMcpHandlers
const commands = () => createLessonCommandBoundary(createCleanDraft(), () => undefined)

function fakeContext(rejectAt = -1) {
  const active = new Set<string>()
  const calls: string[] = []
  const modelContext: ModelContext = { registerTool: vi.fn(async (tool, options) => {
    calls.push(tool.name)
    if (calls.length === rejectAt) throw new DOMException('duplicate or registration failure', 'InvalidStateError')
    if (active.has(tool.name)) throw new DOMException('duplicate', 'InvalidStateError')
    active.add(tool.name)
    options?.signal?.addEventListener('abort', () => active.delete(tool.name), { once: true })
    return undefined
  }) }
  return { modelContext, active, calls }
}

describe('WebMCP feature detection and registration', () => {
  it('is safe with an explicitly absent document and unsupported documents', () => {
    const untouchedGlobalDocument = document
    expect(detectWebMcp(null)).toEqual({ availability: 'unsupported' })
    expect(document).toBe(untouchedGlobalDocument)
    expect(detectWebMcp({} as Document)).toEqual({ availability: 'unsupported' })
  })

  it('distinguishes valid, malformed and inaccessible surfaces', () => {
    const { modelContext } = fakeContext()
    expect(detectWebMcp({ modelContext } as Document)).toEqual({ availability: 'supported', modelContext })
    expect(detectWebMcp({ modelContext: {} } as Document)).toEqual({ availability: 'malformed' })
    const inaccessible = {} as Document
    Object.defineProperty(inaccessible, 'modelContext', { get: () => { throw new Error('blocked') } })
    expect(detectWebMcp(inaccessible)).toEqual({ availability: 'malformed' })
  })

  it('registers zero tools when production supplies only two complete handlers', async () => {
    const fake = fakeContext()
    const production = createProductionWebMcpHandlers(commands())
    expect(Object.keys(production)).toEqual(['set_class_context', 'select_tangible_resources'])
    const result = await registerCompleteWebMcpCatalogue(fake.modelContext, production)
    expect(result).toMatchObject({ state: 'incomplete', registeredNames: [] })
    expect(fake.calls).toEqual([])
  })

  it('registers all five atomically in deterministic order with no exposedTo', async () => {
    const fake = fakeContext()
    const result = await registerCompleteWebMcpCatalogue(fake.modelContext, completeHandlers)
    expect(result.state).toBe('connected')
    expect(result.registeredNames).toEqual(WEBMCP_TOOL_NAMES)
    expect(fake.calls).toEqual(WEBMCP_TOOL_NAMES)
    for (const [index, call] of vi.mocked(fake.modelContext.registerTool).mock.calls.entries()) {
      expect(call[0]).toMatchObject({ name: WEBMCP_TOOL_NAMES[index], execute: handler })
      expect(call[0]).not.toHaveProperty('exposedTo')
      expect(call[1]?.signal).toBe(result.controller.signal)
    }
  })

  it('aborts and reports zero registered names after registration rejection', async () => {
    const fake = fakeContext(3)
    const result = await registerCompleteWebMcpCatalogue(fake.modelContext, completeHandlers)
    expect(result).toMatchObject({ state: 'error', registeredNames: [] })
    expect(result.controller.signal.aborted).toBe(true)
    expect(fake.active.size).toBe(0)
  })

  it('aborts a prior registration before replacing the same context', async () => {
    const fake = fakeContext()
    const first = await registerCompleteWebMcpCatalogue(fake.modelContext, completeHandlers)
    const second = await registerCompleteWebMcpCatalogue(fake.modelContext, completeHandlers)
    expect(first.controller.signal.aborted).toBe(true)
    expect(second.state).toBe('connected')
    expect(fake.active.size).toBe(5)
  })

  it('rejects incomplete or reordered catalogues before native registration', async () => {
    const fake = fakeContext()
    expect((await registerCompleteWebMcpCatalogue(fake.modelContext, completeHandlers, WEBMCP_TOOL_CATALOGUE.slice(0, 4))).state).toBe('incomplete')
    expect((await registerCompleteWebMcpCatalogue(fake.modelContext, completeHandlers, [...WEBMCP_TOOL_CATALOGUE].reverse())).state).toBe('incomplete')
    expect(fake.calls).toEqual([])
  })
})

describe('WebMCP accessible status UI', () => {
  it.each([
    ['unavailable', 'WebMCP unavailable in this browser. Manual Steps 1–7 remain available.'],
    ['incomplete', 'WebMCP available; integration incomplete. No tools are registered yet.'],
    ['registering', 'WebMCP available; registering all five tools.'],
    ['connected', 'WebMCP connected with all five approved tools.'],
    ['error', 'WebMCP available, but tool registration failed. Manual Steps 1–7 remain available.'],
  ] as const)('shows an honest %s state', (state, message) => {
    render(<WebMcpStatusIndicator status={{ state, message } as WebMcpStatus} />)
    expect(screen.getByRole('status')).toHaveTextContent(message)
  })

  it('shows supported-but-incomplete immediately and registers zero production tools', async () => {
    const fake = fakeContext()
    Object.defineProperty(document, 'modelContext', { configurable: true, value: fake.modelContext })
    const lessonCommands = commands()
    const { result } = renderHook(() => useWebMcp(lessonCommands), { wrapper: StrictMode })
    const initialStatus = result.current
    expect(result.current.message).toBe('WebMCP available; integration incomplete. No tools are registered yet.')
    await waitFor(() => expect(fake.calls).toEqual([]))
    expect(result.current).toBe(initialStatus)
    Reflect.deleteProperty(document, 'modelContext')
  })

  it('uses the latest teacher-edited state through the production command boundary', () => {
    Reflect.deleteProperty(document, 'modelContext')
    let productionHandler: WebMcpHandler | undefined
    function CaptureCommands() {
      const { getDraft, receiveChangeSet } = useLessonStore()
      productionHandler = createProductionWebMcpHandlers({ getDraft, receiveChangeSet }).set_class_context
      return null
    }
    render(<LessonStoreProvider><App /><CaptureCommands /></LessonStoreProvider>)
    fireEvent.change(screen.getByLabelText('Class size'), { target: { value: '16' } })
    let result: unknown
    act(() => {
      result = productionHandler?.({ stage: 'P4', classSize: 20, durationMinutes: 45, learningFocus: ['debugging'], subjectContext: 'literacy', teacherConfidence: 'beginner' }, { signal: new AbortController().signal })
    })
    expect(result).toMatchObject({ ok: true, stateChanged: true })
    const stored = JSON.parse(window.localStorage.getItem('tangible-coding-studio:mission-builder:draft:v1') ?? '{}')
    expect(stored.classContext.classSize).toBe(16)
    expect(stored.pendingChanges[0].operations[0].before.classSize).toBe(16)
  })

  it('cleans up and safely re-registers under React Strict Mode', async () => {
    const fake = fakeContext()
    Object.defineProperty(document, 'modelContext', { configurable: true, value: fake.modelContext })
    const lessonCommands = commands()
    function Harness() {
      const status = useWebMcp(lessonCommands, completeHandlers)
      return <WebMcpStatusIndicator status={status} />
    }
    const view = render(<StrictMode><Harness /></StrictMode>)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('connected with all five'))
    expect(fake.active.size).toBe(5)
    view.unmount()
    expect(fake.active.size).toBe(0)
    Reflect.deleteProperty(document, 'modelContext')
  })
})
