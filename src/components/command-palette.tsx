'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTaskStore } from '@/store/task-store'
import { useTheme } from 'next-themes'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import {
  Inbox,
  Calendar,
  CalendarDays,
  CheckCircle2,
  FolderOpen,
  Plus,
  Sun,
  Moon,
  Monitor,
  Search,
  Tag,
  Flag,
} from 'lucide-react'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const {
    tasks,
    projects,
    labels,
    setCurrentView,
    setSelectedProjectId,
    setSearchQuery,
  } = useTaskStore()
  const { setTheme } = useTheme()
  const [search, setSearch] = useState('')

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const close = useCallback(() => onOpenChange(false), [onOpenChange])

  const navigateTo = useCallback(
    (view: 'inbox' | 'today' | 'upcoming' | 'completed', projectId?: string) => {
      if (view === 'completed') {
        setCurrentView('completed')
        setSelectedProjectId(null)
      } else {
        setCurrentView(view)
        setSelectedProjectId(null)
      }
      close()
    },
    [setCurrentView, setSelectedProjectId, close]
  )

  const navigateToProject = useCallback(
    (projectId: string) => {
      setCurrentView('project')
      setSelectedProjectId(projectId)
      close()
    },
    [setCurrentView, setSelectedProjectId, close]
  )

  const openAddTask = useCallback(() => {
    close()
    // Small delay to let the dialog close before triggering the add button
    setTimeout(() => {
      const btn = document.querySelector('[data-add-task]') as HTMLButtonElement
      btn?.click()
    }, 100)
  }, [close])

  const focusSearch = useCallback(() => {
    close()
    setTimeout(() => {
      const input = document.querySelector('[data-search-input]') as HTMLInputElement
      if (input) {
        input.focus()
        input.select()
      }
    }, 100)
  }, [close])

  const openTask = useCallback(
    (taskId: string) => {
      close()
      setTimeout(() => {
        const taskEl = document.querySelector(`[data-task-id="${taskId}"]`) as HTMLElement
        if (taskEl) {
          taskEl.focus()
          taskEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }, 100)
    },
    [close]
  )

  const filterByLabel = useCallback(
    (labelId: string) => {
      const { setLabelFilter } = useTaskStore.getState()
      setLabelFilter(labelId)
      close()
    },
    [close]
  )

  const incompleteTasks = useMemo(
    () => tasks.filter((t) => !t.completed),
    [tasks]
  )

  const priorityIcon = (priority: string) => {
    const colors: Record<string, string> = {
      URGENT: 'text-red-500',
      HIGH: 'text-orange-500',
      MEDIUM: 'text-yellow-500',
      LOW: 'text-blue-500',
      NONE: 'text-muted-foreground',
    }
    return colors[priority] || 'text-muted-foreground'
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} showCloseButton={false}>
      <CommandInput
        placeholder="Type a command or search..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="Actions">
          <CommandItem onSelect={openAddTask}>
            <Plus className="mr-2 h-4 w-4" />
            Create new task
            <CommandShortcut>A</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={focusSearch}>
            <Search className="mr-2 h-4 w-4" />
            Search tasks
            <CommandShortcut>/</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigateTo('inbox')}>
            <Inbox className="mr-2 h-4 w-4" />
            Go to Inbox
            <CommandShortcut>G I</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo('today')}>
            <Calendar className="mr-2 h-4 w-4" />
            Go to Today
            <CommandShortcut>G T</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo('upcoming')}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Go to Upcoming
            <CommandShortcut>G U</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo('completed')}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Go to Completed
            <CommandShortcut>G C</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        {/* Projects */}
        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  onSelect={() => navigateToProject(project.id)}
                >
                  <FolderOpen
                    className="mr-2 h-4 w-4"
                    style={{ color: project.color }}
                  />
                  {project.name}
                  {project._count && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {project._count.tasks} tasks
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Tasks */}
        {incompleteTasks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tasks">
              {incompleteTasks.slice(0, 10).map((task) => (
                <CommandItem key={task.id} onSelect={() => openTask(task.id)}>
                  <Flag className={`mr-2 h-4 w-4 ${priorityIcon(task.priority)}`} />
                  <span className="truncate">{task.title}</span>
                  {task.projectId && (
                    <span className="ml-auto text-xs text-muted-foreground truncate max-w-[120px]">
                      {projects.find((p) => p.id === task.projectId)?.name}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Labels */}
        {labels.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Filter by Label">
              {labels.map((label) => (
                <CommandItem
                  key={label.id}
                  onSelect={() => filterByLabel(label.id)}
                >
                  <Tag className="mr-2 h-4 w-4" style={{ color: label.color }} />
                  {label.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        {/* Theme */}
        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => { setTheme('light'); close() }}>
            <Sun className="mr-2 h-4 w-4" />
            Light mode
          </CommandItem>
          <CommandItem onSelect={() => { setTheme('dark'); close() }}>
            <Moon className="mr-2 h-4 w-4" />
            Dark mode
          </CommandItem>
          <CommandItem onSelect={() => { setTheme('system'); close() }}>
            <Monitor className="mr-2 h-4 w-4" />
            System theme
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
