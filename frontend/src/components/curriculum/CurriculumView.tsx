'use client'

import React, { useMemo, useState } from 'react'
import { CURRICULUM_ARTICLES, CURRICULUM_MIND_MAP, CURRICULUM_PHASES } from '@/lib/curriculum'
import { generatePlan, importPlan, previewPlan, type PlanPreviewResponse } from '@/lib/api'
import type { WritingState } from '@/lib/types'

interface CurriculumViewProps {
  writingState: WritingState | null
  selectedArticleNum: number
  onSelectArticle: (articleNum: number) => void
  onOpenEditor: () => void
  onOpenSystem: () => void
}

const planTemplate = `# My Writing Project

Audience: Independent creators and small teams.
Outcome: Readers can build a repeatable writing workflow.
Tone: Clear, practical, and thoughtful.

## Article 001 | Why this topic matters

Goal: Help readers understand the main promise of the series.
Reader level: Beginner.
Tree position: Foundation > Orientation.
Key points:
- Why the topic matters now
- What readers will be able to do after the series
- What this series will not cover
Constraints:
- Avoid jargon without explanation
Next hook: The next article defines the core workflow.

## Article 002 | The core workflow

Goal: Explain the workflow readers will use throughout the series.
Reader level: Beginner.
Tree position: Foundation > Workflow.
Key points:
- Inputs
- Process
- Outputs
- Feedback loop
Next hook: Apply the workflow to the first concrete example.
`

function buildGuidedPlanDraft({
  topic,
  audience,
  outcome,
  length,
  depth,
  channel,
}: {
  topic: string
  audience: string
  outcome: string
  length: number
  depth: string
  channel: string
}) {
  const safeTopic = topic.trim() || 'Untitled writing project'
  const safeAudience = audience.trim() || 'Readers who want a clear learning path.'
  const safeOutcome = outcome.trim() || 'Readers understand the topic and can apply the ideas.'
  const safeDepth = depth.trim() || 'Practical but rigorous.'
  const safeChannel = channel.trim() || 'Long-form articles.'
  const articleCount = Math.max(1, Math.min(100, length || 6))

  const articles = Array.from({ length: articleCount }, (_, index) => {
    const num = index + 1
    const padded = String(num).padStart(3, '0')
    const phase =
      num === 1 ? 'Foundation > Orientation'
      : num === articleCount ? 'Synthesis > Operating model'
      : num <= Math.ceil(articleCount / 3) ? 'Foundation > Core concepts'
      : num <= Math.ceil((articleCount * 2) / 3) ? 'Development > Deepening'
      : 'Application > Practice'
    const title =
      num === 1 ? `Why ${safeTopic} matters`
      : num === articleCount ? `Make ${safeTopic} repeatable`
      : `${safeTopic} step ${padded}`

    return `## Article ${padded} | ${title}

Goal: Move readers one step closer to this outcome: ${safeOutcome}
Reader level: ${safeDepth}
Tree position: ${phase}
Key points:
- Define the core idea for this step
- Explain why it matters to ${safeAudience}
- Give a concrete example or decision rule
Constraints:
- Fit the ${safeChannel} publishing context
- Keep the article connected to the previous and next steps
Next hook: Continue to the next branch of the project map.`
  }).join('\n\n')

  return `# ${safeTopic}

Audience: ${safeAudience}
Outcome: ${safeOutcome}
Tone: Clear, useful, and grounded.
Publishing channel: ${safeChannel}

${articles}
`
}

