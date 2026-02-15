'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label as FormLabel } from '@/components/ui/label'
import { Plus, X, Edit3, Trash2, Tag } from 'lucide-react'
import { useTaskStore, Label } from '@/store/task-store'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
]

interface LabelManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LabelManager({ open, onOpenChange }: LabelManagerProps) {
  const { labels, addLabel, updateLabel, deleteLabel } = useTaskStore()
  const { toast } = useToast()

  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[5])
  const [editingLabel, setEditingLabel] = useState<Label | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return

    try {
      const res = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLabelName,
          color: newLabelColor,
        }),
      })

      if (res.ok) {
        const label = await res.json()
        addLabel(label)
        setNewLabelName('')
        setNewLabelColor(PRESET_COLORS[5])
        toast({
          title: 'Label created',
          description: `"${label.name}" has been added.`,
        })
      }
    } catch (error) {
      console.error('Failed to create label:', error)
    }
  }

  const handleUpdateLabel = async () => {
    if (!editingLabel) return

    try {
      const res = await fetch(`/api/labels/${editingLabel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          color: editColor,
        }),
      })

      if (res.ok) {
        updateLabel(editingLabel.id, { name: editName, color: editColor })
        setEditingLabel(null)
        toast({
          title: 'Label updated',
          description: `"${editName}" has been updated.`,
        })
      }
    } catch (error) {
      console.error('Failed to update label:', error)
    }
  }

  const handleDeleteLabel = async (label: Label) => {
    try {
      await fetch(`/api/labels/${label.id}`, { method: 'DELETE' })
      deleteLabel(label.id)
      toast({
        title: 'Label deleted',
        description: `"${label.name}" has been removed.`,
      })
    } catch (error) {
      console.error('Failed to delete label:', error)
    }
  }

  const openEditDialog = (label: Label) => {
    setEditingLabel(label)
    setEditName(label.name)
    setEditColor(label.color)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Labels</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Create New Label */}
          <div className="space-y-3">
            <FormLabel className="text-sm font-medium">Create New Label</FormLabel>
            <div className="flex gap-2">
              <Input
                placeholder="Label name..."
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleCreateLabel} disabled={!newLabelName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewLabelColor(color)}
                  className={`w-6 h-6 rounded-full transition-all ${
                    newLabelColor === color ? 'ring-2 ring-offset-2 ring-primary' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Existing Labels */}
          {labels.length > 0 && (
            <div className="space-y-3">
              <FormLabel className="text-sm font-medium">Existing Labels</FormLabel>
              <div className="space-y-2">
                {labels.map((label) => (
                  <div
                    key={label.id}
                    className="flex items-center gap-2 p-2 rounded-lg border bg-accent/50"
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="flex-1 text-sm">{label.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEditDialog(label)}
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDeleteLabel(label)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {labels.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No labels yet. Create one above!</p>
            </div>
          )}
        </div>

        {/* Edit Label Dialog */}
        <Dialog open={!!editingLabel} onOpenChange={(open) => !open && setEditingLabel(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Edit Label</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <FormLabel htmlFor="edit-label-name">Name</FormLabel>
                <Input
                  id="edit-label-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <FormLabel>Color</FormLabel>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditColor(color)}
                      className={`w-6 h-6 rounded-full transition-all ${
                        editColor === color ? 'ring-2 ring-offset-2 ring-primary' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingLabel(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateLabel} disabled={!editName.trim()}>
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
