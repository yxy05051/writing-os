import type {
  ArticleState,
  CollaborationInstructionResponse,
  CollaborationState,
  ConfirmPublishedResponse,
  WritingState,
} from './types'

export interface PlanPreviewArticle {
  num: number
  title: string
  full_title: string
  goal: string
  tree_position: string
}

export interface PlanPreviewResponse {
  status?: string
  article_count: number
  article_numbers: number[]
  articles: PlanPreviewArticle[]
  path?: string
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`[API ${res.status}] ${path}: ${text}`)
  }

  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

function normalizeArticle(raw: Record<string, unknown>, fallbackNum: number): ArticleState {
  const agentOutputs = raw.agent_outputs ?? raw.agentOutputs
  const collaboration = raw.collaboration as Record<string, unknown> | undefined
  return {
    num: Number(raw.num ?? raw.article_num ?? fallbackNum),
    title: raw.title as string | undefined,
    draft: raw.draft as string | undefined,
    draftHtml: (raw.draft_html ?? raw.draftHtml) as string | undefined,
    finalDraft: (raw.final_draft ?? raw.finalDraft) as string | undefined,
    agentOutputs: agentOutputs as Record<string, string> | undefined,
    plannedTopic: (raw.planned_topic ?? raw.plannedTopic) as string | undefined,
    plannedOutline: (raw.planned_outline ?? raw.plannedOutline) as string | undefined,
    collaboration: collaboration
      ? {
          log: ((collaboration.log as unknown[]) ?? []).map((item) => {
            const row = item as Record<string, unknown>
            return {
              id: String(row.id ?? crypto.randomUUID()),
              agent: String(row.agent ?? 'system'),
              type: (row.type as CollaborationState['log'][number]['type']) ?? 'summary',
              target: row.target as string | undefined,
              severity: row.severity as CollaborationState['log'][number]['severity'],
              content: String(row.content ?? ''),
              createdAt: String(row.created_at ?? row.createdAt ?? ''),
            }
          }),
          outputs: collaboration.outputs as Record<string, string> | undefined,
          lastInstruction: collaboration.last_instruction as string | undefined,
          activeAgents: collaboration.active_agents as string[] | undefined,
          frozen: Boolean(collaboration.frozen),
        }
      : undefined,
    status: (raw.status as ArticleState['status']) ?? 'pending',
    wordCount: (raw.word_count ?? raw.wordCount) as number | undefined,
    imported: Boolean(raw.imported),
    officialPublished: Boolean(raw.official_published ?? raw.officialPublished),
    officialPublishedAt: (raw.official_published_at ?? raw.officialPublishedAt) as string | undefined,
    finalIntegrationSummary: (raw.final_integration_summary ?? raw.finalIntegrationSummary) as string | undefined,
  }
}

export async function fetchState(): Promise<WritingState> {
  const raw = await request<Record<string, unknown>>('/state')
  const rawArticles = (raw.articles as Record<string, Record<string, unknown>>) ?? {}
  const articles = Object.fromEntries(
    Object.entries(rawArticles).map(([num, article]) => [
      Number(num),
      normalizeArticle(article, Number(num)),
    ])
  ) as WritingState['articles']

  return {
    currentArticle: (raw.current_article as number) ?? 1,
    completed: (raw.completed as number[]) ?? [],
    articles,
    coveredConcepts: (raw.covered_concepts as string[]) ?? [],
    pipeline: raw.pipeline
      ? {
          running: Boolean((raw.pipeline as Record<string, unknown>).running),
          articleNum: ((raw.pipeline as Record<string, unknown>).article_num
            ?? (raw.pipeline as Record<string, unknown>).articleNum) as number | null | undefined,
          currentAgent: ((raw.pipeline as Record<string, unknown>).current_agent
            ?? (raw.pipeline as Record<string, unknown>).currentAgent) as string | null | undefined,
          currentStep: ((raw.pipeline as Record<string, unknown>).current_step
            ?? (raw.pipeline as Record<string, unknown>).currentStep) as number | null | undefined,
          total: (raw.pipeline as Record<string, unknown>).total as number | null | undefined,
        }
      : undefined,
  }
}

