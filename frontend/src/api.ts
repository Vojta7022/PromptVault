import axios from 'axios'
import type { Prompt, Version, RunResult } from './types'

const api = axios.create({ baseURL: 'http://localhost:8000' })

export const getPrompts = (): Promise<Prompt[]> =>
  api.get<Prompt[]>('/prompts').then((r) => r.data)

export const createPrompt = (name: string, content: string): Promise<Prompt> =>
  api.post<Prompt>('/prompts', { name, content }).then((r) => r.data)

export const updatePrompt = (
  id: number,
  data: { name?: string; content?: string },
): Promise<Prompt> => api.put<Prompt>(`/prompts/${id}`, data).then((r) => r.data)

export const deletePrompt = (id: number): Promise<void> =>
  api.delete(`/prompts/${id}`).then(() => undefined)

export const duplicatePrompt = (id: number): Promise<Prompt> =>
  api.post<Prompt>(`/prompts/${id}/duplicate`).then((r) => r.data)

export const getVersions = (id: number): Promise<Version[]> =>
  api.get<Version[]>(`/prompts/${id}/versions`).then((r) => r.data)

export const getRuns = (id: number): Promise<RunResult[]> =>
  api.get<RunResult[]>(`/prompts/${id}/runs`).then((r) => r.data)

export const runPrompt = (
  id: number,
  variables: Record<string, string>,
  model: string,
): Promise<RunResult> =>
  api.post<RunResult>(`/prompts/${id}/run`, { variables, model }).then((r) => r.data)
