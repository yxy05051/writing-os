'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Extension } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import WordCount from './WordCount'
import {
  confirmArticlePublished,
  importArticle,
  saveDraft,
} from '@/lib/api'
import type { ArticleState } from '@/lib/types'

interface EditorProps {
  articleNum: number
  articleState?: ArticleState
  onArticleNumChange?: (articleNum: number) => void
  onArticleSaved?: () => void
  onDraftChange?: (draft: string) => void
}

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

type ToolbarButtonProps = {
  label: string
  title: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}

type FormatBrushState = {
  bold: boolean
  italic: boolean
  underline: boolean
  color?: string
  fontSize?: string
  textAlign?: string
}

const colorSwatches = ['#ffffff', '#c4b5fd', '#93c5fd', '#86efac', '#fde68a', '#fca5a5']
const fontSizes = ['14px', '16px', '18px', '20px', '24px', '28px', '32px']

const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {}
              return { style: `font-size: ${attributes.fontSize}` }
            },
          },
        },
      },
    ]
  },
})

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function plainTextToHtml(text: string): string {
  const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean)
  if (blocks.length === 0) return ''
  return blocks
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function looksLikeHtml(content: string): boolean {
  return /<([a-z][a-z0-9-]*)(\s[^>]*)?>[\s\S]*<\/\1>|<(br|hr|img)(\s[^>]*)?\s*\/?>/i.test(content)
}

function normalizeEditorContent(content?: string): string {
  const value = content ?? ''
  if (!value.trim()) return ''
  return looksLikeHtml(value) ? value : plainTextToHtml(value)
}

function getArticleContent(articleState?: ArticleState): string {
  if (!articleState) return ''
  return (
    articleState.finalDraft
    ?? articleState.draftHtml
    ?? articleState.draft
    ?? articleState.agentOutputs?.style
    ?? articleState.agentOutputs?.writer
    ?? ''
  )
}

function buildEditorSnapshot(
  articleNum: number,
  title: string,
  content: string,
  published = ''
): string {
  return JSON.stringify({ articleNum, title, content, published })
}

