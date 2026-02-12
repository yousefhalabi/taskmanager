'use client'

import { useState, useEffect } from 'react'
import { useTaskStore, Task } from '@/store/task-store'
import { TaskItem } from './task-item'
import { TaskCreate } from './task-create'
import { ScrollArea } from '@/components/ui/scroll-area'
import { isToday, isFuture, isPast, startOfDay, addDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, ListTodo, GripVertical } from 'lucide-react'
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
import { Calendar, Flag, Tag } from 'lucide-react'
import { Priority } from '@/store/task-store'
import { format } from 'date-fns'
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
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-50')}>
      <div className="flex items-center">
        <button
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-2"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex-1 group">
          <TaskItem task={task} onEdit={onEdit} />
        </div>
      </div>
    </div>
  )
}

export function TaskList() {
  const { tasks, currentView, selectedProjectId, updateTask, deleteTask, setTasks } = useTaskStore()
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDueDate, setEditDueDate] = useState<Date | undefined>()
  const [editPriority, setEditPriority] = useState<Priority>('NONE')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // 'a' to add new task
      if (e.key === 'a' || e.key === 'A') {
        const addTaskButton = document.querySelector('[data-add-task]') as HTMLButtonElement
        if (addTaskButton) {
          addTaskButton.click()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const openEditDialog = (task: Task) => {
    setEditingTask(task)
    setEditTitle(task.title)
    setEditDescription(task.description || '')
    setEditDueDate(task.dueDate ? new Date(task.dueDate) : undefined)
    setEditPriority(task.priority)
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
        }),
      })
      
      if (res.ok) {
        updateTask(editingTask.id, {
          title: editTitle,
          description: editDescription,
          dueDate: editDueDate?.toISOString(),
          priority: editPriority,
        })
        setEditingTask(null)
      }
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const filterTasks = () => {
    switch (currentView) {
      case 'today':
        return tasks.filter(task => {
          if (task.completed) return false
          if (!task.dueDate) return false
          return isToday(new Date(task.dueDate))
        })
      case 'upcoming':
        return tasks.filter(task => {
          if (task.completed) return false
          if (!task.dueDate) return false
          const date = new Date(task.dueDate)
          return isFuture(date) && !isToday(date)
        }).sort((a, b) => {
          if (!a.dueDate || !b.dueDate) return 0
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        })
      case 'completed':
        return tasks.filter(task => task.completed)
      case 'project':
        return tasks.filter(task => task.projectId === selectedProjectId && !task.completed)
      default: // inbox
        return tasks.filter(task => !task.projectId && !task.completed)
    }
  }

  const filteredTasks = filterTasks()
  const completedCount = tasks.filter(t => t.completed).length
  const todayCount = tasks.filter(t => t.dueDate && isToday(new Date(t.dueDate)) && !t.completed).length
  const upcomingCount = tasks.filter(t => t.dueDate && isFuture(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)) && !t.completed).length

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = filteredTasks.findIndex(t => t.id === active.id)
      const newIndex = filteredTasks.findIndex(t => t.id === over.id)
      
      const newTasks = arrayMove(filteredTasks, oldIndex, newIndex)
      
      // Update order in the store
      newTasks.forEach((task, index) => {
        updateTask(task.id, { order: index })
      })
    }
  }

  return (
    <div className="flex flex-col h-full">
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
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingTask(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={!editTitle.trim()}>
                Save changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
