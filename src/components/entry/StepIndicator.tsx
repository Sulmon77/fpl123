// src/components/entry/StepIndicator.tsx

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepIndicatorProps {
  currentStep: number
  steps: string[]
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((label, i) => {
        const stepNum = i + 1
        const isComplete = stepNum < currentStep
        const isActive = stepNum === currentStep
        const isPending = stepNum > currentStep

        return (
          <div key={stepNum} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300',
                  isComplete && 'bg-brand-green text-brand-purple',
                  isActive && 'bg-brand-purple text-white ring-4 ring-brand-purple/20',
                  isPending && 'bg-gray-200 text-gray-400'
                )}
              >
                {isComplete ? (
                  <Check className="w-4 h-4" />
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={cn(
                  'text-xs font-medium hidden sm:block',
                  isActive ? 'text-brand-purple' : 'text-text-secondary'
                )}
              >
                {label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'w-12 sm:w-20 h-0.5 mx-1 mb-4 transition-all duration-300',
                  stepNum < currentStep ? 'bg-brand-green' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
