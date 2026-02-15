import { create } from 'zustand'

export type Priority = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface Label {
  id: string
  name: string
  color: string
}

export interface Task {
  id: string
  title: string
  description?: string
  completed: boolean
  priority: Priority
  dueDate?: string
  order: number
  projectId?: string
  labels: Label[]
  subtasks?: Subtask[]
  createdAt: string
  updatedAt: string
}

export interface Subtask {
  id: string
  title: string
  completed: boolean
  order: number
  taskId: string
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  description?: string
  color: string
  icon?: string
  isFavorite: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    tasks: number
  }
}

interface TaskState {
  tasks: Task[]
  projects: Project[]
  labels: Label[]
  subtasks: Subtask[]
  currentView: 'inbox' | 'today' | 'upcoming' | 'completed' | 'project'
  selectedProjectId: string | null
  sidebarOpen: boolean
  isLoading: boolean
  searchQuery: string
  priorityFilter: Priority | 'ALL'

  // Actions
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: string, task: Partial<Task>) => void
  deleteTask: (id: string) => void
  toggleTaskComplete: (id: string) => void

  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (id: string, project: Partial<Project>) => void
  deleteProject: (id: string) => void

  setLabels: (labels: Label[]) => void

  // Subtask actions
  setSubtasks: (subtasks: Subtask[]) => void
  addSubtask: (subtask: Subtask) => void
  updateSubtask: (id: string, subtask: Partial<Subtask>) => void
  deleteSubtask: (id: string) => void
  toggleSubtask: (id: string) => void

  setCurrentView: (view: 'inbox' | 'today' | 'upcoming' | 'completed' | 'project') => void
  setSelectedProjectId: (id: string | null) => void
  setSidebarOpen: (open: boolean) => void
  setIsLoading: (loading: boolean) => void
  setSearchQuery: (query: string) => void
  setPriorityFilter: (priority: Priority | 'ALL') => void
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  projects: [],
  labels: [],
  subtasks: [],
  currentView: 'inbox',
  selectedProjectId: null,
  sidebarOpen: true,
  isLoading: false,
  searchQuery: '',
  priorityFilter: 'ALL',

  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, updatedTask) => set((state) => ({
    tasks: state.tasks.map((task) => (task.id === id ? { ...task, ...updatedTask } : task)),
  })),
  deleteTask: (id) => set((state) => ({
    tasks: state.tasks.filter((task) => task.id !== id),
    subtasks: state.subtasks.filter((s) => s.taskId !== id),
  })),
  toggleTaskComplete: (id) => set((state) => ({
    tasks: state.tasks.map((task) =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ),
  })),

  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
  updateProject: (id, updatedProject) => set((state) => ({
    projects: state.projects.map((project) =>
      project.id === id ? { ...project, ...updatedProject } : project
    ),
  })),
  deleteProject: (id) => set((state) => ({
    projects: state.projects.filter((project) => project.id !== id),
  })),

  setLabels: (labels) => set({ labels }),

  // Subtask actions
  setSubtasks: (subtasks) => set({ subtasks }),
  addSubtask: (subtask) => set((state) => ({ subtasks: [...state.subtasks, subtask] })),
  updateSubtask: (id, updatedSubtask) => set((state) => ({
    subtasks: state.subtasks.map((subtask) =>
      subtask.id === id ? { ...subtask, ...updatedSubtask } : subtask
    ),
  })),
  deleteSubtask: (id) => set((state) => ({
    subtasks: state.subtasks.filter((subtask) => subtask.id !== id),
  })),
  toggleSubtask: (id) => set((state) => ({
    subtasks: state.subtasks.map((subtask) =>
      subtask.id === id ? { ...subtask, completed: !subtask.completed } : subtask
    ),
  })),

  setCurrentView: (view) => set({ currentView: view }),
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setPriorityFilter: (priority) => set({ priorityFilter: priority }),
}))
