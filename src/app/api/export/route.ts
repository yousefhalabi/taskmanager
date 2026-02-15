import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const exportFormat = searchParams.get('format') || 'json'
    const projectId = searchParams.get('projectId')
    const completed = searchParams.get('completed')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clause based on filters
    const where: any = {}
    if (projectId) {
      where.projectId = projectId
    }
    if (completed !== null && completed !== undefined && completed !== '') {
      where.completed = completed === 'true'
    }
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    // Fetch data
    const [projects, labels, tasks] = await Promise.all([
      db.project.findMany({
        orderBy: { createdAt: 'desc' }
      }),
      db.label.findMany({
        orderBy: { name: 'asc' }
      }),
      db.task.findMany({
        where,
        include: {
          labels: {
            include: {
              label: true
            }
          },
          subtasks: {
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { order: 'asc' }
      })
    ])

    const exportDate = new Date().toISOString()
    const version = '1.0'

    // Transform tasks to match export format
    const exportTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description || '',
      completed: task.completed,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : '',
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      projectId: task.projectId || '',
      projectName: task.project?.name || '',
      labels: task.labels.map(tl => tl.label.name).join(', '),
      subtasks: task.subtasks.map(st => ({
        title: st.title,
        completed: st.completed
      }))
    }))

    const exportProjects = projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description || '',
      color: project.color,
      icon: project.icon || '',
      isFavorite: project.isFavorite,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString()
    }))

    const exportLabels = labels.map(label => ({
      id: label.id,
      name: label.name,
      color: label.color,
      projectId: label.projectId || ''
    }))

    if (exportFormat === 'json') {
      // JSON export
      const jsonData = {
        exportDate,
        version,
        projects: exportProjects,
        labels: exportLabels,
        tasks: exportTasks
      }

      return new NextResponse(JSON.stringify(jsonData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="taskflow-export-${format(exportDate, 'yyyy-MM-dd')}.json"`
        }
      })
    }

    if (exportFormat === 'csv') {
      // CSV export (tasks only)
      const csvHeader = 'Title,Description,Priority,Due Date,Status,Project,Labels,Created Date'
      const csvRows = exportTasks.map(task => {
        const title = escapeCsvField(task.title)
        const description = escapeCsvField(task.description)
        const priority = task.priority
        const dueDate = task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''
        const status = task.completed ? 'Completed' : 'Incomplete'
        const project = escapeCsvField(task.projectName)
        const labels = escapeCsvField(task.labels)
        const created = format(new Date(task.createdAt), 'yyyy-MM-dd')
        return `${title},${description},${priority},${dueDate},${status},${project},${labels},${created}`
      })

      const csvData = [csvHeader, ...csvRows].join('\n')

      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="taskflow-tasks-${format(exportDate, 'yyyy-MM-dd')}.csv"`
        }
      })
    }

    if (exportFormat === 'markdown') {
      // Markdown export
      let markdown = `# TaskFlow Export\n\n`
      markdown += `Export Date: ${format(exportDate, 'yyyy-MM-dd HH:mm:ss')}\n\n`

      // Group tasks by project
      const inboxTasks = exportTasks.filter(t => !t.projectId)
      const tasksByProject = exportTasks
        .filter(t => t.projectId)
        .reduce((acc, task) => {
          const projectName = task.projectName || 'Unknown'
          if (!acc[projectName]) {
            acc[projectName] = []
          }
          acc[projectName].push(task)
          return acc
        }, {} as Record<string, typeof exportTasks>)

      // Inbox
      if (inboxTasks.length > 0) {
        markdown += `## Inbox\n\n`
        markdown += tasksToMarkdown(inboxTasks)
        markdown += '\n'
      }

      // Projects
      Object.entries(tasksByProject).forEach(([projectName, tasks]) => {
        markdown += `## ${projectName}\n\n`
        markdown += tasksToMarkdown(tasks)
        markdown += '\n'
      })

      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="taskflow-export-${format(exportDate, 'yyyy-MM-dd')}.md"`
        }
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('Failed to export data:', error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}

function escapeCsvField(field: string): string {
  if (!field) return ''
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

type TaskForExport = {
  id: string
  title: string
  description: string
  completed: boolean
  priority: string
  dueDate: string
  createdAt: string
  updatedAt: string
  projectId: string
  projectName: string
  labels: string
  subtasks: Array<{ title: string; completed: boolean }>
}

function tasksToMarkdown(tasks: TaskForExport[]): string {
  return tasks.map(task => {
    const checkbox = task.completed ? '- [x]' : '- [ ]'
    const priority = task.priority !== 'NONE' ? ` [${task.priority.charAt(0)}]` : ''
    const dueDate = task.dueDate ? ` 📅 ${format(new Date(task.dueDate), 'MMM d')}` : ''
    const labels = task.labels ? ` 🏷️ ${task.labels}` : ''
    const subtasks = task.subtasks && task.subtasks.length > 0
      ? '\n' + task.subtasks.map(st => `  - ${st.completed ? '[x]' : '[ ]'} ${st.title}`).join('\n')
      : ''
    return `${checkbox}${priority} ${task.title}${dueDate}${labels}${subtasks}`
  }).join('\n')
}
