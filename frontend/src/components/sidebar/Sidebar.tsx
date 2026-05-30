'use client'

import React from 'react'
import type { ArticleState, ViewType } from '@/lib/types'

interface SidebarProps {
  activeView: ViewType
  articleNum: number
  articleState?: ArticleState
  completedCount: number
  articleCount: number
  onSelectSystem: () => void
  onSelectEditor: () => void
  onSelectCurriculum: () => void
}

function NavButton({
  active,
  label,
  badge,
  onClick,
}: {
  active: boolean
  label: string
  badge: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="status-transition"
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '9px 10px',
        borderRadius: 'var(--radius)',
        border: active ? '1px solid #2a2a2a' : '1px solid transparent',
        background: active ? 'var(--bg-active)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      <span>{label}</span>
      <span
        style={{
          fontSize: 10,
          color: 'var(--text-disabled)',
          border: '1px solid var(--border)',
          borderRadius: 3,
          padding: '1px 5px',
        }}
      >
        {badge}
      </span>
    </button>
  )
}

export default function Sidebar({
  activeView,
  articleNum,
  articleState,
  completedCount,
  articleCount,
  onSelectSystem,
  onSelectEditor,
  onSelectCurriculum,
}: SidebarProps) {
  const isPublished = Boolean(articleState?.officialPublished)
  const logCount = articleState?.collaboration?.log?.length ?? 0

  return (
    <aside
      style={{
        width: 240,
        minWidth: 240,
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-disabled)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>
          WORKSPACE
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <NavButton active={activeView === 'system'} label="Agent workspace" badge="Ops" onClick={onSelectSystem} />
          <NavButton active={activeView === 'editor'} label="Editor" badge="Draft" onClick={onSelectEditor} />
          <NavButton active={activeView === 'curriculum'} label="Planning" badge="Plan" onClick={onSelectCurriculum} />
        </div>
      </div>

      <div className="sidebar-brief">
        <section className="sidebar-article-card">
          <div className="sidebar-kicker">CURRENT ARTICLE</div>
          <div className="sidebar-article-num">#{String(articleNum).padStart(3, '0')}</div>
          <div className="sidebar-article-title">{articleState?.title || 'Untitled article'}</div>
          <div className={isPublished ? 'sidebar-freeze is-frozen' : 'sidebar-freeze'}>
            {isPublished ? '已发布' : 'Final draft can be edited'}
          </div>
        </section>

        <section className="sidebar-metrics">
          <div>
            <span>{completedCount}</span>
            <small>Done</small>
          </div>
          <div>
            <span>{articleCount}</span>
            <small>Drafts</small>
          </div>
          <div>
            <span>{logCount}</span>
            <small>Logs</small>
          </div>
        </section>

        <section className="sidebar-lane">
          <div className={activeView === 'system' ? 'sidebar-lane-step active' : 'sidebar-lane-step'}>
            <span />
            Agent workspace
          </div>
          <div className={activeView === 'editor' ? 'sidebar-lane-step active' : 'sidebar-lane-step'}>
            <span />
            Final draft
          </div>
          <div className={activeView === 'curriculum' ? 'sidebar-lane-step active' : 'sidebar-lane-step'}>
            <span />
            Planning
          </div>
          <div className={isPublished ? 'sidebar-lane-step active frozen' : 'sidebar-lane-step'}>
            <span />
            已发布
          </div>
        </section>
      </div>
    </aside>
  )
}
