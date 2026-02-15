'use client'

import { useState, useEffect } from 'react'
import { useTaskStore, Task } from '@/store/task-store'
import { TaskItem } from './task-item'
import { TaskCreate } from './task-create'
import { KeyboardShortcutsHelp } from '@/components/keyboard-shortcuts'
import { useKeyboardShortcuts, KeyboardShortcutMap } from '@/hooks/use-keyboard-shortcuts'
import { ScrollArea } from '@/components/ui/scroll-area'
import { isToday, isFuture, isPast, startOfDay, addDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, ListTodo, GripVertical, Keyboard } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Calendar, Flag, Tag, Search, X, FolderOpen, Inbox } from 'lucide-react'
import { Priority } from '@/store/task-store'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { LabelManager } from '@/components/label-manager'
import { LabelPicker } from '@/components/label-picker'

const priorityColors: Record<Priority, string> = {
  NONE: 'text-muted-foreground',
  LOW: 'text-blue-500',
  MEDIUM: 'text-yellow-500',
  HIGH: 'text-orange-500',
  URGENT: 'text-red-500',
}

interface SortableTaskItemProps {
  task: Task
  onEdit: (task: Task) => void
}

function SortableTaskItem({ task, onEdit }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  }

  return (
    <div ref={setNodeRef} style={style} className={cn('group', isDragging && 'opacity-50')}>
      <div className="flex items-center">
        <button
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-2"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <TaskItem task={task} onEdit={onEdit} />
        </div>
      </div>
    </div>
  )
}

