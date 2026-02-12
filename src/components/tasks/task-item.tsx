'use client'

import { useState } from 'react'
import { format, isToday, isTomorrow, isPast, addDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Calendar, Flag, MoreHorizontal, Edit3, Trash2, Tag } from 'lucide-react'
import { Task, Priority } from '@/store/task-store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { useTaskStore } from '@/store/task-store'

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
  const { toggleTaskComplete, deleteTask, updateTask } = useTaskStore()
  const [showCalendar, setShowCalendar] = useState(false)

  const handleToggleComplete = async () => {
    toggleTaskComplete(task.id)
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed }),
      })
    } catch (error) {
      console.error('Failed to toggle task:', error)
    }
  }

  const handleDelete = async () => {
    deleteTask(task.id)
    try {
      await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
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
        </div>
      </div>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!task.dueDate && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Calendar className="h-4 w-4" />
              </Button>
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
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
