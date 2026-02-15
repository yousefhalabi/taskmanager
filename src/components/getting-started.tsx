'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus,
  Keyboard,
  FolderOpen,
  Tag,
  Rocket,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'taskflow-getting-started-seen'

const steps = [
  {
    icon: Rocket,
    title: 'Welcome to TaskFlow',
    description: 'A keyboard-first task manager built for speed. Let\'s walk through the basics in under a minute.',
    content: [
      'TaskFlow is designed around keyboard shortcuts so you can manage tasks without reaching for the mouse.',
      'You can always revisit this guide from the footer link.',
    ],
  },
  {
    icon: Plus,
    title: 'Creating Tasks',
    description: 'Add tasks quickly with your keyboard.',
    content: [
      'Press A to open the task creation form from anywhere.',
      'Type your task title and press Enter to save it.',
      'Add a due date, priority, or labels before saving.',
      'Press Escape to cancel.',
    ],
  },
  {
    icon: Keyboard,
    title: 'Keyboard Shortcuts',
    description: 'Navigate and act without the mouse.',
    content: [
      'Press ? to see all available shortcuts.',
      'Use J/K or arrow keys to move between tasks.',
      'Press Space to toggle a task complete.',
      'Use G + I, G + T, G + U to jump between views.',
      'Press / to focus the search bar.',
    ],
  },
  {
    icon: FolderOpen,
    title: 'Organize with Projects',
    description: 'Group related tasks into projects.',
    content: [
      'Click the + button in the sidebar to create a project.',
      'Drag tasks between projects or assign them when creating.',
      'Star a project to pin it to the Favorites section.',
      'Use G + P to quickly navigate to your projects.',
    ],
  },
  {
    icon: Tag,
    title: 'Labels & Priorities',
    description: 'Categorize and prioritize your work.',
    content: [
      'Set priority levels: None, Low, Medium, High, or Urgent.',
      'Create custom labels with colors to categorize tasks.',
      'Filter tasks by priority or label using the toolbar.',
      'Combine filters to focus on what matters most.',
    ],
  },
]

interface GettingStartedProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GettingStarted({ open, onOpenChange }: GettingStartedProps) {
  const [step, setStep] = useState(0)

  const currentStep = steps[step]
  const Icon = currentStep.icon
  const isFirst = step === 0
  const isLast = step === steps.length - 1

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setStep(0)
    onOpenChange(false)
  }

  const handleNext = () => {
    if (isLast) {
      handleClose()
    } else {
      setStep(step + 1)
    }
  }

  const handlePrev = () => {
    if (!isFirst) {
      setStep(step - 1)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose()
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {currentStep.title}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            {currentStep.description}
          </p>

          <ul className="space-y-2">
            {currentStep.content.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1.5 py-2">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                i === step
                  ? "bg-primary w-6"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={isFirst}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <span className="text-xs text-muted-foreground">
            {step + 1} of {steps.length}
          </span>

          <Button onClick={handleNext}>
            {isLast ? 'Get Started' : 'Next'}
            {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function useGettingStarted() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY)
    if (!seen) {
      setOpen(true)
    }
  }, [])

  return { open, setOpen }
}
