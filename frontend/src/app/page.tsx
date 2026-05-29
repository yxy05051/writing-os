'use client'

import React, { useCallback, useEffect, useState } from 'react'
import TopBar from '@/components/layout/TopBar'
import Sidebar from '@/components/sidebar/Sidebar'
import Editor from '@/components/editor/Editor'
import SystemDashboard from '@/components/system/SystemDashboard'
import CurriculumView from '@/components/curriculum/CurriculumView'
import { useAgents } from '@/hooks/useAgents'
import { usePipeline } from '@/hooks/usePipeline'
import { useWebSocket } from '@/lib/websocket'
import { fetchState } from '@/lib/api'
import type { ViewType, WritingState, WsMessage } from '@/lib/types'

export default function HomePage() {
  const [writingState, setWritingState] = useState<WritingState | null>(null)
  const [activeView, setActiveView] = useState<ViewType>('curriculum')
  const [selectedArticleNum, setSelectedArticleNum] = useState(1)
  const [draft, setDraft] = useState('')

  const { agents, handleWsMessage, resetAgents, syncPipelineAgent } = useAgents()
  const { currentStep, startPipelineFlow, setCurrentStep } = usePipeline()

  const applyWritingState = useCallback(
    (state: WritingState) => {
      setWritingState(state)

      if (state.pipeline?.running) {
        if (state.pipeline.articleNum) {
          setSelectedArticleNum(state.pipeline.articleNum)
        }
        if (state.pipeline.currentStep) {
          setCurrentStep(Math.max(0, state.pipeline.currentStep - 1))
        }
        syncPipelineAgent(state.pipeline.currentAgent, true)
        return
      }

      setCurrentStep(-1)
      syncPipelineAgent(null, false)
    },
    [setCurrentStep, syncPipelineAgent]
  )

  const refreshWritingState = useCallback(() => {
    fetchState()
      .then(applyWritingState)
      .catch(() => {})
  }, [applyWritingState])

  const handleWs = useCallback(
    (msg: WsMessage) => {
      handleWsMessage(msg)

      if (msg.type === 'pipeline_started') {
        setCurrentStep(0)
      }

      if ((msg.type === 'pipeline_status' || msg.type === 'pipeline_step') && msg.step !== undefined) {
        setCurrentStep(Math.max(0, msg.step - 1))
      }

      if (msg.type === 'pipeline_done' || msg.type === 'pipeline_error') {
        setCurrentStep(-1)
      }

      if (
        msg.type === 'pipeline_status'
        || msg.type === 'pipeline_started'
        || msg.type === 'pipeline_step'
        || msg.type === 'pipeline_agent_done'
        || msg.type === 'pipeline_handoff'
        || msg.type === 'pipeline_done'
        || msg.type === 'collaboration_status'
        || msg.type === 'collaboration_done'
      ) {
        fetchState()
          .then(applyWritingState)
          .catch(() => {})
      }
    },
    [applyWritingState, handleWsMessage, setCurrentStep]
  )

  const { connectionStatus } = useWebSocket(handleWs)

  useEffect(() => {
    fetchState()
      .then((state) => {
        applyWritingState(state)
        setSelectedArticleNum(state.currentArticle)
        const article = state.articles[state.currentArticle]
        if (article) setDraft(article.finalDraft ?? article.draftHtml ?? article.draft ?? '')
      })
      .catch(() => {})
  }, [applyWritingState])

  useEffect(() => {
    if (connectionStatus !== 'connected') return
    refreshWritingState()
  }, [connectionStatus, refreshWritingState])

  useEffect(() => {
    const timer = window.setInterval(refreshWritingState, 8000)
    return () => window.clearInterval(timer)
  }, [refreshWritingState])

  const handleNewArticle = useCallback(
    async (num: number) => {
      resetAgents()
      setSelectedArticleNum(num)
      await startPipelineFlow(num)
      setActiveView('system')
    },
    [resetAgents, startPipelineFlow]
  )

  const currentArticle = writingState
    ? writingState.articles[selectedArticleNum]
    : undefined

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg-primary)',
        overflow: 'hidden',
      }}
    >
      <TopBar
        writingState={writingState}
        currentStep={currentStep}
        articleNum={selectedArticleNum}
        onNewArticle={handleNewArticle}
        connectionStatus={connectionStatus}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          activeView={activeView}
          articleNum={selectedArticleNum}
          articleState={currentArticle}
          completedCount={writingState?.completed.length ?? 0}
          articleCount={writingState ? Object.keys(writingState.articles).length : 0}
          onSelectSystem={() => setActiveView('system')}
          onSelectEditor={() => setActiveView('editor')}
          onSelectCurriculum={() => setActiveView('curriculum')}
        />

        <main style={{ flex: 1, overflow: activeView === 'system' ? 'auto' : 'hidden' }}>
          {activeView === 'editor' ? (
            <Editor
              articleNum={selectedArticleNum}
              articleState={currentArticle}
              onArticleNumChange={setSelectedArticleNum}
              onArticleSaved={refreshWritingState}
              onDraftChange={setDraft}
            />
          ) : activeView === 'curriculum' ? (
            <CurriculumView
              writingState={writingState}
              selectedArticleNum={selectedArticleNum}
              onSelectArticle={setSelectedArticleNum}
              onOpenEditor={() => setActiveView('editor')}
              onOpenSystem={() => setActiveView('system')}
            />
          ) : (
            <SystemDashboard
              agents={agents}
              articleNum={selectedArticleNum}
              articleState={currentArticle}
              agentSettings={writingState?.agentSettings}
              onArticleSaved={refreshWritingState}
              onAgentSettingsSaved={refreshWritingState}
              onArticleChange={setSelectedArticleNum}
              onOpenEditor={() => setActiveView('editor')}
            />
          )}
        </main>
      </div>
    </div>
  )
}
