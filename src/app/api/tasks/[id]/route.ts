import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const task = await db.task.findUnique({
      where: { id },
      include: {
        labels: {
          include: {
            label: true
          }
        }
      }
    })
    
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      ...task,
      labels: task.labels.map(tl => tl.label)
    })
  } catch (error) {
    console.error('Failed to fetch task:', error)
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, description, completed, dueDate, priority, projectId, labelIds } = body
    
    await db.task.update({
      where: { id },
      data: {
        title,
        description,
        completed,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        projectId: projectId === null ? null : projectId,
      },
    })

    // Handle label updates if provided
    if (labelIds !== undefined) {
      await db.taskLabel.deleteMany({
        where: { taskId: id }
      })

      if (labelIds.length > 0) {
        await db.taskLabel.createMany({
          data: labelIds.map((labelId: string) => ({
            taskId: id,
            labelId
          }))
        })
      }
    }

    // Re-fetch to get current state including fresh labels
    const task = await db.task.findUnique({
      where: { id },
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
      labels: task!.labels.map(tl => tl.label)
    })
  } catch (error) {
    console.error('Failed to update task:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.task.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete task:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
