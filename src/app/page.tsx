'use client'

import { useEffect, useState } from 'react'
import { useTaskStore } from '@/store/task-store'
import { AppSidebar } from '@/components/app-sidebar'
import { TaskList } from '@/components/tasks/task-list'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Menu, Inbox, Calendar, CalendarDays, CheckCircle2, FolderOpen, TrendingUp, Clock } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { GettingStarted, useGettingStarted } from '@/components/getting-started'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { isToday, isFuture, isPast, startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

const viewConfig = {
  inbox: { title: 'Inbox', icon: Inbox, description: 'Tasks without a project' },
  today: { title: 'Today', icon: Calendar, description: "Tasks due today" },
  upcoming: { title: 'Upcoming', icon: CalendarDays, description: 'Tasks scheduled for later' },
  completed: { title: 'Completed', icon: CheckCircle2, description: 'Tasks you\'ve finished' },
  project: { title: 'Project', icon: FolderOpen, description: 'Project tasks' },
}

export default function Home() {
  const { 
    tasks, 
    projects, 
    currentView, 
    selectedProjectId,
    setTasks, 
    setProjects, 
    setCurrentView,
    setSelectedProjectId,
    sidebarOpen,
    setSidebarOpen,
    isLoading,
    setIsLoading 
  } = useTaskStore()
  const { toast } = useToast()
  
  const [mounted, setMounted] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const { open: gettingStartedOpen, setOpen: setGettingStartedOpen } = useGettingStarted()

  useEffect(() => {
    setMounted(true)
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/projects'),
      ])
      
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json()
        setTasks(tasksData)
      }
      
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json()
        setProjects(projectsData)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast({ title: 'Error', description: 'Failed to load data. Please refresh the page.', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const currentProject = projects.find(p => p.id === selectedProjectId)
  const config = currentView === 'project' && currentProject 
    ? { ...viewConfig.project, title: currentProject.name, description: currentProject.description || 'Project tasks' }
    : viewConfig[currentView]
  
  const Icon = config.icon
  
  // Calculate stats
  const completedCount = tasks.filter(t => t.completed).length
  const totalCount = tasks.length
  const todayCount = tasks.filter(t => t.dueDate && isToday(new Date(t.dueDate)) && !t.completed).length
  const overdueCount = tasks.filter(t => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)) && !t.completed).length
  const upcomingCount = tasks.filter(t => t.dueDate && isFuture(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)) && !t.completed).length
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Weekly activity
  const weekStart = startOfWeek(new Date())
  const weekEnd = endOfWeek(new Date())
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const weekActivity = weekDays.map(day => ({
    day: format(day, 'EEE'),
    completed: tasks.filter(t => t.completed && t.updatedAt && isToday(new Date(t.updatedAt))).length
  }))

  if (!mounted) {
    return (
      <div className="flex h-screen bg-background">
        <div className="hidden lg:block w-72 bg-muted/30 animate-pulse" />
        <div className="flex-1 p-8">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
          <div className="h-4 w-32 bg-muted animate-pulse rounded mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between px-4 lg:px-6 py-4">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <SheetDescription className="sr-only">
                    Navigate between different views and projects in TaskFlow
                  </SheetDescription>
                  <AppSidebar onNavigate={() => setMobileSidebarOpen(false)} />
                </SheetContent>
              </Sheet>
              
              <div className="flex items-center gap-3">
                {currentView === 'project' && currentProject ? (
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-lg"
                    style={{ backgroundColor: currentProject.color + '20' }}
                  >
                    <Icon className="h-5 w-5" style={{ color: currentProject.color }} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-orange-500 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-semibold">{config.title}</h1>
                  <p className="text-sm text-muted-foreground">{config.description}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
          
          {/* Stats Bar */}
          <div className="px-4 lg:px-6 pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedCount}</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-500/20" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Today</p>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{todayCount}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-orange-500/20" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Overdue</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{overdueCount}</p>
                    </div>
                    <Clock className="h-8 w-8 text-red-500/20" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Progress</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{completionRate}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-500/20" />
                  </div>
                  <Progress value={completionRate} className="h-1 mt-2" />
                </CardContent>
              </Card>
            </div>
          </div>
        </header>
        
        {/* Task List */}
        <main className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <TaskList />
          )}
        </main>

        {/* Footer */}
        <Footer onShowGuide={() => setGettingStartedOpen(true)} />
      </div>

      {/* Getting Started Guide */}
      <GettingStarted open={gettingStartedOpen} onOpenChange={setGettingStartedOpen} />
    </div>
  )
}
