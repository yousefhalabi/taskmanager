import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const tasks = await db.task.findMany({
      include: {
        labels: {
          include: {
            label: true
          }
        }
      },
      orderBy: {
        order: 'asc'
      }
    })
    
    return NextResponse.json(tasks.map(task => ({
      ...task,
      labels: task.labels.map(tl => tl.label)
    })))
  } catch (error) {
    console.error('Failed to fetch tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, dueDate, priority, projectId, labelIds } = body
    
    // Get the max order for tasks in this project or inbox
    const maxOrder = await db.task.aggregate({
      where: projectId ? { projectId } : { projectId: null },
      _max: { order: true }
    })
    
    const task = await db.task.create({
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 'NONE',
        projectId: projectId || null,
        order: (maxOrder._max.order || 0) + 1,
        labels: labelIds ? {
          create: labelIds.map((labelId: string) => ({
            labelId
          }))
        } : undefined
      },
      include: {
        labels: {
          include: {
            label: true
          }
        }
      }
    })
    
    return NextResponse.json({
      ...task,
      labels: task.labels.map(tl => tl.label)
    })
  } catch (error) {
    console.error('Failed to create task:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
