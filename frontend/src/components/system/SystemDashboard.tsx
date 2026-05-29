'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { deleteCollaborationLog, runFinalEditor, saveAgentSettings, sendCollaborationInstruction } from '@/lib/api'
import type { Agent, AgentSettings, AgentStatus, ArticleState } from '@/lib/types'
import { AGENT_STATUS_COLOR, AGENT_STATUS_LABEL, ALL_AGENT_STEPS, OPTIONAL_AGENT_STEPS, PIPELINE_STEPS } from '@/lib/types'

interface SystemDashboardProps {
  agents: Agent[]
  articleNum: number
  articleState?: ArticleState
  agentSettings?: AgentSettings
  onArticleSaved?: () => void
  onAgentSettingsSaved?: () => void
  onArticleChange?: (articleNum: number) => void
  onOpenEditor?: () => void
}

const statusCopy: Record<AgentStatus, string> = {
  running: 'Working',
  idle: 'Off desk',
  waiting: 'Waiting',
  done: 'Delivered',
  error: 'Blocked',
}

const statusShort: Record<AgentStatus, string> = {
  running: 'WORK',
  idle: 'REST',
  waiting: 'WAIT',
  done: 'DONE',
  error: 'STUCK',
}

const responsibilities: Record<string, string> = {
  research: 'Clarify the core concepts, useful examples, risks, and follow-up angles for the article.',
  structure: 'Turn research material into a coherent reader path and article outline.',
  writer: 'Write a complete draft from the research brief and structure brief.',
  reader_sim: 'Simulate target readers and point out confusion, friction, or likely misreadings.',
  fact_check: 'Check factual claims, boundaries, risks, and wording that needs caution.',
  style: 'Improve clarity, rhythm, and human voice.',
  reviewer: 'Review the main argument, editorial choices, and publishability.',
  growth: 'Review the opening, title energy, shareability, and reader motivation.',
  distributor: 'Create publishing assets, summaries, and distribution angles.',
  final_editor: 'Integrate useful agent handoffs into a polished final draft.',
}

const AGENTS_PER_FLOOR = 4
const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  requiredPipelineAgents: ['research', 'structure', 'writer', 'final_editor'],
  enabledCollaborationAgents: ['structure', 'writer', 'reader_sim', 'fact_check', 'style', 'reviewer'],
  maxCollaborationAgents: 2,
}
const coreAgentIds = PIPELINE_STEPS.map((step) => step.id)
const agentCatalog = new Map(ALL_AGENT_STEPS.map((step) => [step.id, step]))
const optionalCollaborationSteps = OPTIONAL_AGENT_STEPS.filter((step) => step.id !== 'final_editor')

function createDisplayAgent(agentId: string, status: AgentStatus = 'idle'): Agent {
  const step = agentCatalog.get(agentId)
  return {
    id: agentId,
    name: step?.name ?? agentId,
    status,
    messages: [],
  }
}

function chunkAgents(agents: Agent[]): Agent[][] {
  const floors: Agent[][] = []
  for (let i = 0; i < agents.length; i += AGENTS_PER_FLOOR) {
    floors.push(agents.slice(i, i + AGENTS_PER_FLOOR))
  }
  return floors.length ? floors : [[]]
}

function getFloorLabel(index: number): string {
  return `Floor ${index + 1}`
}

