'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Tag, X } from 'lucide-react'
import { useTaskStore, Label as LabelType } from '@/store/task-store'
import { cn } from '@/lib/utils'

interface LabelPickerProps {
  selectedLabelIds: string[]
  onLabelIdsChange: (labelIds: string[]) => void
  trigger?: React.ReactNode
}

export function LabelPicker({ selectedLabelIds, onLabelIdsChange, trigger }: LabelPickerProps) {
  const { labels } = useTaskStore()
  const [open, setOpen] = useState(false)

  const toggleLabel = (labelId: string) => {
    if (selectedLabelIds.includes(labelId)) {
      onLabelIdsChange(selectedLabelIds.filter((id) => id !== labelId))
    } else {
      onLabelIdsChange([...selectedLabelIds, labelId])
    }
  }

  const selectedLabels = labels.filter((label) => selectedLabelIds.includes(label.id))

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
      <Tag className="h-3 w-3" />
      {selectedLabels.length > 0 ? (
        <span className="flex gap-1">
          {selectedLabels.slice(0, 2).map((label) => (
            <span
              key={label.id}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: label.color }}
            />
          ))}
          {selectedLabels.length > 2 && (
            <span className="text-muted-foreground">+{selectedLabels.length - 2}</span>
          )}
        </span>
      ) : (
        'Labels'
      )}
    </Button>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-4">
          <div className="space-y-2">
            {labels.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No labels created yet
              </div>
            ) : (
              labels.map((label) => (
                <button
                  key={label.id}
                  onClick={() => toggleLabel(label.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    "hover:bg-accent",
                    selectedLabelIds.includes(label.id) && "bg-accent"
                  )}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="flex-1 text-left">{label.name}</span>
                  {selectedLabelIds.includes(label.id) && (
                    <X className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
