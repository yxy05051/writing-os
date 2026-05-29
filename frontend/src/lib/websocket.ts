'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { WsMessage } from './types'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

const RECONNECT_DELAY_MS = 3000
const MAX_RECONNECT_ATTEMPTS = 10
const STATUS_GRACE_MS = 1200

function getWsUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_WRITING_OS_WS_URL
  if (configuredUrl) return configuredUrl
  if (typeof window === 'undefined') return 'ws://127.0.0.1:8000/ws'
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

interface UseWebSocketReturn {
  messages: WsMessage[]
  sendMessage: (msg: object) => void
  connectionStatus: ConnectionStatus
  lastMessage: WsMessage | null
  clearMessages: () => void
}

export function useWebSocket(
  onMessage?: (msg: WsMessage) => void
): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const [messages, setMessages] = useState<WsMessage[]>([])
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null)
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('disconnected')

  const updateConnectionStatus = useCallback((status: ConnectionStatus, immediate = false) => {
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current)
      statusTimerRef.current = null
    }

    if (immediate || status === 'connected') {
      setConnectionStatus(status)
      return
    }

    statusTimerRef.current = setTimeout(() => {
      setConnectionStatus(status)
      statusTimerRef.current = null
    }, STATUS_GRACE_MS)
  }, [])

  const connect = useCallback(() => {
    // Clean up any previous connection.
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
    }

    updateConnectionStatus('connecting')

    try {
      const ws = new WebSocket(getWsUrl())
      wsRef.current = ws

      ws.onopen = () => {
        updateConnectionStatus('connected', true)
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string) as WsMessage
          setLastMessage(data)
          setMessages((prev) => [...prev, data])
          onMessageRef.current?.(data)
        } catch {
          // Ignore non-JSON messages.
        }
      }

      ws.onerror = () => {
        updateConnectionStatus('error')
      }

      ws.onclose = () => {
        updateConnectionStatus('disconnected')
        wsRef.current = null

        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1
          reconnectTimerRef.current = setTimeout(() => {
            connect()
          }, RECONNECT_DELAY_MS)
        }
      }
    } catch {
      updateConnectionStatus('error')
    }
  }, [updateConnectionStatus])

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current)
      }
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
    }
  }, [connect])

  const sendMessage = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    } else {
      console.warn('[WebSocket] Not connected. Message was not sent:', msg)
    }
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setLastMessage(null)
  }, [])

  return { messages, sendMessage, connectionStatus, lastMessage, clearMessages }
}
