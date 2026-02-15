'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  Inbox,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Plus,
  ChevronDown,
  ChevronRight,
  Star,
  MoreHorizontal,
  Trash2,
  Edit3,
  Menu,
  X,
  Settings,
  Download,
  Upload
} from 'lucide-react'
import { useTaskStore, Project } from '@/store/task-store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { ExportDialog } from '@/components/export-import/export-dialog'
import { ImportDialog } from '@/components/export-import/import-dialog'

const PROJECT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e'
]

interface SidebarProps {
  onNavigate?: () => void
}

export function AppSidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const {
    projects,
    currentView,
    setCurrentView,
    setSelectedProjectId,
    sidebarOpen,
    deleteProject,
    addProject,
    updateProject
  } = useTaskStore()
  const { toast } = useToast()

  const [projectsExpanded, setProjectsExpanded] = useState(true)
  const [favoritesExpanded, setFavoritesExpanded] = useState(true)
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [editProjectOpen, setEditProjectOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0])
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  const favoriteProjects = projects.filter(p => p.isFavorite)
  const regularProjects = projects.filter(p => !p.isFavorite)

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription,
          color: selectedColor,
        }),
      })

      if (res.ok) {
        const project = await res.json()
        addProject(project)
        setNewProjectName('')
        setNewProjectDescription('')
        setNewProjectOpen(false)
      }
    } catch (error) {
      console.error('Failed to create project:', error)
      toast({ title: 'Error', description: 'Failed to create project. Please try again.', variant: 'destructive' })
    }
  }

  const handleEditProject = async () => {
    if (!editingProject || !editName.trim()) return

    try {
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          color: editColor,
          icon: editIcon,
        }),
      })

      if (res.ok) {
        const project = await res.json()
        updateProject(editingProject.id, project)
        setEditProjectOpen(false)
        setEditingProject(null)
      }
    } catch (error) {
      console.error('Failed to update project:', error)
      toast({ title: 'Error', description: 'Failed to update project. Please try again.', variant: 'destructive' })
    }
  }

  const openEditDialog = (project: Project) => {
    setEditingProject(project)
    setEditName(project.name)
    setEditDescription(project.description || '')
    setEditColor(project.color)
    setEditIcon(project.icon || '')
    setEditProjectOpen(true)
  }

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return

    try {
      await fetch(`/api/projects/${projectToDelete.id}`, { method: 'DELETE' })
      deleteProject(projectToDelete.id)
      setDeleteConfirmOpen(false)
      setProjectToDelete(null)
    } catch (error) {
      console.error('Failed to delete project:', error)
      toast({ title: 'Error', description: 'Failed to delete project. Please try again.', variant: 'destructive' })
    }
  }

  const handleDeleteClick = (project: Project) => {
    setProjectToDelete(project)
    setDeleteConfirmOpen(true)
  }

  const navItems = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: 0 },
    { id: 'today', label: 'Today', icon: Calendar, count: 0 },
    { id: 'upcoming', label: 'Upcoming', icon: CalendarDays, count: 0 },
    { id: 'completed', label: 'Completed', icon: CheckCircle2, count: 0 },
  ]

  const handleNavClick = (view: typeof currentView, projectId?: string) => {
    setCurrentView(view)
    if (projectId) {
      setSelectedProjectId(projectId)
    } else {
      setSelectedProjectId(null)
    }
    onNavigate?.()
  }

  return (
    <div className={cn(
      "flex flex-col h-full bg-background border-r transition-all duration-300",
      "w-64 lg:w-72"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-bold bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent">
          TaskFlow
        </h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setExportDialogOpen(true)}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import Data
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {/* Main Navigation */}
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id as typeof currentView)}
              data-nav={item.id}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                "hover:bg-accent",
                currentView === item.id && !useTaskStore.getState().selectedProjectId
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Favorites Section */}
        {favoriteProjects.length > 0 && (
          <div className="mt-4 px-3">
            <button
              onClick={() => setFavoritesExpanded(!favoritesExpanded)}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              {favoritesExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              Favorites
            </button>
            {favoritesExpanded && (
              <div className="space-y-0.5 mt-1">
                {favoriteProjects.map((project) => (
                  <ProjectItem
                    key={project.id}
                    project={project}
                    onEdit={openEditDialog}
                    onDelete={handleDeleteClick}
                    onClick={() => handleNavClick('project', project.id)}
                    isActive={currentView === 'project' && useTaskStore.getState().selectedProjectId === project.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Projects Section */}
        <div className="mt-4 px-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setProjectsExpanded(!projectsExpanded)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              {projectsExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Projects
            </button>
            <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Project Name</Label>
                    <Input
                      id="name"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Enter project name..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      placeholder="Enter project description..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {PROJECT_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={cn(
                            "w-6 h-6 rounded-full transition-transform",
                            selectedColor === color && "ring-2 ring-offset-2 ring-foreground scale-110"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleCreateProject} className="w-full">
                    Create Project
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {projectsExpanded && (
            <div className="space-y-0.5 mt-1">
              {regularProjects.map((project) => (
                <ProjectItem
                  key={project.id}
                  project={project}
                  onEdit={openEditDialog}
                  onDelete={handleDeleteClick}
                  onClick={() => handleNavClick('project', project.id)}
                  isActive={currentView === 'project' && useTaskStore.getState().selectedProjectId === project.id}
                />
              ))}
              {regularProjects.length === 0 && (
                <p className="text-xs text-muted-foreground px-3 py-2">
                  No projects yet. Create one to get started!
                </p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Edit Project Dialog */}
      <Dialog open={editProjectOpen} onOpenChange={setEditProjectOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Project Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter project name..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Enter project description..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-icon">Icon (optional)</Label>
              <Input
                id="edit-icon"
                value={editIcon}
                onChange={(e) => setEditIcon(e.target.value)}
                placeholder="Enter emoji or icon name..."
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {PROJECT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setEditColor(color)}
                    className={cn(
                      "w-6 h-6 rounded-full transition-transform",
                      editColor === color && "ring-2 ring-offset-2 ring-foreground scale-110"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleEditProject} className="flex-1">
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditProjectOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              {projectToDelete && (
                <>
                  Are you sure you want to delete "{projectToDelete.name}"?
                  {projectToDelete._count && projectToDelete._count.tasks > 0 && (
                    <>
                      <br />
                      <br />
                      <span className="text-destructive">
                        This will also delete {projectToDelete._count.tasks} task{projectToDelete._count.tasks > 1 ? 's' : ''} associated with this project.
                      </span>
                    </>
                  )}
                  <br />
                  <br />
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export and Import Dialogs */}
      <ExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} />
      <ImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
    </div>
  )
}

interface ProjectItemProps {
  project: Project
  onEdit: (project: Project) => void
  onDelete: (project: Project) => void
  onClick: () => void
  isActive: boolean
}

function ProjectItem({ project, onEdit, onDelete, onClick, isActive }: ProjectItemProps) {
  return (
    <div
      className={cn(
        "group flex items-center justify-between rounded-lg transition-all cursor-pointer",
        "hover:bg-accent",
        isActive && "bg-accent"
      )}
    >
      <button
        onClick={onClick}
        className="flex items-center gap-2 px-3 py-2 flex-1 text-left"
      >
        {project.icon ? (
          <span className="text-sm">{project.icon}</span>
        ) : (
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: project.color }}
          />
        )}
        <span className="text-sm truncate">{project.name}</span>
        <span className="text-xs text-muted-foreground ml-auto mr-2">
          {project._count?.tasks ?? 0}
        </span>
        {project.isFavorite && (
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 ml-auto" />
        )}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(project)}>
            <Edit3 className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => onDelete(project)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
