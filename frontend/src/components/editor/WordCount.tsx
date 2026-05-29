'use client'

import React, { useMemo } from 'react'

interface WordCountProps {
  text: string
  className?: string
  showLabel?: boolean
}

/**
 * Counts CJK characters separately from total non-space characters.
 */
function countChineseChars(text: string): number {
  const matches = text.match(/[一-鿿㐀-䶿豈-﫿]/g)
  return matches ? matches.length : 0
}

/** Counts all non-space characters. */
function countTotalChars(text: string): number {
  return text.replace(/\s/g, '').length
}

/** Formats numbers with thousands separators. */
function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

export default function WordCount({
  text,
  className = '',
  showLabel = true,
}: WordCountProps) {
  const { chinese, total } = useMemo(
    () => ({
      chinese: countChineseChars(text),
      total: countTotalChars(text),
    }),
    [text]
  )

  return (
    <span
      className={className}
      style={{ fontSize: 12, color: 'var(--text-secondary)' }}
      title={`CJK characters: ${formatNumber(chinese)}, total characters: ${formatNumber(total)}`}
    >
      {showLabel ? (
        <>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
            {formatNumber(chinese)}
          </span>
          {' chars'}
          {total !== chinese && (
            <span style={{ color: 'var(--text-disabled)', marginLeft: 6 }}>
              / {formatNumber(total)} total
            </span>
          )}
        </>
      ) : (
        formatNumber(chinese)
      )}
    </span>
  )
}
