import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'

interface ValidationResponse {
  valid: boolean
  format: 'json' | 'csv' | 'unknown'
  recordCount: number
  preview?: any[]
  errors: string[]
  warnings: string[]
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileContent = await file.text()
    const fileName = file.name.toLowerCase()

    let result: ValidationResponse

    if (fileName.endsWith('.json')) {
      result = await validateJson(fileContent)
    } else if (fileName.endsWith('.csv')) {
      result = await validateCsv(fileContent)
    } else {
      return NextResponse.json({
        valid: false,
        format: 'unknown',
        recordCount: 0,
        errors: ['Unsupported file format. Use JSON or CSV.'],
        warnings: []
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to validate file:', error)
    return NextResponse.json({ error: 'Failed to validate file' }, { status: 500 })
  }
}

async function validateJson(content: string): Promise<ValidationResponse> {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    const data = JSON.parse(content)

    // Check basic structure
    if (!data.tasks || !Array.isArray(data.tasks)) {
      errors.push('Invalid JSON: missing or invalid tasks array')
      return {
        valid: false,
        format: 'json',
        recordCount: 0,
        errors,
        warnings
      }
    }

    // Validate tasks
    const previewTasks: any[] = []
    for (let i = 0; i < Math.min(data.tasks.length, 5); i++) {
      const task = data.tasks[i]
      if (!task.title) {
        errors.push(`Task at index ${i} is missing a title`)
      }
      previewTasks.push({
        title: task.title || '(no title)',
        completed: task.completed ?? false,
        priority: task.priority ?? 'NONE',
        dueDate: task.dueDate || ''
      })
    }

    // Check for projects
    if (data.projects && Array.isArray(data.projects) && data.projects.length > 0) {
      data.projects.forEach((project: any, i: number) => {
        if (!project.name) {
          errors.push(`Project at index ${i} is missing a name`)
        }
      })
    }

    // Check for labels
    if (data.labels && Array.isArray(data.labels) && data.labels.length > 0) {
      data.labels.forEach((label: any, i: number) => {
        if (!label.name) {
          errors.push(`Label at index ${i} is missing a name`)
        }
      })
    }

    // Warnings
    if (data.tasks.length > 1000) {
      warnings.push(`Large dataset: ${data.tasks.length} tasks may take some time to import`)
    }

    if (!data.version) {
      warnings.push('Export version not specified')
    }

    return {
      valid: errors.length === 0,
      format: 'json',
      recordCount: data.tasks.length,
      preview: previewTasks,
      errors,
      warnings
    }
  } catch (error) {
    errors.push(`Invalid JSON: ${error}`)
    return {
      valid: false,
      format: 'json',
      recordCount: 0,
      errors,
      warnings
    }
  }
}

function validateCsv(content: string): Promise<ValidationResponse> {
  return new Promise((resolve) => {
    const errors: string[] = []
    const warnings: string[] = []

    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const preview: any[] = []

        // Validate each row
        for (let i = 0; i < Math.min(results.data.length, 5); i++) {
          const row = results.data[i] as any
          const title = row.Title || row.title

          if (!title) {
            errors.push(`Row ${i + 1} is missing a Title column`)
          }

          preview.push({
            title: title || '(no title)',
            priority: row.Priority || row.priority || 'NONE',
            status: row.Status || row.status || '',
            dueDate: row['Due Date'] || row.dueDate || row.due_date || ''
          })
        }

        // Check for required columns
        if (results.meta.fields) {
          const fields = results.meta.fields.map(f => f.toLowerCase())
          if (!fields.includes('title')) {
            errors.push('CSV missing required "Title" column')
          }
        }

        // Warnings
        if (results.data.length > 1000) {
          warnings.push(`Large dataset: ${results.data.length} rows may take some time to import`)
        }

        if (!fields.includes('project')) {
          warnings.push('No "Project" column found. All tasks will be imported to inbox.')
        }

        resolve({
          valid: errors.length === 0,
          format: 'csv',
          recordCount: results.data.length,
          preview,
          errors,
          warnings
        })
      },
      error: (error) => {
        errors.push(`Invalid CSV: ${error.message}`)
        resolve({
          valid: false,
          format: 'csv',
          recordCount: 0,
          errors,
          warnings
        })
      }
    })
  })
}

// Get fields for type checking
let fields: string[] = []
