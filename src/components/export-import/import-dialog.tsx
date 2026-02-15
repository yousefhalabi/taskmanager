'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, FileJson, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ValidationData {
  valid: boolean
  format: 'json' | 'csv'
  recordCount: number
  preview?: any[]
  errors: string[]
  warnings: string[]
}

interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [validation, setValidation] = useState<ValidationData | null>(null)
  const [validating, setValidating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'merge' | 'overwrite'>('skip')
  const [result, setResult] = useState<ImportResult | null>(null)

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setFile(null)
      setValidation(null)
      setResult(null)
      setDuplicateHandling('skip')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [open])

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile)
    setValidating(true)
    setValidation(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/import/validate', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to validate file')
      }

      const data: ValidationData = await response.json()
      setValidation(data)
    } catch (error) {
      console.error('Validation error:', error)
      toast({
        title: 'Validation failed',
        description: 'Failed to validate the file. Please try another file.',
        variant: 'destructive',
      })
    } finally {
      setValidating(false)
    }
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('duplicateHandling', duplicateHandling)

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to import data')
      }

      const data: ImportResult = await response.json()
      setResult(data)

      toast({
        title: 'Import successful',
        description: `Imported ${data.imported} items${data.skipped > 0 ? ` and skipped ${data.skipped}` : ''}.`,
      })

      // Close dialog after a short delay if successful
      if (data.errors.length === 0) {
        setTimeout(() => {
          onOpenChange(false)
        }, 1500)
      }
    } catch (error) {
      console.error('Import error:', error)
      toast({
        title: 'Import failed',
        description: 'Failed to import your data. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  const getFileIcon = () => {
    if (!file) return null
    if (file.name.endsWith('.json')) return <FileJson className="h-8 w-8 text-blue-500" />
    if (file.name.endsWith('.csv')) return <FileSpreadsheet className="h-8 w-8 text-green-500" />
    return null
  }

  const getFormatBadge = () => {
    if (!file) return null
    const format = file.name.endsWith('.json') ? 'JSON' : 'CSV'
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
        {format}
      </span>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Data</DialogTitle>
          <DialogDescription>
            Import tasks from a backup or another task manager.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${file ? 'border-primary' : 'border-muted hover:border-muted-foreground/50'}
            `}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv"
              className="hidden"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0]
                if (selectedFile) handleFileSelect(selectedFile)
              }}
            />
            {file ? (
              <div className="space-y-2">
                {getFileIcon()}
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null)
                    setValidation(null)
                    setResult(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                >
                  Choose different file
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
                <div>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select a file
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    or drag and drop a JSON or CSV file
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Validation Status */}
          {validating && (
            <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2" />
              <span>Validating file...</span>
            </div>
          )}

          {validation && !result && (
            <div className="space-y-3">
              {/* Validation Result */}
              <div className={`
                p-3 rounded-lg flex items-start gap-2
                ${validation.valid ? 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100' : 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100'}
              `}>
                {validation.valid ? (
                  <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-medium">
                    {validation.valid ? 'Valid file' : 'Invalid file'}
                  </p>
                  <p className="text-sm opacity-90">
                    {validation.recordCount} {validation.recordCount === 1 ? 'record' : 'records'} found
                  </p>
                </div>
                {getFormatBadge()}
              </div>

              {/* Preview */}
              {validation.preview && validation.preview.length > 0 && (
                <div className="space-y-2">
                  <Label>Preview (first 5 records)</Label>
                  <ScrollArea className="h-40 rounded-md border">
                    <div className="p-3 space-y-2">
                      {validation.preview.map((item, i) => (
                        <div key={i} className="text-sm p-2 bg-muted/30 rounded">
                          <p className="font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Priority: {item.priority} | Status: {item.completed !== undefined ? (item.completed ? 'Completed' : 'Incomplete') : item.status}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Warnings */}
              {validation.warnings.length > 0 && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium">Warnings</p>
                      <ul className="text-sm mt-1 list-disc list-inside space-y-1">
                        {validation.warnings.map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Errors */}
              {validation.errors.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium">Errors</p>
                      <ul className="text-sm mt-1 list-disc list-inside space-y-1">
                        {validation.errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Duplicate Handling */}
              <div className="space-y-2">
                <Label>Duplicate Handling</Label>
                <RadioGroup value={duplicateHandling} onValueChange={(v) => setDuplicateHandling(v as any)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="skip" id="skip" />
                    <Label htmlFor="skip" className="cursor-pointer">
                      Skip duplicates - Keep existing items
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="merge" id="merge" />
                    <Label htmlFor="merge" className="cursor-pointer">
                      Merge - Add new items only
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="overwrite" id="overwrite" />
                    <Label htmlFor="overwrite" className="cursor-pointer">
                      Overwrite - Replace existing items
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Import Result */}
          {result && (
            <div className="space-y-3">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">Import completed</p>
                    <p className="text-sm opacity-90">
                      {result.imported} items imported
                      {result.skipped > 0 && ` and ${result.skipped} skipped`}
                    </p>
                  </div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100 rounded-lg">
                  <p className="font-medium mb-2">Some items had errors:</p>
                  <ScrollArea className="h-24">
                    <ul className="text-sm space-y-1">
                      {result.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}

              <Progress value={100} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!validation || !validation.valid || importing}
          >
            {importing ? 'Importing...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
