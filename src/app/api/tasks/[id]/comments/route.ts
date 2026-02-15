import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const comments = await db.comment.findMany({
      where: { taskId: id },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return NextResponse.json(comments)
  } catch (error) {
    console.error('Failed to fetch comments:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { content } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Verify task exists
    const task = await db.task.findUnique({
      where: { id }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const comment = await db.comment.create({
      data: {
        content,
        taskId: id
      }
    })

    return NextResponse.json(comment)
  } catch (error) {
    console.error('Failed to create comment:', error)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}
