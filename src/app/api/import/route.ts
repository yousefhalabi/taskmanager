import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import Papa from 'papaparse'

interface ExportData {
  version: string
  exportDate: string
  projects: Array<{
    id: string
    name: string
    description?: string
    color: string
    icon?: string
    isFavorite?: boolean
  }>
  labels: Array<{
    id: string
    name: string
    color: string
    projectId?: string
  }>
  tasks: Array<{
    id?: string
    title: string
    description?: string
    completed?: boolean
    priority?: string
    dueDate?: string
    projectId?: string
    labels?: string | string[]
    subtasks?: Array<{ title: string; completed: boolean }>
  }>
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const duplicateHandling = formData.get('duplicateHandling') as string || 'skip'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileContent = await file.text()
    const fileName = file.name.toLowerCase()

    let result: { imported: number; skipped: number; errors: string[] }

    if (fileName.endsWith('.json')) {
      result = await importFromJson(fileContent, duplicateHandling)
    } else if (fileName.endsWith('.csv')) {
      result = await importFromCsv(fileContent, duplicateHandling)
    } else {
      return NextResponse.json({ error: 'Unsupported file format. Use JSON or CSV.' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to import data:', error)
    return NextResponse.json({ error: 'Failed to import data' }, { status: 500 })
  }
}

async function importFromJson(content: string, duplicateHandling: string) {
  const imported = { projects: 0, labels: 0, tasks: 0 }
  const skipped = { projects: 0, labels: 0, tasks: 0 }
  const errors: string[] = []

  try {
    const data: ExportData = JSON.parse(content)

    // Validate basic structure
    if (!data.tasks || !Array.isArray(data.tasks)) {
      throw new Error('Invalid JSON format: missing or invalid tasks array')
    }

    // Create a map of old IDs to new IDs for projects and labels
    const projectMap = new Map<string, string>()
    const labelMap = new Map<string, string>()

    // Import projects
    if (data.projects && Array.isArray(data.projects)) {
      for (const project of data.projects) {
        try {
          const existing = await db.project.findFirst({
            where: { name: project.name }
          })

          if (existing && duplicateHandling === 'skip') {
            skipped.projects++
            projectMap.set(project.id, existing.id)
            continue
          }

          const created = await db.project.upsert({
            where: existing ? { id: existing.id } : { id: 'temp' },
            create: {
              name: project.name,
              description: project.description || null,
              color: project.color,
              icon: project.icon || null,
              isFavorite: project.isFavorite || false
            },
            update: duplicateHandling === 'overwrite' ? {
              name: project.name,
              description: project.description || null,
              color: project.color,
              icon: project.icon || null,
              isFavorite: project.isFavorite || false
            } : {}
          })

          projectMap.set(project.id, created.id)
          if (existing && duplicateHandling === 'overwrite') skipped.projects++
          else imported.projects++
        } catch (e) {
          errors.push(`Failed to import project "${project.name}": ${e}`)
        }
      }
    }

    // Import labels
    if (data.labels && Array.isArray(data.labels)) {
      for (const label of data.labels) {
        try {
          const existing = await db.label.findFirst({
            where: { name: label.name }
          })

          if (existing && duplicateHandling === 'skip') {
            skipped.labels++
            labelMap.set(label.id, existing.id)
            continue
          }

          // Map the project ID
          const newProjectId = label.projectId ? projectMap.get(label.projectId) : null

          const created = await db.label.upsert({
            where: existing ? { id: existing.id } : { id: 'temp' },
            create: {
              name: label.name,
              color: label.color,
              projectId: newProjectId || null
            },
            update: duplicateHandling === 'overwrite' ? {
              name: label.name,
              color: label.color,
              projectId: newProjectId || null
            } : {}
          })

          labelMap.set(label.id, created.id)
          if (existing && duplicateHandling === 'overwrite') skipped.labels++
          else imported.labels++
        } catch (e) {
          errors.push(`Failed to import label "${label.name}": ${e}`)
        }
      }
    }

    // Import tasks
    for (const task of data.tasks) {
      try {
        const existing = await db.task.findFirst({
          where: { title: task.title }
        })

        if (existing && duplicateHandling === 'skip') {
          skipped.tasks++
          continue
        }

        // Map the project ID and label IDs
        const newProjectId = task.projectId ? projectMap.get(task.projectId) : null

        // Parse labels
        let taskLabels: string[] = []
        if (typeof task.labels === 'string') {
          taskLabels = task.labels.split(',').map(l => l.trim()).filter(Boolean)
        } else if (Array.isArray(task.labels)) {
          taskLabels = task.labels as string[]
        }

        // Find or get label IDs
        const labelIds = await Promise.all(
          taskLabels.map(async (labelName) => {
            const label = await db.label.findFirst({
              where: { name: labelName }
            })
            return label?.id
          })
        ).then(ids => ids.filter(Boolean) as string[])

        // Create the task
        const created = await db.task.create({
          data: {
            title: task.title,
            description: task.description || null,
            completed: task.completed || false,
            priority: (task.priority as any) || 'NONE',
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            projectId: newProjectId || null,
            order: await getNextOrder(newProjectId),
            labels: labelIds.length > 0 ? {
              create: labelIds.map(labelId => ({ labelId }))
            } : undefined
          }
        })

        // Import subtasks if present
        if (task.subtasks && Array.isArray(task.subtasks)) {
          for (const subtask of task.subtasks) {
            await db.subtask.create({
              data: {
                title: subtask.title,
                completed: subtask.completed,
                taskId: created.id,
                order: await getNextSubtaskOrder(created.id)
              }
            })
          }
        }

        if (existing && duplicateHandling === 'overwrite') {
          await db.task.delete({ where: { id: existing.id } })
          skipped.tasks++
        } else {
          imported.tasks++
        }
      } catch (e) {
        errors.push(`Failed to import task "${task.title}": ${e}`)
      }
    }

    return {
      imported: imported.projects + imported.labels + imported.tasks,
      skipped: skipped.projects + skipped.labels + skipped.tasks,
      errors
    }
  } catch (error) {
    throw new Error(`Invalid JSON: ${error}`)
  }
}

async function importFromCsv(content: string, duplicateHandling: string) {
  const imported = 0
  const skipped = 0
  const errors: string[] = []

  return new Promise<{ imported: number; skipped: number; errors: string[] }>((resolve) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let count = 0
        let skipCount = 0

        for (const row of results.data as any) {
          try {
            const title = row.Title || row.title || ''
            const description = row.Description || row.description || ''
            const priority = mapPriority(row.Priority || row.priority)
            const dueDate = row['Due Date'] || row.dueDate || row.due_date || ''
            const status = row.Status || row.status || ''
            const projectName = row.Project || row.project || ''
            const labels = row.Labels || row.labels || ''

            if (!title) continue

            const existing = await db.task.findFirst({
              where: { title }
            })

            if (existing && duplicateHandling === 'skip') {
              skipCount++
              continue
            }

            // Find or create project
            let projectId: string | null = null
            if (projectName) {
              const project = await db.project.findFirst({
                where: { name: projectName }
              })
              if (project) {
                projectId = project.id
              } else {
                const created = await db.project.create({
                  data: {
                    name: projectName,
                    color: '#6366f1'
                  }
                })
                projectId = created.id
              }
            }

            // Find or create labels
            const labelNames = labels.split(',').map((l: string) => l.trim()).filter(Boolean)
            const labelIds = await Promise.all(
              labelNames.map(async (name: string) => {
                const label = await db.label.findFirst({
                  where: { name }
                })
                if (label) return label.id
                const created = await db.label.create({
                  data: { name, color: '#6b7280' }
                })
                return created.id
              })
            )

            // Create task
            await db.task.create({
              data: {
                title,
                description: description || null,
                completed: status.toLowerCase() === 'completed' || status.toLowerCase() === 'done',
                priority,
                dueDate: dueDate ? new Date(dueDate) : null,
                projectId,
                order: await getNextOrder(projectId),
                labels: labelIds.length > 0 ? {
                  create: labelIds.map(labelId => ({ labelId }))
                } : undefined
              }
            })

            if (existing && duplicateHandling === 'overwrite') {
              await db.task.delete({ where: { id: existing.id } })
              skipCount++
            } else {
              count++
            }
          } catch (e) {
            errors.push(`Failed to import row: ${e}`)
          }
        }

        resolve({ imported: count, skipped: skipCount, errors })
      },
      error: (error) => {
        resolve({ imported: 0, skipped: 0, errors: [error.message] })
      }
    })
  })
}

function mapPriority(priority: string): any {
  const p = (priority || '').toLowerCase()
  if (p.includes('urgent')) return 'URGENT'
  if (p.includes('high')) return 'HIGH'
  if (p.includes('medium') || p.includes('med')) return 'MEDIUM'
  if (p.includes('low')) return 'LOW'
  return 'NONE'
}

async function getNextOrder(projectId: string | null): Promise<number> {
  const result = await db.task.aggregate({
    where: projectId ? { projectId } : { projectId: null },
    _max: { order: true }
  })
  return (result._max.order || 0) + 1
}

async function getNextSubtaskOrder(taskId: string): Promise<number> {
  const result = await db.subtask.aggregate({
    where: { taskId },
    _max: { order: true }
  })
  return (result._max.order || 0) + 1
}