export default function CurriculumView({
  writingState,
  selectedArticleNum,
  onSelectArticle,
  onOpenEditor,
  onOpenSystem,
}: CurriculumViewProps) {
  const [phaseId, setPhaseId] = useState(() => {
    return CURRICULUM_ARTICLES.find((article) => article.num === selectedArticleNum)?.phase ?? 1
  })
  const [planningMode, setPlanningMode] = useState<'import' | 'guided'>('import')
  const [planText, setPlanText] = useState(planTemplate)
  const [planPreview, setPlanPreview] = useState<PlanPreviewResponse | null>(null)
  const [planStatus, setPlanStatus] = useState('')
  const [isPlanBusy, setIsPlanBusy] = useState(false)
  const [isAiPlanning, setIsAiPlanning] = useState(false)
  const [guidedTopic, setGuidedTopic] = useState('')
  const [guidedAudience, setGuidedAudience] = useState('')
  const [guidedOutcome, setGuidedOutcome] = useState('')
  const [guidedDepth, setGuidedDepth] = useState('Beginner to intermediate')
  const [guidedChannel, setGuidedChannel] = useState('Long-form articles')
  const [guidedLength, setGuidedLength] = useState(6)
  const completed = new Set(writingState?.completed ?? [])
  const articles = useMemo(
    () => CURRICULUM_ARTICLES.filter((article) => article.phase === phaseId),
    [phaseId]
  )
  const phase = CURRICULUM_PHASES.find((item) => item.id === phaseId) ?? CURRICULUM_PHASES[0]
  const current = CURRICULUM_ARTICLES.find((article) => article.num === selectedArticleNum)

  const handleSelect = (articleNum: number) => {
    onSelectArticle(articleNum)
    const targetPhase = CURRICULUM_ARTICLES.find((article) => article.num === articleNum)?.phase
    if (targetPhase) setPhaseId(targetPhase)
  }

  const handlePreviewPlan = async () => {
    if (!planText.trim()) return
    setIsPlanBusy(true)
    setPlanStatus('')
    try {
      const result = await previewPlan(planText)
      setPlanPreview(result)
      setPlanStatus(`Preview ready: ${result.article_count} articles found.`)
    } catch (error) {
      setPlanPreview(null)
      setPlanStatus(error instanceof Error ? error.message : 'Failed to preview plan.')
    } finally {
      setIsPlanBusy(false)
    }
  }

  const handleImportPlan = async () => {
    if (!planText.trim()) return
    setIsPlanBusy(true)
    setPlanStatus('')
    try {
      const result = await importPlan(planText)
      setPlanPreview(result)
      setPlanStatus(`Imported ${result.article_count} articles. New writing tasks will use this plan.`)
    } catch (error) {
      setPlanStatus(error instanceof Error ? error.message : 'Failed to import plan.')
    } finally {
      setIsPlanBusy(false)
    }
  }

  const handleGenerateGuidedDraft = () => {
    const draft = buildGuidedPlanDraft({
      topic: guidedTopic,
      audience: guidedAudience,
      outcome: guidedOutcome,
      length: guidedLength,
      depth: guidedDepth,
      channel: guidedChannel,
    })
    setPlanText(draft)
    setPlanningMode('import')
    setPlanPreview(null)
    setPlanStatus('Generated an editable Markdown plan draft. Review it, then preview or import.')
  }

  const handleGenerateWithAi = async () => {
    if (!guidedTopic.trim()) {
      setPlanStatus('Add a topic before using AI planning.')
      return
    }
    setIsAiPlanning(true)
    setPlanStatus('')
    try {
      const result = await generatePlan({
        topic: guidedTopic,
        audience: guidedAudience,
        outcome: guidedOutcome,
        depth: guidedDepth,
        channel: guidedChannel,
        articleCount: guidedLength,
      })
      setPlanText(result.content)
      setPlanPreview(result)
      setPlanningMode('import')
      setPlanStatus(`AI generated ${result.article_count} planned articles. Review, edit, then import.`)
    } catch (error) {
      setPlanStatus(error instanceof Error ? error.message : 'AI planning failed.')
    } finally {
      setIsAiPlanning(false)
    }
  }

  return (
    <div className="curriculum-view">
      <aside className="curriculum-phases">
        <div className="curriculum-kicker">Writing plan</div>
        <h1>Project Planner</h1>
        <p>
          Import an existing plan, or use the planning workflow to turn a rough idea into a structured article series.
        </p>

        <div className="curriculum-phase-list">
          {CURRICULUM_PHASES.map((item) => {
            const doneCount = CURRICULUM_ARTICLES.filter(
              (article) => article.phase === item.id && completed.has(article.num)
            ).length
            return (
              <button
                key={item.id}
                type="button"
                className={item.id === phaseId ? 'curriculum-phase active' : 'curriculum-phase'}
                onClick={() => setPhaseId(item.id)}
              >
                <span>{item.range}</span>
                <strong>{item.title}</strong>
                <small>{doneCount}/{item.articleCount}</small>
              </button>
            )
          })}
        </div>
      </aside>

      <main className="curriculum-main">
        <header className="curriculum-header">
          <div>
            <span>{phase.range}</span>
            <h2>{phase.title}</h2>
            <p>{phase.goal}</p>
          </div>
          <div className="curriculum-actions">
            <button className="btn btn-secondary" onClick={onOpenSystem}>
              Agent workspace
            </button>
            <button className="btn btn-primary" onClick={onOpenEditor}>
              Open editor
            </button>
          </div>
        </header>

        <section className="planner-panel">
          <div className="planner-panel-head">
            <div>
              <span>PLAN SETUP</span>
              <h3>Start from a plan, or create one first</h3>
              <p>Use a structured Markdown plan for reliable parsing. If you only have a rough idea, generate a draft plan here and edit it before importing.</p>
            </div>
            <div className="planner-mode-switch">
              <button
                type="button"
                className={planningMode === 'import' ? 'active' : ''}
                onClick={() => setPlanningMode('import')}
              >
                Import existing plan
              </button>
              <button
                type="button"
                className={planningMode === 'guided' ? 'active' : ''}
                onClick={() => setPlanningMode('guided')}
              >
                Create guided draft
              </button>
            </div>
          </div>

          {planningMode === 'guided' ? (
            <div className="planner-guided-grid">
              <label>
                Topic
                <input value={guidedTopic} onChange={(e) => setGuidedTopic(e.target.value)} placeholder="Example: Practical AI product management" />
              </label>
              <label>
                Audience
                <input value={guidedAudience} onChange={(e) => setGuidedAudience(e.target.value)} placeholder="Who are you writing for?" />
              </label>
              <label>
                Desired outcome
                <input value={guidedOutcome} onChange={(e) => setGuidedOutcome(e.target.value)} placeholder="What should readers understand or do?" />
              </label>
              <label>
                Reader depth
                <input value={guidedDepth} onChange={(e) => setGuidedDepth(e.target.value)} />
              </label>
              <label>
                Channel
                <input value={guidedChannel} onChange={(e) => setGuidedChannel(e.target.value)} />
              </label>
              <label>
                Article count
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={guidedLength}
                  onChange={(e) => setGuidedLength(Number(e.target.value))}
                />
              </label>
              <button type="button" className="btn btn-primary planner-generate" onClick={handleGenerateGuidedDraft}>
                Generate local draft
              </button>
              <button type="button" className="btn btn-secondary planner-generate" onClick={handleGenerateWithAi} disabled={isAiPlanning || !guidedTopic.trim()}>
                {isAiPlanning ? 'Planning...' : 'Generate with AI'}
              </button>
            </div>
          ) : (
            <div className="planner-import-grid">
              <textarea
                value={planText}
                onChange={(e) => setPlanText(e.target.value)}
                spellCheck={false}
                placeholder="Paste a Markdown plan with headings like ## Article 001 | Title"
              />
              <aside className="planner-preview">
                <strong>Import rules</strong>
                <p>Minimum: article number, title, and a goal or brief. Recommended: audience, reader level, tree position, key points, constraints, and next hook.</p>
                {planPreview && (
                  <div className="planner-preview-list">
                    <span>{planPreview.article_count} articles detected</span>
                    {planPreview.articles.slice(0, 6).map((article) => (
                      <button key={article.num} type="button" onClick={() => handleSelect(article.num)}>
                        <small>{String(article.num).padStart(3, '0')}</small>
                        <em>{article.title}</em>
                      </button>
                    ))}
                  </div>
                )}
              </aside>
            </div>
          )}

          <div className="planner-actions">
            <button type="button" className="btn btn-secondary" onClick={handlePreviewPlan} disabled={isPlanBusy || !planText.trim()}>
              Preview plan
            </button>
            <button type="button" className="btn btn-primary" onClick={handleImportPlan} disabled={isPlanBusy || !planText.trim()}>
              Import plan
            </button>
            {planStatus && <span className={planStatus.includes('Failed') || planStatus.includes('API') ? 'is-error' : ''}>{planStatus}</span>}
          </div>
        </section>

        {current && (
          <section className="curriculum-current">
            <span>SELECTED ARTICLE</span>
            <strong>Article {String(current.num).padStart(3, '0')} | {current.title}</strong>
            <small>{current.treePosition}</small>
            <p>{current.goal}</p>
          </section>
        )}

        <section className="curriculum-map">
          <div className="curriculum-map-head">
            <span>KNOWLEDGE MAP</span>
            <h3>Project knowledge map</h3>
            <p>Start with the main path, then expand each branch into article-level briefs.</p>
          </div>

          <div className="curriculum-map-roots">
            {CURRICULUM_MIND_MAP.map((root) => (
              <article key={root.id} className="mind-root">
                <button
                  type="button"
                  className="mind-root-main"
                  onClick={() => handleSelect(root.articleNums[0])}
                >
                  <span>{root.range}</span>
                  <strong>{root.title}</strong>
                  {root.summary && <p>{root.summary}</p>}
                </button>

                <div className="mind-branches">
                  {root.children?.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      className={child.articleNums.includes(selectedArticleNum) ? 'mind-branch active' : 'mind-branch'}
                      onClick={() => handleSelect(child.articleNums[0])}
                    >
                      <span>{child.range}</span>
                      <strong>{child.title}</strong>
                      {child.summary && <p>{child.summary}</p>}
                      {!!child.children?.length && (
                        <small>{child.children.map((branch) => branch.title).join(' / ')}</small>
                      )}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="curriculum-article-grid">
          {articles.map((article) => {
            const isSelected = article.num === selectedArticleNum
            const isDone = completed.has(article.num)
            const articleState = writingState?.articles[article.num]
            return (
              <button
                key={article.num}
                type="button"
                className={[
                  'curriculum-article',
                  isSelected ? 'selected' : '',
                  isDone ? 'done' : '',
                  article.milestone ? 'milestone' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => handleSelect(article.num)}
              >
                <span>{String(article.num).padStart(3, '0')}</span>
                <strong>{article.title}</strong>
                <p>{article.goal}</p>
                <em>{article.layerRole}</em>
                <small>
                  {isDone ? 'Done' : articleState?.status ? articleState.status : 'Planned'}
                  {article.milestone ? ' · Milestone' : ''}
                </small>
              </button>
            )
          })}
        </section>
      </main>
    </div>
  )
}