export async function startPipeline(articleNum: number): Promise<void> {
  return request<void>('/pipeline/start', {
    method: 'POST',
    body: JSON.stringify({ article_num: articleNum }),
  })
}

export async function continuePipeline(
  agent: string,
  message: string
): Promise<void> {
  return request<void>('/pipeline/continue', {
    method: 'POST',
    body: JSON.stringify({ agent, message }),
  })
}

export async function rerunAgent(
  agent: string,
  context: string
): Promise<void> {
  return request<void>('/pipeline/rerun', {
    method: 'POST',
    body: JSON.stringify({ agent, extra_context: context }),
  })
}

export async function runFinalEditor(articleNum: number): Promise<void> {
  return request<void>('/pipeline/final-editor', {
    method: 'POST',
    body: JSON.stringify({ article_num: articleNum }),
  })
}

export async function sendCollaborationInstruction(
  articleNum: number,
  instruction: string
): Promise<CollaborationInstructionResponse> {
  const raw = await request<Record<string, unknown>>('/collaboration/instruct', {
    method: 'POST',
    body: JSON.stringify({
      article_num: articleNum,
      instruction,
    }),
  })

  return {
    status: raw.status as CollaborationInstructionResponse['status'],
    mode: raw.mode as CollaborationInstructionResponse['mode'],
    articleNum: Number(raw.article_num ?? raw.articleNum ?? articleNum),
  }
}

export async function deleteCollaborationLog(articleNum: number, itemId?: string): Promise<void> {
  return request<void>('/collaboration/log', {
    method: 'DELETE',
    body: JSON.stringify({
      article_num: articleNum,
      item_id: itemId,
    }),
  })
}

export async function importArticle(
  articleNum: number,
  title: string,
  content: string
): Promise<void> {
  return request<void>('/articles/import', {
    method: 'POST',
    body: JSON.stringify({
      article_num: articleNum,
      title,
      content,
    }),
  })
}

export async function saveDraft(
  articleNum: number,
  title: string,
  content: string
): Promise<void> {
  return request<void>('/articles/save-draft', {
    method: 'POST',
    body: JSON.stringify({
      article_num: articleNum,
      title,
      content,
    }),
  })
}

export async function publishToNotion(articleNum: number): Promise<void> {
  return request<void>('/publish/notion', {
    method: 'POST',
    body: JSON.stringify({ article_num: articleNum }),
  })
}

export async function finalizeArticle(articleNum: number): Promise<void> {
  return request<void>('/publish/finalize', {
    method: 'POST',
    body: JSON.stringify({ article_num: articleNum }),
  })
}

export async function confirmArticlePublished(articleNum: number): Promise<ConfirmPublishedResponse> {
  const raw = await request<Record<string, unknown>>('/articles/confirm-official-published', {
    method: 'POST',
    body: JSON.stringify({ article_num: articleNum }),
  })

  return {
    status: raw.status as ConfirmPublishedResponse['status'],
    articleNum: Number(raw.article_num ?? raw.articleNum ?? articleNum),
    nextArticleNum: Number(raw.next_article_num ?? raw.nextArticleNum ?? articleNum + 1),
  }
}

export async function addLesson(
  agent: string,
  lesson: string
): Promise<void> {
  return request<void>('/lessons', {
    method: 'POST',
    body: JSON.stringify({ agent, lesson }),
  })
}

export async function previewPlan(content: string): Promise<PlanPreviewResponse> {
  return request<PlanPreviewResponse>('/plans/preview', {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

export async function importPlan(content: string): Promise<PlanPreviewResponse> {
  return request<PlanPreviewResponse>('/plans/import', {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

export async function generatePlan(input: {
  topic: string
  audience?: string
  outcome?: string
  depth?: string
  channel?: string
  articleCount?: number
}): Promise<PlanPreviewResponse & { content: string }> {
  return request<PlanPreviewResponse & { content: string }>('/plans/generate', {
    method: 'POST',
    body: JSON.stringify({
      topic: input.topic,
      audience: input.audience ?? '',
      outcome: input.outcome ?? '',
      depth: input.depth ?? '',
      channel: input.channel ?? '',
      article_count: input.articleCount ?? 6,
    }),
  })
}
