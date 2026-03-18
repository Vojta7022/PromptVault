export interface Prompt {
  id: number
  name: string
  content: string
  created_at: string
}

export interface Version {
  id: number
  prompt_id: number
  content: string
  timestamp: string
}

export interface RunResult {
  id: number
  prompt_id: number
  version_id: number | null
  output: string
  model: string
  timestamp: string
}
