'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { MoreHorizontal, Trash2, Edit3, ChevronDown, ChevronRight, Plus, X } from 'lucide-react'
import { Subtask } from '@/store/task-store'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface SubtaskListProps {
  taskId: string
  subtasks: Subtask[]
  onSubtaskAdd: (subtask: Subtask) => void
  onSubtaskUpdate: (id: string, subtask: Partial<Subtask>) => void
  onSubtaskDelete: (id: string) => void
  onSubtaskToggle: (id: string) => void
}

interface SubtaskItemProps {
  subtask: Subtask
  onToggle: () => void
  onUpdate: (id: string, subtask: Partial<Subtask>) => void
  onDelete: (id: string) => void
}

function SubtaskItem({ subtask, onToggle, onUpdate, onDelete }: SubtaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(subtask.title)
  const { toast } = useToast()

  const handleSaveEdit = async () => {
    if (editTitle.trim() && editTitle !== subtask.title) {
      try {
        const res = await fetch(`/api/subtasks/${subtask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: editTitle }),
        })
        if (res.ok) {
          onUpdate(subtask.id, { title: editTitle })
          setIsEditing(false)
        }
      } catch (error) {
        console.error('Failed to update subtask:', error)
        toast({ title: 'Error', description: 'Failed to update subtask. Please try again.', variant: 'destructive' })
      }
    } else {
      setIsEditing(false)
      setEditTitle(subtask.title)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditTitle(subtask.title)
    }
  }

  return (
    <div className="group flex items-center gap-2 py-1.5">
      <Checkbox
        checked={subtask.completed}
        onCheckedChange={onToggle}
        className="h-4 w-4"
      />
      {isEditing ? (
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSaveEdit}
          onKeyDown={handleKeyDown}
          className="h-7 flex-1 text-sm"
          autoFocus
        />
      ) : (
        <span
          className={cn(
            "flex-1 text-sm",
            subtask.completed && "line-through text-muted-foreground"
          )}
        >
          {subtask.title}
        </span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsEditing(true)}>
            <Edit3 className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => onDelete(subtask.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function SubtaskList({
  taskId,
  subtasks,
  onSubtaskAdd,
  onSubtaskUpdate,
  onSubtaskDelete,
  onSubtaskToggle,
}: SubtaskListProps) {
  const [expanded, setExpanded] = useState(false)
  const [showAddInput, setShowAddInput] = useState(false)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const { toast } = useToast()

  const completedCount = subtasks.filter(s => s.completed).length
  const totalCount = subtasks.length

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return

    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSubtaskTitle }),
      })

      if (res.ok) {
        const subtask = await res.json()
        onSubtaskAdd(subtask)
        setNewSubtaskTitle('')
        if (!expanded) setExpanded(true)
      }
    } catch (error) {
      console.error('Failed to create subtask:', error)
      toast({
        title: 'Failed to create subtask',
        description: 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddSubtask()
    } else if (e.key === 'Escape') {
      setShowAddInput(false)
      setNewSubtaskTitle('')
    }
  }

  if (subtasks.length === 0 && !showAddInput) {
    return null
  }

  return (
    <div className="mt-3 ml-6 border-l-2 border-muted pl-3">
      {/* Header with progress and expand/collapse */}
      <div
        className="flex items-center gap-2 mb-2 cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
      >
        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <span>
            {completedCount}/{totalCount} complete
          </span>
        </button>
        {!expanded && subtasks.length > 0 && (
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            setShowAddInput(true)
          }}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Subtasks list */}
      {expanded && (
        <div className="space-y-1">
          {subtasks.map((subtask) => (
            <SubtaskItem
              key={subtask.id}
              subtask={subtask}
              onToggle={() => onSubtaskToggle(subtask.id)}
              onUpdate={onSubtaskUpdate}
              onDelete={onSubtaskDelete}
            />
          ))}

          {/* Add subtask input */}
          {showAddInput && (
            <div className="flex items-center gap-2 py-1">
              <div className="h-4 w-4 rounded border border-input" />
              <Input
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleAddSubtask}
                placeholder="Add a subtask..."
                className="h-7 flex-1 text-sm"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  setShowAddInput(false)
                  setNewSubtaskTitle('')
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {subtasks.length === 0 && !showAddInput && (
            <p className="text-xs text-muted-foreground">
              No subtasks yet. Click + to add one.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
