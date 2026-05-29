'use client'

import { useState, useCallback } from 'react'
import { startPipeline, continuePipeline, rerunAgent } from '@/lib/api'
import { PIPELINE_STEPS } from '@/lib/types'

interface UsePipelineReturn {
  currentStep: number
  isRunning: boolean
  error: string | null
  startPipelineFlow: (articleNum: number) => Promise<void>
  continueStep: (message?: string) => Promise<void>
  rerunStep: (agentId: string, context?: string) => Promise<void>
  setCurrentStep: (step: number) => void
  resetPipeline: () => void
}

export function usePipeline(): UsePipelineReturn {
  const [currentStep, setCurrentStep] = useState<number>(-1)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Article number currently attached to the pipeline.
  const [articleNum, setArticleNum] = useState<number>(1)

  const startPipelineFlow = useCallback(async (num: number) => {
    setError(null)
    setIsRunning(true)
    setCurrentStep(0)
    setArticleNum(num)

    try {
      await startPipeline(num)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start')
      setIsRunning(false)
    }
  }, [])

  const continueStep = useCallback(
    async (message?: string) => {
      if (currentStep < 0 || currentStep >= PIPELINE_STEPS.length) return

      const agentId = PIPELINE_STEPS[currentStep].id
      setError(null)
      setIsRunning(true)

      try {
        await continuePipeline(agentId, message ?? '')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to send')
        setIsRunning(false)
      }
    },
    [currentStep]
  )

  const rerunStep = useCallback(
    async (agentId: string, context?: string) => {
      setError(null)
      setIsRunning(true)

      try {
        await rerunAgent(agentId, context ?? '')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to rerun')
        setIsRunning(false)
      }
    },
    []
  )

  const resetPipeline = useCallback(() => {
    setCurrentStep(-1)
    setIsRunning(false)
    setError(null)
  }, [])

  return {
    currentStep,
    isRunning,
    error,
    startPipelineFlow,
    continueStep,
    rerunStep,
    setCurrentStep,
    resetPipeline,
  }
}