export function TaskList() {
  const { tasks, currentView, selectedProjectId, updateTask, deleteTask, setTasks, searchQuery, setSearchQuery, priorityFilter, setPriorityFilter, labelFilter, setLabelFilter, labels, setLabels, projects } = useTaskStore()
  const { toast } = useToast()
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDueDate, setEditDueDate] = useState<Date | undefined>()
  const [editPriority, setEditPriority] = useState<Priority>('NONE')
  const [editLabelIds, setEditLabelIds] = useState<string[]>([])
  const [editProjectId, setEditProjectId] = useState<string | null>(null)
  const [labelManagerOpen, setLabelManagerOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Load labels on mount
  useEffect(() => {
    fetch('/api/labels')
      .then((res) => res.json())
      .then((data) => setLabels(data))
      .catch((error) => {
        console.error('Failed to fetch labels:', error)
        toast({
          title: 'Error',
          description: 'Failed to load labels.',
          variant: 'destructive',
        })
      })
  }, [setLabels])
  const openEditDialog = (task: Task) => {
    setEditingTask(task)
    setEditTitle(task.title)
    setEditDescription(task.description || '')
    setEditDueDate(task.dueDate ? new Date(task.dueDate) : undefined)
    setEditPriority(task.priority)
    setEditLabelIds(task.labels.map(label => label.id))
    setEditProjectId(task.projectId || null)
  }

  const handleSaveEdit = async () => {
    if (!editingTask) return

    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          dueDate: editDueDate?.toISOString(),
          priority: editPriority,
          labelIds: editLabelIds,
          projectId: editProjectId,
        }),
      })

      if (res.ok) {
        const updatedTask = await res.json()
        updateTask(editingTask.id, updatedTask)
        setEditingTask(null)
        toast({
          title: 'Task updated',
          description: `"${editTitle}" has been updated.`,
        })
      }
    } catch (error) {
      console.error('Failed to update task:', error)
      toast({
        title: 'Error',
        description: 'Failed to update task. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const filterTasks = () => {
    let filtered = tasks

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        (task.description && task.description.toLowerCase().includes(query))
      )
    }

    // Apply priority filter
    if (priorityFilter !== 'ALL') {
      filtered = filtered.filter(task => task.priority === priorityFilter)
    }

    // Apply label filter
    if (labelFilter) {
      filtered = filtered.filter(task =>
        task.labels.some(label => label.id === labelFilter)
      )
    }

    // Apply view filter
    switch (currentView) {
      case 'today':
        return filtered.filter(task => {
          if (task.completed) return false
          if (!task.dueDate) return false
          return isToday(new Date(task.dueDate))
        })
      case 'upcoming':
        return filtered.filter(task => {
          if (task.completed) return false
          if (!task.dueDate) return false
          const date = new Date(task.dueDate)
          return isFuture(date) && !isToday(date)
        }).sort((a, b) => {
          if (!a.dueDate || !b.dueDate) return 0
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        })
      case 'completed':
        return filtered.filter(task => task.completed)
      case 'project':
        return filtered.filter(task => task.projectId === selectedProjectId && !task.completed)
      default: // inbox
        return filtered.filter(task => !task.projectId && !task.completed)
    }
  }

  const filteredTasks = filterTasks()
  const completedCount = tasks.filter(t => t.completed).length
  const todayCount = tasks.filter(t => t.dueDate && isToday(new Date(t.dueDate)) && !t.completed).length
  const upcomingCount = tasks.filter(t => t.dueDate && isFuture(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)) && !t.completed).length

  const getFocusedTask = (): Task | undefined => {
    const taskEl = document.activeElement?.closest('[data-task-id]')
    if (!taskEl) return undefined
    const taskId = taskEl.getAttribute('data-task-id')
    return filteredTasks.find(t => t.id === taskId)
  }

  const shortcuts: KeyboardShortcutMap = {
    'a': {
      description: 'Add new task',
      action: () => {
        const btn = document.querySelector('[data-add-task]') as HTMLButtonElement
        btn?.click()
      },
    },
    'j': {
      description: 'Navigate to next task',
      action: () => {
        const allTasks = Array.from(document.querySelectorAll('[data-task-id]'))
        if (allTasks.length === 0) return
        const focused = document.activeElement?.closest('[data-task-id]')
        const idx = focused ? allTasks.indexOf(focused as Element) : -1
        const next = allTasks[Math.min(idx + 1, allTasks.length - 1)] as HTMLElement
        next.focus()
        next.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      },
    },
    'k': {
      description: 'Navigate to previous task',
      action: () => {
        const allTasks = Array.from(document.querySelectorAll('[data-task-id]'))
        if (allTasks.length === 0) return
        const focused = document.activeElement?.closest('[data-task-id]')
        const idx = focused ? allTasks.indexOf(focused as Element) : allTasks.length
        const prev = allTasks[Math.max(idx - 1, 0)] as HTMLElement
        prev.focus()
        prev.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      },
    },
    ' ': {
      description: 'Toggle task completion',
      action: () => {
        const taskEl = document.activeElement?.closest('[data-task-id]')
        if (taskEl) {
          const checkbox = taskEl.querySelector('[role="checkbox"]') as HTMLElement
          checkbox?.click()
        }
      },
    },
    'delete': {
      description: 'Delete selected task',
      action: () => {
        const task = getFocusedTask()
        if (task) setDeletingTask(task)
      },
    },
    'backspace': {
      description: 'Delete selected task',
      action: () => {
        const task = getFocusedTask()
        if (task) setDeletingTask(task)
      },
    },
    'enter': {
      description: 'Edit selected task',
      action: () => {
        const task = getFocusedTask()
        if (task) openEditDialog(task)
      },
    },
    'escape': {
      description: 'Close dialogs / Cancel',
      action: () => {
        if (deletingTask) {
          setDeletingTask(null)
        } else if (editingTask) {
          setEditingTask(null)
        } else if (shortcutsOpen) {
          setShortcutsOpen(false)
        } else if (searchQuery) {
          setSearchQuery('')
        }
      },
    },
    '/': {
      description: 'Focus search',
      action: () => {
        const input = document.querySelector('[data-search-input]') as HTMLInputElement
        if (input) {
          input.focus()
          input.select()
        }
      },
    },
    '?': {
      description: 'Show keyboard shortcuts',
      action: () => setShortcutsOpen(true),
    },
    'g i': {
      description: 'Go to Inbox',
      action: () => {
        const el = document.querySelector('[data-nav="inbox"]') as HTMLElement
        el?.click()
      },
    },
    'g t': {
      description: 'Go to Today',
      action: () => {
        const el = document.querySelector('[data-nav="today"]') as HTMLElement
        el?.click()
      },
    },
    'g u': {
      description: 'Go to Upcoming',
      action: () => {
        const el = document.querySelector('[data-nav="upcoming"]') as HTMLElement
        el?.click()
      },
    },
    'g c': {
      description: 'Go to Completed',
      action: () => {
        const el = document.querySelector('[data-nav="completed"]') as HTMLElement
        el?.click()
      },
    },
    'g p': {
      description: 'Go to Projects',
      action: () => {
        const el = document.querySelector('[data-nav="projects"]') as HTMLElement
        el?.click()
      },
    },
  }

  useKeyboardShortcuts(shortcuts)

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = filteredTasks.findIndex(t => t.id === active.id)
      const newIndex = filteredTasks.findIndex(t => t.id === over.id)

      const newTasks = arrayMove(filteredTasks, oldIndex, newIndex)

      // Update order in the store
      newTasks.forEach((task, index) => {
        updateTask(task.id, { order: index })
      })

      // Persist order to database
      try {
        await Promise.all(
          newTasks.map((task, index) =>
            fetch(`/api/tasks/${task.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ order: index }),
            })
          )
        )
      } catch (error) {
        console.error('Failed to update task order:', error)
        toast({
          title: 'Error',
          description: 'Failed to save task order. Please try again.',
          variant: 'destructive',
        })
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search and Filter Bar */}
      <div className="flex items-center gap-2 p-4 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
            data-search-input
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0">
              <Flag className={cn("h-4 w-4 mr-2", priorityFilter !== 'ALL' ? priorityColors[priorityFilter as Priority] : 'text-muted-foreground')} />
              {priorityFilter === 'ALL' ? 'All Priorities' : priorityFilter.charAt(0) + priorityFilter.slice(1).toLowerCase()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setPriorityFilter('ALL')}>
              <Flag className="h-4 w-4 mr-2 text-muted-foreground" />
              All Priorities
            </DropdownMenuItem>
            {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as Priority[]).map((p) => (
              <DropdownMenuItem key={p} onClick={() => setPriorityFilter(p)}>
                <Flag className={cn("h-4 w-4 mr-2", priorityColors[p])} />
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <LabelPicker
          selectedLabelIds={labelFilter ? [labelFilter] : []}
          onLabelIdsChange={(ids) => setLabelFilter(ids[0] || null)}
          trigger={
            <Button variant="outline" size="sm" className="shrink-0">
              <Tag className={cn("h-4 w-4 mr-2", labelFilter ? 'text-foreground' : 'text-muted-foreground')} />
              {labelFilter ? labels.find(l => l.id === labelFilter)?.name || 'Labels' : 'Labels'}
            </Button>
          }
        />
        <Button variant="ghost" size="sm" onClick={() => setLabelManagerOpen(true)}>
          <Tag className="h-4 w-4" />
        </Button>
      </div>

      <LabelManager open={labelManagerOpen} onOpenChange={setLabelManagerOpen} />

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-1">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <ListTodo className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No tasks yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {currentView === 'today' && "You're all caught up for today!"}
                {currentView === 'upcoming' && "No upcoming tasks scheduled."}
                {currentView === 'completed' && "No completed tasks yet."}
                {currentView === 'project' && "Add tasks to this project to get started."}
                {currentView === 'inbox' && "Create your first task to get started."}
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredTasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {filteredTasks.map((task) => (
                  <SortableTaskItem
                    key={task.id}
                    task={task}
                    onEdit={openEditDialog}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </ScrollArea>
      
      {/* Task Creation */}
      <div className="border-t p-4">
        <TaskCreate />
      </div>
      
      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    {editDueDate ? format(editDueDate, 'MMM d, yyyy') : 'Due date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={editDueDate}
                    onSelect={setEditDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Flag className={cn("h-4 w-4 mr-2", priorityColors[editPriority])} />
                    {editPriority !== 'NONE' ? editPriority.charAt(0) + editPriority.slice(1).toLowerCase() : 'Priority'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setEditPriority('NONE')}>
                    <Flag className="h-4 w-4 mr-2 text-muted-foreground" />
                    None
                  </DropdownMenuItem>
                  {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as Priority[]).map((p) => (
                    <DropdownMenuItem key={p} onClick={() => setEditPriority(p)}>
                      <Flag className={cn("h-4 w-4 mr-2", priorityColors[p])} />
                      {p.charAt(0) + p.slice(1).toLowerCase()}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <LabelPicker
                selectedLabelIds={editLabelIds}
                onLabelIdsChange={setEditLabelIds}
              />

              {/* Project */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {editProjectId ? (
                      <>
                        <FolderOpen className="h-4 w-4 mr-2" style={{ color: projects.find(p => p.id === editProjectId)?.color }} />
                        {projects.find(p => p.id === editProjectId)?.name || 'Project'}
                      </>
                    ) : (
                      <>
                        <Inbox className="h-4 w-4 mr-2 text-muted-foreground" />
                        Inbox
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setEditProjectId(null)}>
                    <Inbox className="h-4 w-4 mr-2 text-muted-foreground" />
                    Inbox (no project)
                  </DropdownMenuItem>
                  {projects.map((project) => (
                    <DropdownMenuItem key={project.id} onClick={() => setEditProjectId(project.id)}>
                      <FolderOpen className="h-4 w-4 mr-2" style={{ color: project.color }} />
                      {project.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingTask(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={!editTitle.trim()} data-save-task>
                Save changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Keyboard Delete Confirmation */}
      <AlertDialog open={!!deletingTask} onOpenChange={(open) => !open && setDeletingTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deletingTask?.title}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deletingTask) return
                const taskTitle = deletingTask.title
                deleteTask(deletingTask.id)
                setDeletingTask(null)
                try {
                  await fetch(`/api/tasks/${deletingTask.id}`, { method: 'DELETE' })
                  toast({
                    title: 'Task deleted',
                    description: `"${taskTitle}" has been removed.`,
                  })
                } catch (error) {
                  console.error('Failed to delete task:', error)
                  toast({
                    title: 'Error',
                    description: 'Failed to delete task. Please try again.',
                    variant: 'destructive',
                  })
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsHelp open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      {/* Keyboard Help Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShortcutsOpen(true)}
        className="fixed bottom-4 right-4 z-50 opacity-30 hover:opacity-100 transition-opacity"
        title="Keyboard shortcuts (?)"
      >
        <Keyboard className="h-5 w-5" />
      </Button>
    </div>
  )
}
