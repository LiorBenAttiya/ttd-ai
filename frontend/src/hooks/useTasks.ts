import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/services/api'
import type { FilterState } from '@/types'

export function useArchiveTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.archiveTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useRestoreTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.restoreTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useArchivedTasks() {
  return useQuery({
    queryKey: ['tasks', 'archived'],
    queryFn:  api.fetchArchivedTasks,
    staleTime: 60_000,
  })
}

// ── Keys ──────────────────────────────────────────────────────
const KEYS = {
  kanban:  (cat?: string)  => ['tasks', 'kanban', cat ?? 'all'],
  stats:   ()              => ['dashboard', 'stats'],
}

// ── Kanban data ───────────────────────────────────────────────
export function useKanban(filters: FilterState) {
  return useQuery({
    queryKey: KEYS.kanban(filters.category),
    queryFn:  () => api.fetchKanban(filters.category),
    staleTime: 30_000,
  })
}

// ── Dashboard stats ───────────────────────────────────────────
export function useStats() {
  return useQuery({
    queryKey: KEYS.stats(),
    queryFn:  api.fetchStats,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
}

// ── Create task ───────────────────────────────────────────────
export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// ── Complete task ─────────────────────────────────────────────
export function useCompleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.completeTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// ── Delete task ───────────────────────────────────────────────
export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// ── Update task ───────────────────────────────────────────────
export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: object }) =>
      api.updateTask(id, payload as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
