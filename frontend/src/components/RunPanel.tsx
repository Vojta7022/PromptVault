import { useState, useMemo, useEffect } from 'react'
import type { RunResult } from '../types'
import { runPrompt } from '../api'
import styles from './RunPanel.module.css'

const MODELS = [
  { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
] as const

const VAR_REGEX = /(?<!\{)\{([a-zA-Z_]\w*)\}(?!\})/g

function extractVariables(content: string): string[] {
  const vars = new Set<string>()
  VAR_REGEX.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = VAR_REGEX.exec(content)) !== null) {
    vars.add(match[1])
  }
  return Array.from(vars)
}

interface Props {
  promptId: number | null
  content: string
}

export default function RunPanel({ promptId, content }: Props) {
  const [model, setModel] = useState<string>('claude-opus-4-6')
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [result, setResult] = useState<RunResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const detectedVars = useMemo(() => extractVariables(content), [content])

  // Clear stale variable values when the detected set changes
  useEffect(() => {
    setVariables((prev) => {
      const next: Record<string, string> = {}
      for (const v of detectedVars) next[v] = prev[v] ?? ''
      return next
    })
  }, [detectedVars])

  const handleRun = async () => {
    if (promptId === null) return
    setIsRunning(true)
    setError(null)
    try {
      const res = await runPrompt(promptId, variables, model)
      setResult(res)
    } catch (err: unknown) {
      const detail =
        err != null &&
        typeof err === 'object' &&
        'response' in err &&
        err.response != null &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data != null &&
        typeof err.response.data === 'object' &&
        'detail' in err.response.data
          ? String((err.response.data as { detail: unknown }).detail)
          : 'An error occurred. Check the console.'
      setError(detail)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>Run</div>
      <div className={styles.body}>
        <div className={styles.controls}>
          {detectedVars.length > 0 && (
            <div className={styles.variablesSection}>
              <div className={styles.sectionLabel}>Variables</div>
              {detectedVars.map((v) => (
                <div key={v} className={styles.varRow}>
                  <label className={styles.varName}>{'{' + v + '}'}</label>
                  <input
                    className={styles.varInput}
                    value={variables[v] ?? ''}
                    placeholder={`value for ${v}`}
                    onChange={(e) =>
                      setVariables((prev) => ({ ...prev, [v]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          )}

          <div className={styles.modelRow}>
            <label className={styles.sectionLabel}>Model</label>
            <select
              className={styles.select}
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <button
            className={styles.runBtn}
            onClick={() => void handleRun()}
            disabled={promptId === null || isRunning}
          >
            {isRunning ? (
              <>
                <span className={styles.spinner} />
                Running…
              </>
            ) : (
              '▶  Run'
            )}
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {result && (
          <div className={styles.output}>
            <div className={styles.outputMeta}>
              {result.model} · {new Date(result.timestamp).toLocaleTimeString()}
            </div>
            <pre className={styles.outputContent}>{result.output}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
