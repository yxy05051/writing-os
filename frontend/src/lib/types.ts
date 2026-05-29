export type AgentStatus = 'idle' | 'running' | 'done' | 'error' | 'waiting'

export interface Agent {
  id: string
  name: string
  status: AgentStatus
  output?: string
  messages: Message[]
  activityLog?: AgentActivity[]
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface AgentActivity {
  stage: string
  message: string
  elapsedSeconds?: number
  timestamp: number
}

export type ArticleStatus =
  | 'pending'
  | 'in_progress'
  | 'draft'
  | 'imported'
  | 'finalized'
  | 'draft_ready'

export interface CollaborationItem {
  id: string
  agent: string
  type: 'critique' | 'task' | 'decision' | 'summary'
  target?: string
  severity?: 'low' | 'medium' | 'high'
  content: string
  createdAt: string
}

export interface CollaborationState {
  log: CollaborationItem[]
  outputs?: Record<string, string>
  lastInstruction?: string
  activeAgents?: string[]
  frozen?: boolean
}

export interface ArticleState {
  num: number
  title?: string
  draft?: string
  draftHtml?: string
  finalDraft?: string
  agentOutputs?: Record<string, string>
  plannedTopic?: string
  plannedOutline?: string
  collaboration?: CollaborationState
  status: ArticleStatus
  wordCount?: number
  imported?: boolean
  officialPublished?: boolean
  officialPublishedAt?: string
  finalIntegrationSummary?: string
}

export interface WritingState {
  currentArticle: number
  completed: number[]
  articles: Record<number, ArticleState>
  coveredConcepts: string[]
  agentSettings: AgentSettings
  pipeline?: PipelineRuntimeState
}

export interface AgentSettings {
  requiredPipelineAgents: string[]
  enabledCollaborationAgents: string[]
  maxCollaborationAgents: number
}

export interface PipelineRuntimeState {
  running: boolean
  articleNum?: number | null
  currentAgent?: string | null
  currentStep?: number | null
  total?: number | null
}

export interface CollaborationInstructionResponse {
  status: 'started' | 'pipeline_started'
  mode?: 'collaboration' | 'pipeline'
  articleNum: number
}

export interface ConfirmPublishedResponse {
  status: 'official_published'
  articleNum: number
  nextArticleNum: number
}

export type ViewType = 'system' | 'editor' | 'curriculum'

export type WsMessageType =
  | 'agent_stream'
  | 'agent_status'
  | 'agent_output'
  | 'agent_error'
  | 'agent_activity'
  | 'collaboration_status'
  | 'collaboration_done'
  | 'pipeline_started'
  | 'pipeline_step'
  | 'pipeline_agent_done'
  | 'pipeline_handoff'
  | 'pipeline_done'
  | 'pipeline_error'
  | 'pipeline_status'
  | 'error'

export interface WsMessage {
  type: WsMessageType
  agent?: string
  content?: string
  chunk?: string
  status?: AgentStatus
  step?: number
  total?: number
  error?: string
  stage?: string
  elapsed_seconds?: number
  articleNum?: number
  article_num?: number
  from_agent?: string
  to_agent?: string
  agents?: string[]
  message?: string
}

export interface PipelineStep {
  id: string
  name: string
  icon: string
  order: number
}

export const PIPELINE_STEPS: PipelineStep[] = [
  { id: 'research', name: 'Research', icon: 'R', order: 0 },
  { id: 'structure', name: 'Structure', icon: 'S', order: 1 },
  { id: 'writer', name: 'Writing', icon: 'W', order: 2 },
  { id: 'final_editor', name: 'Final editor', icon: 'E', order: 3 },
]

export const OPTIONAL_AGENT_STEPS: PipelineStep[] = [
  { id: 'reader_sim', name: 'Reader simulation', icon: 'U', order: 10 },
  { id: 'fact_check', name: 'Fact check', icon: 'F', order: 11 },
  { id: 'style', name: 'Style editor', icon: 'T', order: 12 },
  { id: 'reviewer', name: 'Review editor', icon: 'V', order: 13 },
  { id: 'growth', name: 'Growth', icon: 'G', order: 14 },
  { id: 'distributor', name: 'Distribution', icon: 'D', order: 15 },
]

export const ALL_AGENT_STEPS: PipelineStep[] = [
  ...PIPELINE_STEPS,
  ...OPTIONAL_AGENT_STEPS,
]

export const AGENT_STATUS_COLOR: Record<AgentStatus, string> = {
  idle: '#555555',
  running: '#10b981',
  done: '#7c3aed',
  error: '#ef4444',
  waiting: '#f59e0b',
}

export const AGENT_STATUS_LABEL: Record<AgentStatus, string> = {
  idle: 'Idle',
  running: 'Running',
  done: 'Done',
  error: 'Error',
  waiting: 'Waiting',
}
