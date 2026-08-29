import { describe, expect, it } from 'vitest'
import { isWebMcpInvocationAborted } from './webmcp-execution'

describe('WebMCP invocation context interoperability', () => {
  it('treats absent context, absent signal and a live signal as not aborted', () => {
    expect(isWebMcpInvocationAborted()).toBe(false)
    expect(isWebMcpInvocationAborted({})).toBe(false)
    expect(isWebMcpInvocationAborted({ signal: new AbortController().signal })).toBe(false)
  })

  it('recognises an explicitly aborted supplied signal', () => {
    const controller = new AbortController()
    controller.abort()
    expect(isWebMcpInvocationAborted({ signal: controller.signal })).toBe(true)
  })
})
