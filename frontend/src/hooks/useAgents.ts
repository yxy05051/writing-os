'use client'

import { useState, useCallback, useRef } from 'react'
import type { Agent, AgentStatus, WsMessage, Message } from '@/lib/types'
import { ALL_AGENT_STEPS, PIPELINE_STEPS } from '@/lib/types'

const INITIAL_AGENTS: Agent[] = PIPELINE_STEPS.map((step) => ({
  id: step.id,
  name: step.name,
  status: 'idle' as AgentStatus,
  output: undefined,
  messages: [],
}))

const AGENT_CATALOG = new Map(ALL_AGENT_STEPS.map((step) => [step.id, step]))

function createAgent(agentId: string): Agent {
  const step = AGENT_CATALOG.get(agentId)
  return {
    id: agentId,
    name: step?.name ?? agentId,
    status: 'idle',
    output: undefined,
    messages: [],
  }
}

function ensureAgents(prev: Agent[], agentIds: string[]): Agent[] {
  const existing = new Set(prev.map((agent) => agent.id))
  const additions = agentIds
    .filter((agentId) => agentId && !existing.has(agentId))
    .map(createAgent)
  return additions.length ? [...prev, ...additions] : prev
}

interface UseAgentsReturn {
  agents: Agent[]
  updateAgentStatus: (agentId: string, status: AgentStatus) => void
  syncPipelineAgent: (agentId: string | null | undefined, running: boolean) => void
  appendAgentMessage: (agentId: string, msg: Message) => void
  appendAgentStream: (agentId: string, chunk: string) => void
  handleWsMessage: (msg: WsMessage) => void
  resetAgents: () => void
  getAgent: (id: string) => Agent | undefined
}

