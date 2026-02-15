import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const subtask = await db.subtask.findUnique({
      where: { id }
    })

    if (!subtask) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 })
    }

    return NextResponse.json(subtask)
  } catch (error) {
    console.error('Failed to fetch subtask:', error)
    return NextResponse.json({ error: 'Failed to fetch subtask' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, completed, order } = body

    const subtask = await db.subtask.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(completed !== undefined && { completed }),
        ...(order !== undefined && { order })
      }
    })

    return NextResponse.json(subtask)
  } catch (error) {
    console.error('Failed to update subtask:', error)
    return NextResponse.json({ error: 'Failed to update subtask' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.subtask.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete subtask:', error)
    return NextResponse.json({ error: 'Failed to delete subtask' }, { status: 500 })
  }
}
