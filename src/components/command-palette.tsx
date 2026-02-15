'use client'

import { useState, useEffect } from 'react'
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import {
  Plus,
  Inbox,
  Calendar,
  CalendarDays,
  CheckCircle2,
  FolderOpen,
  Settings,
  Keyboard,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'

interface CommandItemConfig {
  name: string
  icon?: React.ReactNode
  shortcut?: string
  action: () => void
}

interface CommandGroupConfig {
  heading: string
  items: CommandItemConfig[]
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)

  // Handle Ctrl+K / Cmd+K to open command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable

      if ((e.ctrlKey || e.metaKey) && e.key === 'k' && !isInput) {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const navigateTo = (view: string) => {
    const el = document.querySelector(`[data-nav="${view}"]`) as HTMLElement
    el?.click()
    setOpen(false)
  }

  const commandGroups: CommandGroupConfig[] = [
    {
      heading: 'Tasks',
      items: [
        {
          name: 'Add new task',
          icon: <Plus className="h-4 w-4" />,
          shortcut: 'a',
          action: () => {
            const btn = document.querySelector('[data-add-task]') as HTMLButtonElement
            btn?.click()
            setOpen(false)
          },
        },
      ],
    },
    {
      heading: 'Navigation',
      items: [
        {
          name: 'Go to Inbox',
          icon: <Inbox className="h-4 w-4" />,
          shortcut: 'g i',
          action: () => navigateTo('inbox'),
        },
        {
          name: 'Go to Today',
          icon: <Calendar className="h-4 w-4" />,
          shortcut: 'g t',
          action: () => navigateTo('today'),
        },
        {
          name: 'Go to Upcoming',
          icon: <CalendarDays className="h-4 w-4" />,
          shortcut: 'g u',
          action: () => navigateTo('upcoming'),
        },
        {
          name: 'Go to Completed',
          icon: <CheckCircle2 className="h-4 w-4" />,
          shortcut: 'g c',
          action: () => navigateTo('completed'),
        },
        {
          name: 'Go to Projects',
          icon: <FolderOpen className="h-4 w-4" />,
          shortcut: 'g p',
          action: () => navigateTo('projects'),
        },
      ],
    },
    {
      heading: 'Help',
      items: [
        {
          name: 'Keyboard shortcuts',
          icon: <Keyboard className="h-4 w-4" />,
          shortcut: '?',
          action: () => {
            // Trigger the ? shortcut to open keyboard shortcuts dialog
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))
            setOpen(false)
          },
        },
      ],
    },
  ]

  return (
    <>
      <KeyboardHint onOpen={() => setOpen(true)} />
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search for a command..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {commandGroups.map((group, index) => (
            <CommandGroup key={group.heading} heading={group.heading}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.name}
                  onSelect={item.action}
                  value={item.name}
                >
                  {item.icon}
                  <span>{item.name}</span>
                  {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
                </CommandItem>
              ))}
              {index < commandGroups.length - 1 && <CommandSeparator />}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}

function KeyboardHint({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors border"
    >
      <Keyboard className="h-4 w-4" />
      <span>Search</span>
      <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
        <span className="text-xs">⌘</span>
        <span className="text-xs">k</span>
      </kbd>
    </button>
  )
}
