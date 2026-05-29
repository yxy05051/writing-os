'use client'

import React, { useState } from 'react'
import type { WritingState } from '@/lib/types'
import { PIPELINE_STEPS } from '@/lib/types'

interface TopBarProps {
  writingState: WritingState | null
  currentStep: number
  articleNum: number
  onNewArticle: (num: number) => void
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
}

function ConnectionBadge({
  status,
}: {
  status: TopBarProps['connectionStatus']
}) {
  const config = {
    connecting:   { color: '#f59e0b', label: 'Connecting' },
    connected:    { color: '#10b981', label: 'Connected' },
    disconnected: { color: '#555555', label: 'Disconnected' },
    error:        { color: '#ef4444', label: 'Connection error' },
  }[status]

  return (
    <span
      className="flex items-center gap-1"
      style={{ fontSize: 11, color: config.color }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: config.color,
          display: 'inline-block',
        }}
      />
      {config.label}
    </span>
  )
}

function PipelineProgress({
  currentStep,
  articleNum,
}: {
  currentStep: number
  articleNum: number
}) {
  const currentAgent =
    currentStep >= 0 && currentStep < PIPELINE_STEPS.length
      ? PIPELINE_STEPS[currentStep]
      : null

  const label = currentAgent
    ? `Article ${String(articleNum).padStart(3, '0')} · ${currentAgent.name}`
    : `Article ${String(articleNum).padStart(3, '0')}`

  const progress =
    currentStep >= 0
      ? Math.round(((currentStep + 1) / PIPELINE_STEPS.length) * 100)
      : 0

  return (
    <div className="flex flex-col items-center gap-1" style={{ minWidth: 320 }}>
      {/* Label */}
      <div
        style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          fontWeight: 500,
          letterSpacing: '0.01em',
        }}
      >
        {label}
      </div>

      {/* Step dots */}
      <div className="flex items-center gap-1">
        {PIPELINE_STEPS.map((step, idx) => {
          const isDone = currentStep > idx
          const isActive = currentStep === idx
          const isPending = currentStep < idx

          return (
            <div
              key={step.id}
              title={step.name}
              style={{
                width: isDone ? 16 : isActive ? 20 : 8,
                height: 4,
                borderRadius: 2,
                background: isDone
                  ? 'var(--accent-purple)'
                  : isActive
                  ? 'var(--accent-green)'
                  : 'var(--border)',
                transition: 'all 0.3s ease',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function NewArticleButton({
  onSubmit,
}: {
  onSubmit: (num: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  const handleSubmit = () => {
    const num = parseInt(value, 10)
    if (!isNaN(num) && num > 0) {
      onSubmit(num)
      setOpen(false)
      setValue('')
    }
  }

  if (!open) {
    return (
      <button
        className="btn btn-secondary"
        onClick={() => setOpen(true)}
        style={{ fontSize: 12, padding: '4px 10px' }}
      >
        + New task
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        placeholder="No."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') {
            setOpen(false)
            setValue('')
          }
        }}
        autoFocus
        className="focus-purple"
        style={{
          width: 72,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '4px 8px',
          color: 'var(--text-primary)',
          fontSize: 13,
        }}
      />
      <button
        className="btn btn-primary"
        onClick={handleSubmit}
        style={{ fontSize: 12, padding: '4px 10px' }}
      >
        Start
      </button>
      <button
        className="btn btn-ghost"
        onClick={() => {
          setOpen(false)
          setValue('')
        }}
        style={{ fontSize: 12, padding: '4px 8px' }}
      >
        Cancel
      </button>
    </div>
  )
}

export default function TopBar({
  writingState,
  currentStep,
  articleNum,
  onNewArticle,
  connectionStatus,
}: TopBarProps) {
  return (
    <header
      style={{
        height: 48,
        background: 'var(--bg-sidebar)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 16,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2"
        style={{ minWidth: 160, flexShrink: 0 }}
      >
        <span style={{ fontSize: 16 }}>✍️</span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          Writing OS
        </span>
        <ConnectionBadge status={connectionStatus} />
      </div>

      {/* Progress */}
      <div className="flex-1 flex justify-center">
        <PipelineProgress
          currentStep={currentStep}
          articleNum={articleNum}
        />
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-3"
        style={{ minWidth: 160, flexShrink: 0, justifyContent: 'flex-end' }}
      >
        {writingState && (
          <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>
            {writingState.completed.length}&nbsp;completed
          </span>
        )}
        <NewArticleButton onSubmit={onNewArticle} />
      </div>
    </header>
  )
}
