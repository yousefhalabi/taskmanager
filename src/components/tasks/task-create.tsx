'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus, X, Calendar, Flag, Tag, FolderOpen } from 'lucide-react'
import { useTaskStore, Priority } from '@/store/task-store'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface TaskCreateProps {
  projectId?: string
}

const priorityColors: Record<Priority, string> = {
  NONE: 'text-muted-foreground',
  LOW: 'text-blue-500',
  MEDIUM: 'text-yellow-500',
  HIGH: 'text-orange-500',
  URGENT: 'text-red-500',
}

export function TaskCreate({ projectId }: TaskCreateProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState<Date | undefined>()
  const [priority, setPriority] = useState<Priority>('NONE')
  const [isLoading, setIsLoading] = useState(false)
  
  const { addTask, projects, selectedProjectId } = useTaskStore()
  const currentProjectId = projectId || selectedProjectId
  const currentProject = projects.find(p => p.id === currentProjectId)

  const handleCreate = async () => {
    if (!title.trim()) return
    setIsLoading(true)
    
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          dueDate: dueDate?.toISOString(),
          priority,
          projectId: currentProjectId,
        }),
      })
      
      if (res.ok) {
        const task = await res.json()
        addTask(task)
        resetForm()
      }
    } catch (error) {
      console.error('Failed to create task:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setDueDate(undefined)
    setPriority('NONE')
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 w-full px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-xl transition-all group"
      >
        <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-dashed border-muted-foreground/50 group-hover:border-primary transition-colors">
          <Plus className="h-3 w-3" />
        </div>
        <span>Add task</span>
        <span className="text-xs text-muted-foreground ml-auto">⌨️ A</span>
      </button>
    )
  }

  return (
    <div className="p-4 bg-card rounded-xl border">
      <div className="space-y-3">
        <Input
          placeholder="Task name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border-none shadow-none px-0 text-base font-medium focus-visible:ring-0"
          autoFocus
        />
        <Textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[60px] resize-none border-none shadow-none px-0 text-sm focus-visible:ring-0"
        />
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Project */}
          {currentProject && (
            <div
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-accent"
            >
              <FolderOpen className="h-3 w-3" style={{ color: currentProject.color }} />
              <span>{currentProject.name}</span>
            </div>
          )}
          
          {/* Due Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {dueDate ? format(dueDate, 'MMM d') : 'Due date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dueDate}
                onSelect={setDueDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          {/* Priority */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <Flag className={cn("h-3 w-3 mr-1", priorityColors[priority])} />
                {priority !== 'NONE' ? priority.charAt(0) + priority.slice(1).toLowerCase() : 'Priority'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setPriority('NONE')}>
                <Flag className="h-4 w-4 mr-2 text-muted-foreground" />
                None
              </DropdownMenuItem>
              {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as Priority[]).map((p) => (
                <DropdownMenuItem key={p} onClick={() => setPriority(p)}>
                  <Flag className={cn("h-4 w-4 mr-2", priorityColors[p])} />
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Clear Due Date */}
          {dueDate && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setDueDate(undefined)}
            >
              <X className="h-3 w-3 mr-1" />
              Clear date
            </Button>
          )}
        </div>
        
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleCreate}
              disabled={!title.trim() || isLoading}
              size="sm"
            >
              {isLoading ? 'Adding...' : 'Add task'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetForm}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
