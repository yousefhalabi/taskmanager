'use client'

import { useState } from 'react'
import { Download, FileJson, FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { Calendar } from 'lucide-react'
import { useTaskStore } from '@/store/task-store'
import { useToast } from '@/hooks/use-toast'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const { projects } = useTaskStore()
  const { toast } = useToast()

  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'markdown'>('json')
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [completedOnly, setCompletedOnly] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const params = new URLSearchParams({ format: exportFormat })

      if (selectedProject !== 'all') {
        params.append('projectId', selectedProject)
      }

      if (completedOnly) {
        params.append('completed', 'true')
      }

      if (startDate) {
        params.append('startDate', startDate.toISOString())
      }

      if (endDate) {
        params.append('endDate', endDate.toISOString())
      }

      const response = await fetch(`/api/export?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      const date = format(new Date(), 'yyyy-MM-dd')
      const extension = exportFormat === 'json' ? 'json' : exportFormat === 'csv' ? 'csv' : 'md'
      const filename = `taskflow-${exportFormat}-${date}.${extension}`

      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Export successful',
        description: `Your data has been exported as ${exportFormat.toUpperCase()}.`,
      })

      onOpenChange(false)
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Export failed',
        description: 'Failed to export your data. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription>
            Choose a format and filters to export your tasks and projects.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setExportFormat('json')}
                className={`
                  flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                  ${exportFormat === 'json' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'}
                `}
              >
                <FileJson className="h-6 w-6" />
                <span className="text-sm font-medium">JSON</span>
                <span className="text-xs text-muted-foreground">Full backup</span>
              </button>

              <button
                onClick={() => setExportFormat('csv')}
                className={`
                  flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                  ${exportFormat === 'csv' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'}
                `}
              >
                <FileSpreadsheet className="h-6 w-6" />
                <span className="text-sm font-medium">CSV</span>
                <span className="text-xs text-muted-foreground">Spreadsheet</span>
              </button>

              <button
                onClick={() => setExportFormat('markdown')}
                className={`
                  flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                  ${exportFormat === 'markdown' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'}
                `}
              >
                <FileText className="h-6 w-6" />
                <span className="text-sm font-medium">Markdown</span>
                <span className="text-xs text-muted-foreground">Documents</span>
              </button>
            </div>
          </div>

          {/* Project Filter */}
          <div className="space-y-2">
            <Label htmlFor="project">Project (optional)</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger id="project">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects + Inbox</SelectItem>
                <SelectItem value="inbox">Inbox only</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: project.color }}
                      />
                      {project.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Completion Filter */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="completed"
              checked={completedOnly}
              onCheckedChange={(checked) => setCompletedOnly(checked as boolean)}
            />
            <Label htmlFor="completed" className="cursor-pointer">
              Export completed tasks only
            </Label>
          </div>

          {/* Date Range Filter */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Date (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`
                      w-full justify-start text-left font-normal
                      ${!startDate && 'text-muted-foreground'}
                    `}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {startDate ? format(startDate, 'MMM d, yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`
                      w-full justify-start text-left font-normal
                      ${!endDate && 'text-muted-foreground'}
                    `}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {endDate ? format(endDate, 'MMM d, yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Format Info */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            {exportFormat === 'json' && (
              <p className="text-muted-foreground">
                JSON exports include tasks, projects, labels, and subtasks. This format is best for backups and full restores.
              </p>
            )}
            {exportFormat === 'csv' && (
              <p className="text-muted-foreground">
                CSV exports tasks only, suitable for spreadsheets and other apps. Includes title, description, priority, due date, status, project, and labels.
              </p>
            )}
            {exportFormat === 'markdown' && (
              <p className="text-muted-foreground">
                Markdown exports tasks formatted as a checklist, grouped by project. Great for documentation and sharing.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
