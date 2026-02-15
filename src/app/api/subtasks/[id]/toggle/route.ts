import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // First get the current subtask
    const subtask = await db.subtask.findUnique({
      where: { id }
    })

    if (!subtask) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 })
    }

    // Toggle the completed status
    const updated = await db.subtask.update({
      where: { id },
      data: {
        completed: !subtask.completed
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to toggle subtask:', error)
    return NextResponse.json({ error: 'Failed to toggle subtask' }, { status: 500 })
  }
}