export function useAgents(): UseAgentsReturn {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS)

  // Track the active streaming message without excessive state churn.
  const streamingRef = useRef<Record<string, string>>({})

  const updateAgentStatus = useCallback(
    (agentId: string, status: AgentStatus) => {
      setAgents((prev) => {
        const next = ensureAgents(prev, [agentId])
        return next.map((a) => (a.id === agentId ? { ...a, status } : a))
      })
    },
    []
  )

  const syncPipelineAgent = useCallback((agentId: string | null | undefined, running: boolean) => {
    setAgents((prev) => {
      const next = running && agentId ? ensureAgents(prev, [agentId]) : prev
      return next.map((agent) => {
        if (running && agent.id === agentId) return { ...agent, status: 'running' }
        if (!running && (agent.status === 'running' || agent.status === 'waiting' || agent.status === 'error')) {
          return { ...agent, status: 'idle', activityLog: [] }
        }
        if (running && agent.status === 'running') return { ...agent, status: 'done' }
        return agent
      })
    })
  }, [])

  const appendAgentMessage = useCallback(
    (agentId: string, msg: Message) => {
      setAgents((prev) => {
        const next = ensureAgents(prev, [agentId])
        return next.map((a) =>
          a.id === agentId
            ? { ...a, messages: [...a.messages, msg] }
            : a
        )
      })
    },
    []
  )

  /**
   * Append a streaming chunk to the agent's latest assistant message.
   * If the latest message is not from the assistant, create a new one.
   */
  const appendAgentStream = useCallback(
    (agentId: string, chunk: string) => {
      streamingRef.current[agentId] =
        (streamingRef.current[agentId] ?? '') + chunk

      setAgents((prev) => {
        const next = ensureAgents(prev, [agentId])
        return next.map((a) => {
          if (a.id !== agentId) return a

          const msgs = [...a.messages]
          const last = msgs[msgs.length - 1]

          if (last && last.role === 'assistant') {
            msgs[msgs.length - 1] = {
              ...last,
              content: last.content + chunk,
            }
          } else {
            msgs.push({
              role: 'assistant',
              content: chunk,
              timestamp: Date.now(),
            })
          }

          return { ...a, messages: msgs }
        })
      })
    },
    []
  )

  const handleWsMessage = useCallback(
    (msg: WsMessage) => {
      switch (msg.type) {
        case 'agent_stream':
          if (msg.agent && (msg.content || msg.chunk)) {
            appendAgentStream(msg.agent, msg.content ?? msg.chunk ?? '')
          }
          break

        case 'agent_status':
          if (msg.agent && msg.status) {
            updateAgentStatus(msg.agent, msg.status)
          }
          break

        case 'agent_activity':
          if (msg.agent && msg.message) {
            setAgents((prev) => {
              const next = ensureAgents(prev, [msg.agent as string])
              return next.map((a) =>
                a.id === msg.agent
                  ? {
                      ...a,
                      activityLog: [
                        ...(a.activityLog ?? []),
                        {
                          stage: msg.stage ?? 'working',
                          message: msg.message ?? '',
                          elapsedSeconds: msg.elapsed_seconds,
                          timestamp: Date.now(),
                        },
                      ].slice(-20),
                    }
                  : a
              )
            })
          }
          break

        case 'agent_output':
          if (msg.agent && msg.content) {
            setAgents((prev) => {
              const next = ensureAgents(prev, [msg.agent as string])
              return next.map((a) =>
                a.id === msg.agent ? { ...a, output: msg.content, status: 'done' } : a
              )
            })
          }
          break

        case 'pipeline_started':
          setAgents(INITIAL_AGENTS.map((a) => ({ ...a, output: undefined, messages: [], activityLog: [] })))
          streamingRef.current = {}
          break

        case 'pipeline_step':
          if (msg.agent) {
            setAgents((prev) => {
              const next = ensureAgents(prev, [msg.agent as string])
              return next.map((a) =>
                a.id === msg.agent
                  ? { ...a, status: 'running' }
                  : a.status === 'running'
                    ? { ...a, status: 'done' }
                    : a
              )
            })
          }
          break

        case 'pipeline_agent_done':
          if (msg.agent) {
            updateAgentStatus(msg.agent, 'done')
          }
          break

        case 'pipeline_handoff':
          setAgents((prev) => {
            const next = ensureAgents(prev, [msg.from_agent, msg.to_agent].filter(Boolean) as string[])
            return next.map((a) => {
              if (a.id === msg.from_agent) return { ...a, status: 'done' }
              if (a.id === msg.to_agent) return { ...a, status: 'running' }
              return a
            })
          })
          break

        case 'collaboration_status':
          if (msg.agents?.length) {
            setAgents((prev) => {
              const selected = new Set(msg.agents)
              const next = ensureAgents(prev, msg.agents ?? [])
              return next.map((a) =>
                selected.has(a.id)
                  ? { ...a, status: msg.status === 'running' ? 'running' : a.status }
                  : a
              )
            })
          }
          break

        case 'collaboration_done':
          if (msg.agents?.length) {
            setAgents((prev) => {
              const selected = new Set(msg.agents)
              const next = ensureAgents(prev, msg.agents ?? [])
              return next.map((a) => (selected.has(a.id) && a.status === 'running' ? { ...a, status: 'done' } : a))
            })
          }
          break

        case 'pipeline_done':
          setAgents((prev) =>
            prev.map((a) => (a.status === 'running' ? { ...a, status: 'done' } : a))
          )
          break

        case 'agent_error':
        case 'pipeline_error':
          if (msg.agent) {
            updateAgentStatus(msg.agent, 'error')
          }
          break

        case 'pipeline_status':
          // Global pipeline state updates can be handled here.
          break

        case 'error':
          if (msg.agent) {
            updateAgentStatus(msg.agent, 'error')
          }
          break
      }
    },
    [appendAgentStream, updateAgentStatus]
  )

  const resetAgents = useCallback(() => {
    setAgents(INITIAL_AGENTS.map((a) => ({ ...a, messages: [], activityLog: [] })))
    streamingRef.current = {}
  }, [])

  const getAgent = useCallback(
    (id: string) => agents.find((a) => a.id === id),
    [agents]
  )

  return {
    agents,
    updateAgentStatus,
    syncPipelineAgent,
    appendAgentMessage,
    appendAgentStream,
    handleWsMessage,
    resetAgents,
    getAgent,
  }
}
