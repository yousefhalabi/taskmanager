import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const projects = await db.project.findMany({
      include: {
        _count: {
          select: { tasks: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json(projects)
  } catch (error) {
    console.error('Failed to fetch projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, color, icon } = body
    
    const project = await db.project.create({
      data: {
        name,
        description,
        color: color || '#6366f1',
        icon,
      },
      include: {
        _count: {
          select: { tasks: true }
        }
      }
    })
    
    return NextResponse.json(project)
  } catch (error) {
    console.error('Failed to create project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
