'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Keyboard, X, Plus, Search, Circle, CheckCircle2, CalendarDays, Calendar, FolderOpen, Flag, ArrowUp, ArrowDown, ArrowRight, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

const shortcuts = [
  {
    category: 'Task Actions',
    items: [
      { key: 'A', description: 'Add new task', icon: Plus },
      { key: 'Space', description: 'Toggle task completion', icon: Circle },
      { key: 'Enter', description: 'Save task / Submit form', icon: CheckCircle2 },
      { key: 'Esc', description: 'Close dialogs / Cancel', icon: X },
      { key: 'Del', description: 'Delete selected task', icon: ArrowRight },
    ],
  },
  {
    category: 'Navigation',
    items: [
      { key: 'J / ↓', description: 'Navigate to next task', icon: ArrowDown },
      { key: 'K / ↑', description: 'Navigate to previous task', icon: ArrowUp },
      { key: 'G + I', description: 'Go to Inbox', icon: Inbox },
      { key: 'G + T', description: 'Go to Today', icon: Calendar },
      { key: 'G + U', description: 'Go to Upcoming', icon: CalendarDays },
      { key: 'G + C', description: 'Go to Completed', icon: CheckCircle2 },
      { key: 'G + P', description: 'Go to Projects', icon: FolderOpen },
    ],
  },
  {
    category: 'View Switch',
    items: [
      { key: '/', description: 'Focus search input', icon: Search },
      { key: 'Esc', description: 'Clear search', icon: ArrowRight },
    ],
  },
  {
    category: 'Priority (when editing)',
    items: [
      { key: '1', description: 'Set priority to None', icon: Flag },
      { key: '2', description: 'Set priority to Low', icon: Flag },
      { key: '3', description: 'Set priority to Medium', icon: Flag },
      { key: '4', description: 'Set priority to High', icon: Flag },
      { key: '5', description: 'Set priority to Urgent', icon: Flag },
    ],
  },
  {
    category: 'Other',
    items: [
      { key: '?', description: 'Show this help', icon: Keyboard },
    ],
  },
]

interface KeyboardShortcutsHelpProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} data-shortcuts-dialog>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-3">
                      <kbd
                        className={cn(
                          "px-3 py-1.5 rounded-md border bg-muted font-mono text-sm min-w-[50px] text-center",
                          "font-bold"
                        )}
                      >
                        {item.key}
                      </kbd>
                      <span className="text-sm">{item.description}</span>
                    </div>
                    <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
