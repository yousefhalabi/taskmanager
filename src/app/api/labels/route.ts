import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const labels = await db.label.findMany({
      include: {
        project: true
      },
      orderBy: {
        name: 'asc'
      }
    })
    return NextResponse.json(labels)
  } catch (error) {
    console.error('Failed to fetch labels:', error)
    return NextResponse.json({ error: 'Failed to fetch labels' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, color, projectId } = body

    // Validate project exists if projectId is provided
    if (projectId) {
      const project = await db.project.findUnique({
        where: { id: projectId }
      })
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 400 })
      }
    }

    const label = await db.label.create({
      data: {
        name,
        color: color || '#6b7280',
        projectId: projectId || null
      },
      include: {
        project: true
      }
    })

    return NextResponse.json(label)
  } catch (error) {
    console.error('Failed to create label:', error)
    return NextResponse.json({ error: 'Failed to create label' }, { status: 500 })
  }
}
