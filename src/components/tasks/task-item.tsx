'use client'

import { useState, useMemo } from 'react'
import { format, isToday, isTomorrow, isPast, addDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Calendar, Flag, MoreHorizontal, Edit3, Trash2, Tag, ListTodo } from 'lucide-react'
import { Task, Priority, Subtask } from '@/store/task-store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { useTaskStore } from '@/store/task-store'
import { useToast } from '@/hooks/use-toast'
import { SubtaskList } from './subtask-list'

interface TaskItemProps {
  task: Task
  onEdit?: (task: Task) => void
}

const priorityColors: Record<Priority, string> = {
  NONE: 'text-muted-foreground',
  LOW: 'text-blue-500',
  MEDIUM: 'text-yellow-500',
  HIGH: 'text-orange-500',
  URGENT: 'text-red-500',
}

const priorityBgColors: Record<Priority, string> = {
  NONE: 'bg-muted',
  LOW: 'bg-blue-100 dark:bg-blue-900/30',
  MEDIUM: 'bg-yellow-100 dark:bg-yellow-900/30',
  HIGH: 'bg-orange-100 dark:bg-orange-900/30',
  URGENT: 'bg-red-100 dark:bg-red-900/30',
}

export function TaskItem({ task, onEdit }: TaskItemProps) {
  const { toggleTaskComplete, deleteTask, updateTask, subtasks, addSubtask, updateSubtask, deleteSubtask, toggleSubtask } = useTaskStore()
  const { toast } = useToast()
  const [showCalendar, setShowCalendar] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [addDatePickerOpen, setAddDatePickerOpen] = useState(false)
  const taskSubtasks = useMemo(() => subtasks.filter(s => s.taskId === task.id), [subtasks, task.id])

  const handleToggleComplete = async () => {
    const newCompletedState = !task.completed
    toggleTaskComplete(task.id)
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newCompletedState }),
      })
      toast({
        title: newCompletedState ? 'Task completed' : 'Task uncompleted',
        description: newCompletedState
          ? `"${task.title}" marked as done.`
          : `"${task.title}" marked as incomplete.`,
      })
    } catch (error) {
      console.error('Failed to toggle task:', error)
    }
  }

  const handleDelete = async () => {
    const taskTitle = task.title
    deleteTask(task.id)
    setShowDeleteDialog(false)
    try {
      await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
      toast({
        title: 'Task deleted',
        description: `"${taskTitle}" has been removed.`,
      })
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const handleSubtaskToggle = async (subtaskId: string) => {
    // Optimistic update
    toggleSubtask(subtaskId)

    try {
      const res = await fetch(`/api/subtasks/${subtaskId}/toggle`, { method: 'POST' })
      if (!res.ok) {
        // Revert on error
        toggleSubtask(subtaskId)
        toast({
          title: 'Failed to toggle subtask',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to toggle subtask:', error)
      toggleSubtask(subtaskId)
    }
  }

  const handleSubtaskUpdate = async (subtaskId: string, updates: Partial<Subtask>) => {
    try {
      const res = await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        updateSubtask(subtaskId, updates)
      }
    } catch (error) {
      console.error('Failed to update subtask:', error)
    }
  }

  const handleSubtaskDelete = async (subtaskId: string) => {
    try {
      const res = await fetch(`/api/subtasks/${subtaskId}`, { method: 'DELETE' })
      if (res.ok) {
        deleteSubtask(subtaskId)
      }
    } catch (error) {
      console.error('Failed to delete subtask:', error)
    }
  }

  const handleSubtaskAdd = (subtask: Subtask) => {
    addSubtask(subtask)
  }

  const handleDateChange = async (date: Date | undefined) => {
    const newDate = date?.toISOString()
    updateTask(task.id, { dueDate: newDate })
    setShowCalendar(false)
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: newDate }),
      })
    } catch (error) {
      console.error('Failed to update due date:', error)
    }
  }

  const handlePriorityChange = async (priority: Priority) => {
    updateTask(task.id, { priority })
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      })
    } catch (error) {
      console.error('Failed to update priority:', error)
    }
  }

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    if (isPast(date)) return `Overdue - ${format(date, 'MMM d')}`
    return format(date, 'MMM d')
  }

  const dueDate = task.dueDate ? new Date(task.dueDate) : null
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && !task.completed

  return (
    <>
    <div
      className={cn(
        "group flex items-start gap-3 p-4 rounded-xl transition-all",
        "hover:bg-accent/50",
        task.completed && "opacity-60"
      )}
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={handleToggleComplete}
        className="mt-0.5"
      />
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium leading-snug",
          task.completed && "line-through text-muted-foreground"
        )}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {task.description}
          </p>
        )}
        
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {/* Due Date */}
          {task.dueDate && (
            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors",
                    isOverdue
                      ? "text-red-600 bg-red-100 dark:bg-red-900/30"
                      : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  <Calendar className="h-3 w-3" />
                  {formatDateDisplay(task.dueDate)}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dueDate}
                  onSelect={handleDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
          
          {/* Labels */}
          {task.labels.map((label) => (
            <Badge
              key={label.id}
              variant="outline"
              className="text-xs px-2 py-0.5"
              style={{ borderColor: label.color, color: label.color }}
            >
              <Tag className="h-2.5 w-2.5 mr-1" />
              {label.name}
            </Badge>
          ))}
          
          {/* Priority */}
          {task.priority !== 'NONE' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors",
                    priorityBgColors[task.priority]
                  )}
                >
                  <Flag className={cn("h-3 w-3", priorityColors[task.priority])} />
                  {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as Priority[]).map((p) => (
                  <DropdownMenuItem key={p} onClick={() => handlePriorityChange(p)}>
                    <Flag className={cn("h-4 w-4 mr-2", priorityColors[p])} />
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Subtasks */}
          {taskSubtasks.length > 0 && (
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              <ListTodo className="h-2.5 w-2.5 mr-1" />
              {taskSubtasks.filter(s => s.completed).length}/{taskSubtasks.length}
            </Badge>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!task.dueDate && (
          <Popover open={addDatePickerOpen} onOpenChange={setAddDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Calendar className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dueDate}
                onSelect={(date) => {
                  handleDateChange(date)
                  setAddDatePickerOpen(false)
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Flag className={cn("h-4 w-4", priorityColors[task.priority])} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => handlePriorityChange('NONE')}>
              <Flag className="h-4 w-4 mr-2 text-muted-foreground" />
              None
            </DropdownMenuItem>
            {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as Priority[]).map((p) => (
              <DropdownMenuItem key={p} onClick={() => handlePriorityChange(p)}>
                <Flag className={cn("h-4 w-4 mr-2", priorityColors[p])} />
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(task)}>
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete task?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete "{task.title}".
            {taskSubtasks.length > 0 && (
              <>
                <br />
                <span className="text-destructive">
                  This will also delete {taskSubtasks.length} subtask{taskSubtasks.length > 1 ? 's' : ''} associated with this task.
                </span>
              </>
            )}
            <br />
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Subtask List */}
    <SubtaskList
      taskId={task.id}
      subtasks={taskSubtasks}
      onSubtaskAdd={handleSubtaskAdd}
      onSubtaskUpdate={handleSubtaskUpdate}
      onSubtaskDelete={handleSubtaskDelete}
      onSubtaskToggle={handleSubtaskToggle}
    />
    </>
  )
}
