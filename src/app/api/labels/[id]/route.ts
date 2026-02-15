import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, color } = body

    const label = await db.label.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color })
      },
      include: {
        project: true
      }
    })

    return NextResponse.json(label)
  } catch (error) {
    console.error('Failed to update label:', error)
    return NextResponse.json({ error: 'Failed to update label' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.label.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete label:', error)
    return NextResponse.json({ error: 'Failed to delete label' }, { status: 500 })
  }
}
