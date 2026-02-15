import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const subtasks = await db.subtask.findMany({
      where: { taskId: id },
      orderBy: { order: 'asc' }
    })

    return NextResponse.json(subtasks)
  } catch (error) {
    console.error('Failed to fetch subtasks:', error)
    return NextResponse.json({ error: 'Failed to fetch subtasks' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Get max order for subtasks in this task
    const maxOrder = await db.subtask.aggregate({
      where: { taskId: id },
      _max: { order: true }
    })

    const subtask = await db.subtask.create({
      data: {
        title,
        taskId: id,
        order: (maxOrder._max.order || 0) + 1
      }
    })

    return NextResponse.json(subtask)
  } catch (error) {
    console.error('Failed to create subtask:', error)
    return NextResponse.json({ error: 'Failed to create subtask' }, { status: 500 })
  }
}
