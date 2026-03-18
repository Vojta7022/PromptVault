import { useState, useMemo, useEffect } from 'react'
import type { RunResult } from '../types'
import { runPrompt, getRuns } from '../api'
import styles from './RunPanel.module.css'

const MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B' },
  { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
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

function fmt(ts: string) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function extractError(err: unknown): string {
  if (
    err != null &&
    typeof err === 'object' &&
    'response' in err &&
    err.response != null &&
    typeof err.response === 'object' &&
    'data' in err.response &&
    err.response.data != null &&
    typeof err.response.data === 'object' &&
    'detail' in err.response.data
  ) {
    return String((err.response.data as { detail: unknown }).detail)
  }
  return 'An error occurred. Check the console.'
}

interface Props {
  promptId: number | null
  content: string
}

export default function RunPanel({ promptId, content }: Props) {
  const [model, setModel] = useState<string>('llama-3.3-70b-versatile')
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [result, setResult] = useState<RunResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pastRuns, setPastRuns] = useState<RunResult[]>([])
  const [showPastRuns, setShowPastRuns] = useState(false)

  const detectedVars = useMemo(() => extractVariables(content), [content])

  useEffect(() => {
    setVariables((prev) => {
      const next: Record<string, string> = {}
      for (const v of detectedVars) next[v] = prev[v] ?? ''
      return next
    })
  }, [detectedVars])

  // Load past runs when prompt changes
  useEffect(() => {
    if (promptId === null) {
      setPastRuns([])
      return
    }
    getRuns(promptId).then(setPastRuns).catch(() => setPastRuns([]))
  }, [promptId])

  const handleRun = async () => {
    if (promptId === null) return
    setIsRunning(true)
    setError(null)
    try {
      const res = await runPrompt(promptId, variables, model)
      setResult(res)
      // Prepend to past runs list so it appears immediately
      setPastRuns((prev) => [res, ...prev.filter((r) => r.id !== res.id)])
    } catch (err: unknown) {
      setError(extractError(err))
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>Run</div>
      <div className={styles.body}>
        <div className={styles.topRow}>
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

          <div className={styles.outputArea}>
            {error && <div className={styles.error}>{error}</div>}
            {result && (
              <div className={styles.output}>
                <div className={styles.outputMeta}>
                  {result.model} · {fmt(result.timestamp)}
                </div>
                <pre className={styles.outputContent}>{result.output}</pre>
              </div>
            )}
          </div>
        </div>

        {pastRuns.length > 0 && (
          <div className={styles.pastRunsSection}>
            <button
              className={styles.pastRunsToggle}
              onClick={() => setShowPastRuns((s) => !s)}
            >
              <span>Past Runs ({pastRuns.length})</span>
              <span>{showPastRuns ? '▲' : '▼'}</span>
            </button>
            {showPastRuns && (
              <div className={styles.pastRunsList}>
                {pastRuns.map((run) => (
                  <div
                    key={run.id}
                    className={`${styles.runCard} ${result?.id === run.id ? styles.runCardActive : ''}`}
                    onClick={() => {
                      setResult(run)
                      setError(null)
                    }}
                  >
                    <div className={styles.runCardMeta}>
                      <span className={styles.runModel}>{run.model.split('-').slice(1, 3).join(' ')}</span>
                      <span className={styles.runTime}>{fmt(run.timestamp)}</span>
                    </div>
                    <p className={styles.runPreview}>
                      {run.output.slice(0, 100)}
                      {run.output.length > 100 ? '…' : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