function ToolbarButton({ label, title, active, disabled, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className={`editor-tool-btn${active ? ' active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      {label}
    </button>
  )
}

export default function Editor({
  articleNum,
  articleState,
  onArticleNumChange,
  onArticleSaved,
  onDraftChange,
}: EditorProps) {
  const initialHtml = useMemo(
    () => normalizeEditorContent(getArticleContent(articleState)),
    [articleState]
  )

  const [title, setTitle] = useState(articleState?.title ?? '')
  const [htmlContent, setHtmlContent] = useState(initialHtml)
  const [plainText, setPlainText] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [articleNumInput, setArticleNumInput] = useState(String(articleNum))
  const [isConfirmingPublished, setIsConfirmingPublished] = useState(false)
  const [publishMsg, setPublishMsg] = useState('')
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importTitle, setImportTitle] = useState('')
  const [importContent, setImportContent] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [formatBrush, setFormatBrush] = useState<FormatBrushState | null>(null)

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastLoadedArticleRef = useRef(0)
  const lastLoadedSnapshotRef = useRef('')
  const titleRef = useRef(title)
  const isOfficialPublished = Boolean(articleState?.officialPublished)

  const scheduleSave = useCallback(
    (nextTitle: string, nextHtml: string) => {
      setSaveStatus('unsaved')
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

      saveTimerRef.current = setTimeout(async () => {
        setSaveStatus('saving')
        try {
          await saveDraft(articleNum, nextTitle, nextHtml)
          lastLoadedArticleRef.current = articleNum
          lastLoadedSnapshotRef.current = buildEditorSnapshot(articleNum, nextTitle, nextHtml)
          setSaveStatus('saved')
          onArticleSaved?.()
        } catch (e) {
          console.error('Save failed:', e)
          setSaveStatus('error')
        }
      }, 900)
    },
    [articleNum, onArticleSaved]
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
    ],
    content: initialHtml,
    editable: true,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        spellcheck: 'false',
      },
    },
    onUpdate: ({ editor }) => {
      const nextHtml = editor.getHTML()
      const nextText = editor.getText({ blockSeparator: '\n' })
      setHtmlContent(nextHtml)
      setPlainText(nextText)
      onDraftChange?.(nextHtml)
      scheduleSave(titleRef.current, nextHtml)
    },
  })

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(true)
  }, [editor])

  useEffect(() => {
    if (!editor) return

    setArticleNumInput(String(articleNum))
    const nextTitle = articleState?.title ?? ''
    const nextHtml = normalizeEditorContent(getArticleContent(articleState))
    const nextSnapshot = buildEditorSnapshot(
      articleNum,
      nextTitle,
      nextHtml,
      articleState?.officialPublishedAt ?? ''
    )
    const sameArticleNeedsGeneratedContent =
      lastLoadedArticleRef.current === articleNum
      && !editor.isFocused
      && !htmlContent.trim()
      && Boolean(nextHtml.trim())
    const shouldReload =
      lastLoadedArticleRef.current !== articleNum
      || sameArticleNeedsGeneratedContent

    if (shouldReload) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

      lastLoadedArticleRef.current = articleNum
      lastLoadedSnapshotRef.current = nextSnapshot
      titleRef.current = nextTitle
      setTitle(nextTitle)
      editor.commands.setContent(nextHtml, { emitUpdate: false })
      setHtmlContent(nextHtml)
      setPlainText(editor.getText({ blockSeparator: '\n' }))
      setSaveStatus('saved')
    }
  }, [articleNum, articleState, editor, htmlContent])

  const handleArticleNumInputChange = useCallback(
    (value: string) => {
      setArticleNumInput(value)
      const nextNum = Number.parseInt(value, 10)
      if (Number.isFinite(nextNum) && nextNum > 0 && nextNum !== articleNum) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        onArticleNumChange?.(nextNum)
      }
    },
    [articleNum, onArticleNumChange]
  )

  const handleArticleNumCommit = useCallback(() => {
    const nextNum = Number.parseInt(articleNumInput, 10)
    if (!Number.isFinite(nextNum) || nextNum <= 0 || nextNum === articleNum) {
      setArticleNumInput(String(articleNum))
      return
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    onArticleNumChange?.(nextNum)
  }, [articleNum, articleNumInput, onArticleNumChange])

  const handleTitleChange = useCallback(
    (value: string) => {
      titleRef.current = value
      setTitle(value)
      scheduleSave(value, htmlContent)
    },
    [htmlContent, scheduleSave]
  )

  const copyFormatBrush = useCallback(() => {
    if (!editor) return
    const textStyle = editor.getAttributes('textStyle')
    const paragraph = editor.getAttributes('paragraph')
    const heading = editor.getAttributes('heading')
    setFormatBrush({
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      color: textStyle.color as string | undefined,
      fontSize: textStyle.fontSize as string | undefined,
      textAlign: (paragraph.textAlign || heading.textAlign) as string | undefined,
    })
    setPublishMsg('Format copied. Select text, then apply it.')
    setTimeout(() => setPublishMsg(''), 2500)
  }, [editor])

  const applyFormatBrush = useCallback(() => {
    if (!editor || !formatBrush) return

    const chain = editor.chain().focus()
    ;(formatBrush.bold ? chain.setMark('bold') : chain.unsetMark('bold'))
    ;(formatBrush.italic ? chain.setMark('italic') : chain.unsetMark('italic'))
    ;(formatBrush.underline ? chain.setMark('underline') : chain.unsetMark('underline'))

    chain.setMark('textStyle', {
      color: formatBrush.color ?? null,
      fontSize: formatBrush.fontSize ?? null,
    })

    if (formatBrush.textAlign) {
      chain.setTextAlign(formatBrush.textAlign)
    }

    chain.run()
    setFormatBrush(null)
  }, [editor, formatBrush])

  const saveCurrentFinal = useCallback(async () => {
    await saveDraft(articleNum, title, htmlContent)
    setSaveStatus('saved')
    onArticleSaved?.()
  }, [articleNum, htmlContent, onArticleSaved, title])

  const handleFinalize = useCallback(async () => {
    try {
      await saveCurrentFinal()
      setPublishMsg('Saved as final draft')
      setTimeout(() => setPublishMsg(''), 2500)
    } catch (e) {
      console.error('Save final draft failed:', e)
      setPublishMsg('Failed to save final draft')
      setTimeout(() => setPublishMsg(''), 3000)
    }
  }, [saveCurrentFinal])

  const handleConfirmPublished = useCallback(async () => {
    setIsConfirmingPublished(true)
    setPublishMsg('')
    try {
      await saveCurrentFinal()
      const response = await confirmArticlePublished(articleNum)
      const nextArticleNum = response.nextArticleNum
      onArticleNumChange?.(nextArticleNum)
      setArticleNumInput(String(nextArticleNum))
      titleRef.current = ''
      setTitle('')
      setHtmlContent('')
      setPlainText('')
      editor?.commands.setContent('', { emitUpdate: false })
      lastLoadedArticleRef.current = nextArticleNum
      lastLoadedSnapshotRef.current = buildEditorSnapshot(nextArticleNum, '', '')
      onArticleSaved?.()
      setPublishMsg(`Published. Switched to Article ${String(nextArticleNum).padStart(3, '0')}.`)
      setTimeout(() => setPublishMsg(''), 3500)
    } catch (e) {
      console.error('Confirm publish failed:', e)
      setPublishMsg('Failed to confirm publish')
      setTimeout(() => setPublishMsg(''), 3000)
    } finally {
      setIsConfirmingPublished(false)
    }
  }, [articleNum, editor, onArticleNumChange, onArticleSaved, saveCurrentFinal])

  const openImportDialog = useCallback(() => {
    setImportTitle(title)
    setImportContent('')
    setIsImportOpen(true)
  }, [title])

  const handleImport = useCallback(async () => {
    if (!editor || !importContent.trim()) return

    const nextTitle = importTitle.trim() || title || `Article ${String(articleNum).padStart(3, '0')}`
    const nextHtml = normalizeEditorContent(importContent)

    setIsImporting(true)
    setPublishMsg('')
    try {
      await importArticle(articleNum, nextTitle, nextHtml)
      editor.commands.setContent(nextHtml, { emitUpdate: false })
      const nextText = editor.getText({ blockSeparator: '\n' })
      titleRef.current = nextTitle
      lastLoadedArticleRef.current = articleNum
      lastLoadedSnapshotRef.current = buildEditorSnapshot(articleNum, nextTitle, nextHtml)
      setTitle(nextTitle)
      setHtmlContent(nextHtml)
      setPlainText(nextText)
      onDraftChange?.(nextHtml)
      onArticleSaved?.()
      setSaveStatus('saved')
      setIsImportOpen(false)
      setPublishMsg('Imported as final draft')
      setTimeout(() => setPublishMsg(''), 2500)
    } catch (e) {
      console.error('Import final draft failed:', e)
      setPublishMsg('Failed to import final draft')
      setTimeout(() => setPublishMsg(''), 3000)
    } finally {
      setIsImporting(false)
    }
  }, [articleNum, editor, importContent, importTitle, onArticleSaved, onDraftChange, title])

  const saveStatusConfig: Record<SaveStatus, { label: string; color: string }> = {
    saved: { label: 'Saved', color: 'var(--text-disabled)' },
    saving: { label: 'Saving...', color: 'var(--accent-yellow)' },
    unsaved: { label: 'Unsaved', color: 'var(--text-disabled)' },
    error: { label: 'Save failed', color: 'var(--accent-red)' },
  }

  const statusCfg = saveStatusConfig[saveStatus]
  const paragraphCount = plainText.split(/\n+/).map((line) => line.trim()).filter(Boolean).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary)' }}>
      <div
        style={{
          padding: '10px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-sidebar)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--text-disabled)', fontWeight: 600, letterSpacing: '0.05em' }}>
            #
          </span>
          <input
            type="number"
            min={1}
            value={articleNumInput}
            onChange={(e) => handleArticleNumInputChange(e.target.value)}
            onBlur={handleArticleNumCommit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleArticleNumCommit()
              if (e.key === 'Escape') setArticleNumInput(String(articleNum))
            }}
            className="focus-purple"
            aria-label="Article number"
            style={{
              width: 58,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '3px 7px',
              color: 'var(--text-primary)',
              fontSize: 12,
              fontWeight: 600,
              outline: 'none',
            }}
          />
        </div>

        <input
          type="text"
          placeholder="Article title..."
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="focus-purple flex-1"
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--border)',
            borderRadius: 0,
            padding: '4px 0',
            color: 'var(--text-primary)',
            fontSize: 15,
            fontWeight: 600,
            outline: 'none',
          }}
        />

        {isOfficialPublished && (
          <span
            style={{
              fontSize: 11,
              color: 'var(--accent-green)',
              border: '1px solid var(--accent-green)',
              borderRadius: 'var(--radius)',
              padding: '3px 7px',
              whiteSpace: 'nowrap',
            }}
          >
            已发布
          </span>
        )}

        <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
          <WordCount text={plainText} />
          <span style={{ fontSize: 11, color: statusCfg.color, transition: 'color 0.2s' }}>{statusCfg.label}</span>
        </div>
      </div>

      <div className="editor-toolbar">
        <ToolbarButton label="B" title="Bold" active={editor?.isActive('bold')} disabled={!editor} onClick={() => editor?.chain().focus().toggleBold().run()} />
        <ToolbarButton label="I" title="Italic" active={editor?.isActive('italic')} disabled={!editor} onClick={() => editor?.chain().focus().toggleItalic().run()} />
        <ToolbarButton label="U" title="Underline" active={editor?.isActive('underline')} disabled={!editor} onClick={() => editor?.chain().focus().toggleUnderline().run()} />
        <span className="editor-toolbar-divider" />
        {[1, 2, 3].map((level) => (
          <ToolbarButton
            key={level}
            label={`H${level}`}
            title={`Heading ${level}`}
            active={editor?.isActive('heading', { level })}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run()}
          />
        ))}
        <span className="editor-toolbar-divider" />
        <ToolbarButton label="L" title="Align left" active={editor?.isActive({ textAlign: 'left' })} disabled={!editor} onClick={() => editor?.chain().focus().setTextAlign('left').run()} />
        <ToolbarButton label="C" title="Align center" active={editor?.isActive({ textAlign: 'center' })} disabled={!editor} onClick={() => editor?.chain().focus().setTextAlign('center').run()} />
        <ToolbarButton label="R" title="Align right" active={editor?.isActive({ textAlign: 'right' })} disabled={!editor} onClick={() => editor?.chain().focus().setTextAlign('right').run()} />
        <span className="editor-toolbar-divider" />
        <ToolbarButton label="Copy" title="Copy selected text format" disabled={!editor} onClick={copyFormatBrush} />
        <ToolbarButton label="Apply" title="Apply copied format to selected text" active={Boolean(formatBrush)} disabled={!editor || !formatBrush} onClick={applyFormatBrush} />
        <span className="editor-toolbar-divider" />
        <select
          className="editor-font-size-select focus-purple"
          value={(editor?.getAttributes('textStyle').fontSize as string | undefined) ?? ''}
          disabled={!editor}
          title="Font size"
          aria-label="Font size"
          onChange={(e) => {
            const value = e.target.value
            if (!editor) return
            if (value) {
              editor.chain().focus().setMark('textStyle', { fontSize: value }).run()
            } else {
              editor.chain().focus().setMark('textStyle', { fontSize: null }).run()
            }
          }}
        >
          <option value="">Size</option>
          {fontSizes.map((size) => (
            <option key={size} value={size}>
              {size.replace('px', '')}
            </option>
          ))}
        </select>
        <span className="editor-toolbar-divider" />
        {colorSwatches.map((color) => (
          <button
            key={color}
            type="button"
            className="editor-color-btn"
            style={{ background: color }}
            disabled={!editor}
            title={`Text color ${color}`}
            aria-label={`Text color ${color}`}
            onClick={() => editor?.chain().focus().setColor(color).run()}
          />
        ))}
        <ToolbarButton label="Clear" title="Clear formatting" disabled={!editor} onClick={() => editor?.chain().focus().unsetColor().unsetHighlight().clearNodes().unsetAllMarks().run()} />
        <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 11px', marginLeft: 'auto' }} onClick={openImportDialog}>
          Import final draft
        </button>
      </div>

      <div className="editor-shell">
        <EditorContent editor={editor} />
      </div>

      <div
        style={{
          padding: '10px 20px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-sidebar)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          gap: 12,
        }}
      >
        <div className="flex items-center gap-3">
          <WordCount text={plainText} showLabel />
          {paragraphCount > 0 && <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>{paragraphCount} paragraphs</span>}
        </div>

        {publishMsg && (
          <span
            style={{
              fontSize: 12,
              color: publishMsg.includes('failed') || publishMsg.includes('Failed') ? 'var(--accent-red)' : 'var(--accent-green)',
              fontWeight: 500,
            }}
          >
            {publishMsg}
          </span>
        )}

        <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
          <button className="btn btn-green" style={{ fontSize: 12, padding: '5px 11px' }} onClick={handleFinalize}>
            Save final draft
          </button>
          <button
            className={isOfficialPublished ? 'btn btn-ghost' : 'btn btn-secondary'}
            style={{
              fontSize: 12,
              padding: '5px 11px',
              borderColor: isOfficialPublished ? 'transparent' : 'var(--accent-green)',
              color: isOfficialPublished ? 'var(--accent-green)' : 'var(--text-primary)',
            }}
            onClick={handleConfirmPublished}
            disabled={isOfficialPublished || isConfirmingPublished}
            title="After confirmation, agents will no longer intervene in this article"
          >
            已发布
          </button>
        </div>
      </div>

      {isImportOpen && (
        <div className="editor-modal-backdrop" role="dialog" aria-modal="true">
          <div className="editor-modal">
            <div className="editor-modal-header">
              <strong>Import existing final draft</strong>
              <button type="button" className="editor-modal-close" onClick={() => setIsImportOpen(false)} aria-label="Close import dialog">
                ×
              </button>
            </div>
            <input className="editor-import-title focus-purple" value={importTitle} onChange={(e) => setImportTitle(e.target.value)} placeholder="Article title" />
            <textarea
              className="editor-import-content focus-purple"
              value={importContent}
              onChange={(e) => setImportContent(e.target.value)}
              placeholder="Paste an existing article. Plain text or HTML both work..."
            />
            <div className="editor-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setIsImportOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleImport} disabled={isImporting || !importContent.trim()}>
                {isImporting ? 'Importing...' : 'Set as final draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