function buildDeliverySummary(agent: Agent, content: string): string {
  if (!content) return 'No delivery yet.'
  const headings = content
    .split('\n')
    .map((line) => line.replace(/^#+\s*/, '').trim())
    .filter((line) => line.length > 0 && line.length < 42)
    .slice(0, 3)
  if (headings.length > 0) {
    return `Delivered ${content.length} characters. Key points: ${headings.join('; ')}.`
  }
  return `Delivered ${content.length} characters. Read the full content below.`
}

function getAgentContent(agent: Agent, articleState?: ArticleState): string {
  const collaborationContent = articleState?.collaboration?.log
    ?.filter((item) => item.agent === agent.id)
    .map((item) => item.content)
    .filter(Boolean)
    .join('\n\n---\n\n')

  return (
    articleState?.agentOutputs?.[agent.id]
    || agent.output
    || agent.messages[agent.messages.length - 1]?.content
    || articleState?.collaboration?.outputs?.[agent.id]
    || collaborationContent
    || ''
  )
}

function getAgentActivityText(agent?: Agent): string {
  if (!agent?.activityLog?.length) return ''
  if (agent.status !== 'running' && agent.status !== 'error') return ''
  return agent.activityLog
    .slice()
    .reverse()
    .map((activity) => {
      const elapsed = activity.elapsedSeconds !== undefined ? ` +${activity.elapsedSeconds}s` : ''
      return `[${activity.stage}${elapsed}] ${activity.message}`
    })
    .join('\n')
}

function AgentDesk({
  agent,
  articleState,
  selected,
  onSelect,
}: {
  agent: Agent
  articleState?: ArticleState
  selected: boolean
  onSelect: () => void
}) {
  const latest = getAgentContent(agent, articleState)
  const isRunning = agent.status === 'running'
  const isError = agent.status === 'error'
  const hasOutput = Boolean(latest)

  return (
    <section
      className={`office-cubicle office-cubicle-${agent.status}${selected ? ' is-selected' : ''}`}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      <div className="office-wall">
        <span className="office-nameplate">{agent.name}</span>
        <span className="office-status-light" style={{ background: AGENT_STATUS_COLOR[agent.status] }} />
      </div>
      <div className="office-room">
        <div className="office-window">
          <span />
          <span />
        </div>
        <div className="office-person-wrap">
          <span className="office-chair" />
          <div className={isRunning ? 'office-person is-typing' : isError ? 'office-person is-stuck' : 'office-person'}>
            <span className="office-head" />
            <span className="office-neck" />
            <span className="office-body" />
            <span className="office-arm left" />
            <span className="office-arm right" />
            <span className="office-leg left" />
            <span className="office-leg right" />
          </div>
        </div>

        <div className="office-furniture">
          <div className={`office-monitor-screen${hasOutput ? ' has-output' : ''}`}>
            {hasOutput ? 'FILE' : statusShort[agent.status]}
          </div>
          <span className="office-monitor-stand" />
          <span className="office-keyboard" />
          <span className="office-paper-stack" />
          <div className="office-desk-surface" />
          <span className="office-desk-leg left" />
          <span className="office-desk-leg right" />
        </div>
      </div>

      <div className="office-cubicle-footer">
        <span style={{ color: AGENT_STATUS_COLOR[agent.status] }}>
          {statusCopy[agent.status]} · {AGENT_STATUS_LABEL[agent.status]}
        </span>
        <span>{statusShort[agent.status]}</span>
      </div>

      <div className="office-monitor-note">
        {latest ? latest.slice(0, 120) : 'No file yet. Standing by.'}
      </div>
    </section>
  )
}

export default function SystemDashboard({
  agents,
  articleNum,
  articleState,
  agentSettings,
  onArticleSaved,
  onAgentSettingsSaved,
  onArticleChange,
  onOpenEditor,
}: SystemDashboardProps) {
  const [instruction, setInstruction] = useState('')
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState('research')
  const [activeFloor, setActiveFloor] = useState(0)
  const [showComputerBrief, setShowComputerBrief] = useState(false)
  const [isDeletingLog, setIsDeletingLog] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [localAgentSettings, setLocalAgentSettings] = useState<AgentSettings>(agentSettings ?? DEFAULT_AGENT_SETTINGS)
  const [isSavingAgentSettings, setIsSavingAgentSettings] = useState(false)
  const [agentSettingsStatus, setAgentSettingsStatus] = useState('')
  const frozen = Boolean(articleState?.officialPublished || articleState?.collaboration?.frozen)
  const collaborationLog = articleState?.collaboration?.log ?? []

  useEffect(() => {
    setLocalAgentSettings(agentSettings ?? DEFAULT_AGENT_SETTINGS)
  }, [agentSettings])

  const displayAgents = useMemo(() => {
    const activeAgentIds = articleState?.collaboration?.activeAgents ?? []
    const outputAgentIds = Object.keys(articleState?.agentOutputs ?? {}).filter((agentId) => !coreAgentIds.includes(agentId))
    const collaborationOutputAgentIds = Object.keys(articleState?.collaboration?.outputs ?? {})
    const logAgentIds = articleState?.collaboration?.log
      ?.map((item) => item.agent)
      .filter((agentId) => agentId && agentId !== 'system') ?? []
    const liveOptionalAgentIds = agents
      .map((agent) => agent.id)
      .filter((agentId) => !coreAgentIds.includes(agentId))
    const participatedAgentIds = Array.from(new Set([
        ...activeAgentIds,
        ...liveOptionalAgentIds,
        ...logAgentIds,
        ...collaborationOutputAgentIds,
        ...outputAgentIds,
      ])).filter((agentId) => !coreAgentIds.includes(agentId))
    const optionalAgents = participatedAgentIds
      .map((agentId) =>
        agents.find((agent) => agent.id === agentId) ??
        createDisplayAgent(
          agentId,
          activeAgentIds.includes(agentId) ? 'running' : 'done'
        )
      )
    const coreAgents = coreAgentIds
      .map((agentId) => agents.find((agent) => agent.id === agentId) ?? createDisplayAgent(agentId))
    return [...coreAgents, ...optionalAgents]
  }, [
    agents,
    articleState?.agentOutputs,
    articleState?.collaboration?.activeAgents,
    articleState?.collaboration?.log,
    articleState?.collaboration?.outputs,
  ])

  const agentFloors = useMemo(() => chunkAgents(displayAgents), [displayAgents])
  const visibleFloorIndex = Math.min(activeFloor, agentFloors.length - 1)
  const visibleAgents = agentFloors[visibleFloorIndex] ?? []
  const selectedAgent = displayAgents.find((agent) => agent.id === selectedAgentId) ?? displayAgents[0]
  const selectedAgentContent = selectedAgent ? getAgentContent(selectedAgent, articleState) : ''
  const selectedAgentActivity = getAgentActivityText(selectedAgent)
  const finalDraft = articleState?.finalDraft ?? articleState?.draftHtml ?? ''
  const canRunFinalEditor = Boolean(articleState?.agentOutputs?.writer && !articleState?.officialPublished)
  const enabledAgentSet = useMemo(
    () => new Set(localAgentSettings.enabledCollaborationAgents),
    [localAgentSettings.enabledCollaborationAgents]
  )

  const summary = useMemo(() => {
    const running = displayAgents.filter((agent) => agent.status === 'running').length
    const error = displayAgents.filter((agent) => agent.status === 'error').length
    return { running, error, resting: displayAgents.length - running - error }
  }, [displayAgents])

  const handleSubmit = async () => {
    if (!instruction.trim()) return
    setIsSubmitting(true)
    setStatus('')
    try {
      const response = await sendCollaborationInstruction(articleNum, instruction.trim())
      setInstruction('')
      if (response.articleNum !== articleNum) {
        onArticleChange?.(response.articleNum)
      }
      setStatus(
        response.mode === 'pipeline'
          ? `Started Article ${String(response.articleNum).padStart(3, '0')}.`
          : 'Instruction sent. Writing OS is assigning agents.'
      )
      onArticleSaved?.()
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Failed to send instruction')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClearLog = async () => {
    if (collaborationLog.length === 0) return
    setIsDeletingLog(true)
    setStatus('')
    try {
      await deleteCollaborationLog(articleNum)
      setStatus('Collaboration log deleted.')
      onArticleSaved?.()
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Failed to delete collaboration log')
    } finally {
      setIsDeletingLog(false)
    }
  }

  const handleFinalEditor = async () => {
    setIsFinalizing(true)
    setStatus('')
    try {
      await runFinalEditor(articleNum)
      setSelectedAgentId('final_editor')
      setStatus('Final editor started. The integrated draft will be written into the editor.')
      onArticleSaved?.()
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Failed to start final editor')
    } finally {
      setIsFinalizing(false)
    }
  }

  const toggleCollaborationAgent = (agentId: string) => {
    setAgentSettingsStatus('')
    setLocalAgentSettings((settings) => {
      const enabled = new Set(settings.enabledCollaborationAgents)
      if (enabled.has(agentId)) {
        enabled.delete(agentId)
      } else {
        enabled.add(agentId)
      }
      const nextEnabled = Array.from(enabled)
      return {
        ...settings,
        enabledCollaborationAgents: nextEnabled.length ? nextEnabled : ['reviewer'],
      }
    })
  }

  const handleSaveAgentSettings = async () => {
    setIsSavingAgentSettings(true)
    setAgentSettingsStatus('')
    try {
      const saved = await saveAgentSettings(localAgentSettings)
      setLocalAgentSettings(saved)
      setAgentSettingsStatus('Agent settings saved.')
      onAgentSettingsSaved?.()
    } catch (e) {
      setAgentSettingsStatus(e instanceof Error ? e.message : 'Failed to save agent settings')
    } finally {
      setIsSavingAgentSettings(false)
    }
  }

  return (
    <div className="system-board">
      <section className="office-band">
        <div className="office-header">
          <div>
            <h1 className="office-title">Agent Office</h1>
            <p className="office-subtitle">
              Article {String(articleNum).padStart(3, '0')} · See who is working, resting, or blocked
            </p>
          </div>
          <div className="office-stats">
            <StatusPill label="Working" value={summary.running} color="var(--accent-green)" />
            <StatusPill label="Resting" value={summary.resting} color="var(--text-disabled)" />
            <StatusPill label="Blocked" value={summary.error} color="var(--accent-red)" />
          </div>
        </div>

        {frozen && (
          <div className="office-freeze-banner">
            This article is published and frozen. Manual editor changes are preserved, but Agents will not intervene.
          </div>
        )}

        <div className="office-floor-layout">
          <div className="office-floor-stack">
            {agentFloors.length > 1 && (
              <div className="office-floor-tabs" aria-label="Agent floors">
                {agentFloors.map((floorAgents, index) => {
                  const hasRunning = floorAgents.some((agent) => agent.status === 'running')
                  const hasError = floorAgents.some((agent) => agent.status === 'error')
                  return (
                    <button
                      key={index}
                      type="button"
                      className={`office-floor-tab${index === visibleFloorIndex ? ' is-active' : ''}`}
                      onClick={() => setActiveFloor(index)}
                    >
                      <span
                        className="office-floor-tab-light"
                        style={{
                          background: hasError
                            ? 'var(--accent-red)'
                            : hasRunning
                              ? 'var(--accent-green)'
                              : 'var(--text-disabled)',
                        }}
                      />
                      {getFloorLabel(index)}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="office-floor">
              {visibleAgents.map((agent) => (
                <AgentDesk
                  key={agent.id}
                  agent={agent}
                  articleState={articleState}
                  selected={agent.id === selectedAgentId}
                  onSelect={() => setSelectedAgentId(agent.id)}
                />
              ))}

              {Array.from({ length: Math.max(0, AGENTS_PER_FLOOR - visibleAgents.length) }).map((_, index) => (
                <div key={`empty-${index}`} className="office-cubicle office-cubicle-empty">
                  <div className="office-wall">
                    <span className="office-nameplate">Empty desk</span>
                    <span className="office-status-light" style={{ background: 'var(--text-disabled)' }} />
                  </div>
                  <div className="office-empty-room">Standby</div>
                </div>
              ))}
            </div>
          </div>

          <aside className="agent-computer-panel">
            <div className="agent-computer-top">
            <div>
                <span className="agent-computer-kicker">AGENT COMPUTER</span>
                <h2>{selectedAgent?.name ?? 'Agent'} computer</h2>
              </div>
              <span
                className="agent-computer-status"
                style={{ color: selectedAgent ? AGENT_STATUS_COLOR[selectedAgent.status] : undefined }}
              >
                {selectedAgent ? AGENT_STATUS_LABEL[selectedAgent.status] : 'Idle'}
              </span>
            </div>

            {selectedAgent && (
              <div className={`agent-computer-brief${showComputerBrief ? ' is-expanded' : ''}`}>
                <div>
                  <strong>Role</strong>
                  <p>{responsibilities[selectedAgent.id] ?? 'Complete the assigned writing task.'}</p>
                </div>
                <div>
                  <strong>Delivery summary</strong>
                  <p>{buildDeliverySummary(selectedAgent, selectedAgentContent)}</p>
                </div>
                <button
                  type="button"
                  className="agent-computer-toggle"
                  onClick={() => setShowComputerBrief((value) => !value)}
                >
                  {showComputerBrief ? 'Collapse' : 'Expand'}
                </button>
              </div>
            )}

            <div className="agent-computer-screen">
              {selectedAgentContent ? (
                <pre>{selectedAgentContent}</pre>
              ) : selectedAgentActivity ? (
                <pre className="agent-activity-log">{selectedAgentActivity}</pre>
              ) : (
                <div className="agent-computer-empty">
                  {articleState?.plannedTopic
                    ? `Article plan: ${articleState.plannedTopic}\nWhen an agent starts, its activity appears here. After delivery, this switches to the delivered file.`
                    : 'This computer has no delivered file yet. Agent activity will appear here once work starts.'}
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>

      <section className="collab-workspace">
        <main className="collab-log-panel">
          <div className="final-draft-card">
            <div>
              <span>Final draft</span>
              <strong>
                {articleState?.agentOutputs?.final_editor
                  ? 'Integrated final draft generated'
                  : finalDraft
                    ? 'Current draft available'
                    : 'Waiting for writing delivery'}
              </strong>
              <p>
                {articleState?.agentOutputs?.final_editor
                  ? 'The integrated draft has been written into the editor for manual adjustment.'
                  : finalDraft
                    ? 'The editor contains the current generated draft, but it has not been integrated by the final editor yet.'
                    : 'The final draft entry will become available after the writing agent delivers.'}
              </p>
            </div>
            <div className="final-draft-actions">
              <button className="btn btn-secondary" onClick={onOpenEditor} disabled={!finalDraft}>
                Open editor
              </button>
              <button
                className="btn btn-primary"
                onClick={handleFinalEditor}
                disabled={!canRunFinalEditor || isFinalizing}
              >
                {isFinalizing ? 'Integrating...' : 'Run final editor'}
              </button>
            </div>
          </div>

          <div className="collab-section-head">
            <div>
              <h2>Collaboration Log</h2>
              <p>Roundtable reviews, revision suggestions, and errors appear here.</p>
            </div>
            <div className="collab-log-tools">
              <span>{collaborationLog.length} items</span>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleClearLog}
                disabled={collaborationLog.length === 0 || isDeletingLog}
              >
                Delete log
              </button>
            </div>
          </div>

          <div className="collab-log-list">
            {collaborationLog.length === 0 ? (
              <div className="collab-empty">
                No collaboration log yet. Send a general instruction on the right, such as "Review this from reader clarity, factual accuracy, and style."
              </div>
            ) : (
              collaborationLog.slice().reverse().map((item) => (
                <article key={item.id} className="collab-log-card">
                  <div className="collab-log-meta">
                    <strong>{item.agent}</strong>
                    <span>{item.type}</span>
                  </div>
                  <div className="collab-log-content">{item.content}</div>
                </article>
              ))
            )}
          </div>
        </main>

        <aside className="collab-command-panel">
          <div className="collab-section-head compact">
            <div>
              <h2>General Instruction</h2>
              <p>Enter creates a new line. Ctrl + Enter sends.</p>
            </div>
          </div>

          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault()
                handleSubmit()
              }
            }}
            disabled={isSubmitting}
            placeholder={
              frozen
                ? 'This article is published and frozen. You can still send system-level instructions such as "start article 2".'
                : 'Use numbered instructions if helpful. Enter creates a new line; Ctrl + Enter sends to the collaboration system.'
            }
            className="collab-command-input"
          />

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
            onClick={handleSubmit}
            disabled={isSubmitting || !instruction.trim()}
          >
            {isSubmitting ? 'Assigning...' : 'Ctrl + Enter Send'}
          </button>

          {status && (
            <div
              className="collab-command-status"
              style={{
                color:
                  status.includes('Failed') || status.includes('409')
                    ? 'var(--accent-red)'
                    : 'var(--text-secondary)',
              }}
            >
              {status}
            </div>
          )}

          <div className="agent-settings-panel">
            <div className="agent-settings-head">
              <div>
                <h3>Agent Settings</h3>
                <p>Core pipeline always uses Research, Structure, Writing, and Final editor.</p>
              </div>
              <span>{localAgentSettings.maxCollaborationAgents} max</span>
            </div>

            <label className="agent-settings-slider">
              <span>Max specialist agents per round</span>
              <input
                type="range"
                min={1}
                max={4}
                value={localAgentSettings.maxCollaborationAgents}
                onChange={(e) => {
                  setAgentSettingsStatus('')
                  setLocalAgentSettings((settings) => ({
                    ...settings,
                    maxCollaborationAgents: Number(e.target.value),
                  }))
                }}
              />
            </label>

            <div className="agent-settings-list">
              {optionalCollaborationSteps.map((step) => (
                <label key={step.id} className="agent-settings-row">
                  <input
                    type="checkbox"
                    checked={enabledAgentSet.has(step.id)}
                    onChange={() => toggleCollaborationAgent(step.id)}
                  />
                  <span>{step.name}</span>
                </label>
              ))}
            </div>

            <button
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
              onClick={handleSaveAgentSettings}
              disabled={isSavingAgentSettings}
            >
              {isSavingAgentSettings ? 'Saving...' : 'Save agent settings'}
            </button>

            {agentSettingsStatus && (
              <div
                className="collab-command-status"
                style={{
                  color: agentSettingsStatus.includes('Failed') || agentSettingsStatus.includes('[API')
                    ? 'var(--accent-red)'
                    : 'var(--text-secondary)',
                }}
              >
                {agentSettingsStatus}
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  )
}

function StatusPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="office-pill">
      <span style={{ color }}>{value}</span>
      {label}
    </div>
  )
}
