import { useEffect, useMemo, useState } from 'react'
import type { LessonCommandBoundary } from '../state/lesson-state'
import { createSetClassContextHandler } from './set-class-context'
import { createSelectTangibleResourcesHandler } from './select-tangible-resources'
import { createBuildTangibleMissionHandler } from './build-tangible-mission'
import { createAdaptForLearnersHandler } from './adapt-for-learners'
import { detectWebMcp, hasCompleteHandlers, registerCompleteWebMcpCatalogue, type WebMcpConnectionState, type WebMcpHandlers } from './webmcp-registration'

export interface WebMcpStatus { state: WebMcpConnectionState; message: string }

const messages: Record<WebMcpConnectionState, string> = {
  unavailable: 'WebMCP unavailable in this browser. Manual Steps 1–7 remain available.',
  incomplete: 'WebMCP available; integration incomplete. No tools are registered yet.',
  registering: 'WebMCP available; registering all five tools.',
  connected: 'WebMCP connected with all five approved tools.',
  error: 'WebMCP available, but tool registration failed. Manual Steps 1–7 remain available.',
}
const malformedMessage = 'WebMCP was detected, but its registration surface is inaccessible or malformed. Manual Steps 1–7 remain available.'

type WebMcpLessonCommands = Pick<LessonCommandBoundary, 'getDraft' | 'receiveChangeSet'>

export function createProductionWebMcpHandlers(commands: WebMcpLessonCommands): WebMcpHandlers {
  return {
    set_class_context: createSetClassContextHandler({
      getDraft: commands.getDraft,
      receiveChangeSet: commands.receiveChangeSet,
      createId: () => crypto.randomUUID(),
      now: () => new Date().toISOString(),
    }),
    select_tangible_resources: createSelectTangibleResourcesHandler({
      getDraft: commands.getDraft,
      receiveChangeSet: commands.receiveChangeSet,
      createId: () => crypto.randomUUID(),
      now: () => new Date().toISOString(),
    }),
    build_tangible_mission: createBuildTangibleMissionHandler({
      getDraft: commands.getDraft,
      receiveChangeSet: commands.receiveChangeSet,
      createId: () => crypto.randomUUID(),
      now: () => new Date().toISOString(),
    }),
    adapt_for_learners: createAdaptForLearnersHandler({
      getDraft: commands.getDraft,
      receiveChangeSet: commands.receiveChangeSet,
      createId: () => crypto.randomUUID(),
      now: () => new Date().toISOString(),
    }),
  }
}

export function useWebMcp(commands: WebMcpLessonCommands, injectedHandlers?: WebMcpHandlers): WebMcpStatus {
  const productionHandlers = useMemo<WebMcpHandlers>(() => ({
    ...createProductionWebMcpHandlers(commands),
  }), [commands])
  const handlers = injectedHandlers ?? productionHandlers
  const detection = useMemo(() => detectWebMcp(typeof document === 'undefined' ? null : document), [])
  const [status, setStatus] = useState<WebMcpStatus>(() => detection.availability === 'unsupported'
    ? { state: 'unavailable', message: messages.unavailable }
    : detection.availability === 'malformed'
      ? { state: 'error', message: malformedMessage }
      : hasCompleteHandlers(handlers)
        ? { state: 'registering', message: messages.registering }
        : { state: 'incomplete', message: messages.incomplete })

  useEffect(() => {
    if (detection.availability !== 'supported' || !detection.modelContext) return
    if (!hasCompleteHandlers(handlers)) return
    let active = true
    const controller = new AbortController()
    void registerCompleteWebMcpCatalogue(detection.modelContext, handlers, undefined, controller).then((result) => {
      if (!active) { controller.abort(); return }
      setStatus({ state: result.state, message: messages[result.state] })
    })
    return () => { active = false; controller.abort() }
  }, [detection, handlers])

  return status
}
