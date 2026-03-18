import { useState, useEffect } from 'react'
import type { Version } from '../types'
import { getVersions } from '../api'
import DiffModal from './DiffModal'
import styles from './VersionPanel.module.css'

interface Props {
  promptId: number | null
  currentContent: string
  refreshKey: number
}

function formatDate(ts: string) {
  const d = new Date(ts)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export default function VersionPanel({ promptId, currentContent, refreshKey }: Props) {
  const [versions, setVersions] = useState<Version[]>([])
  const [diffVersion, setDiffVersion] = useState<Version | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (promptId === null) {
      setVersions([])
      setDiffVersion(null)
      return
    }
    setLoading(true)
    getVersions(promptId)
      .then(setVersions)
      .finally(() => setLoading(false))
  }, [promptId, refreshKey])

  const handleRefresh = () => {
    if (promptId === null) return
    setLoading(true)
    getVersions(promptId)
      .then(setVersions)
      .finally(() => setLoading(false))
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span>Version History</span>
        {promptId !== null && (
          <button
            className={styles.refreshBtn}
            onClick={handleRefresh}
            title="Refresh"
            disabled={loading}
          >
            ↺
          </button>
        )}
      </div>

      <div className={styles.list}>
        {promptId === null && (
          <div className={styles.empty}>Select a prompt to view versions.</div>
        )}
        {promptId !== null && !loading && versions.length === 0 && (
          <div className={styles.empty}>
            No versions yet. Edit content and save to create one.
          </div>
        )}
        {[...versions].reverse().map((v) => (
          <div key={v.id} className={styles.versionItem} onClick={() => setDiffVersion(v)}>
            <div className={styles.timestamp}>{formatDate(v.timestamp)}</div>
            <div className={styles.preview}>
              {v.content.slice(0, 80) + (v.content.length > 80 ? '…' : '')}
            </div>
          </div>
        ))}
      </div>

      {diffVersion && (
        <DiffModal
          version={diffVersion}
          currentContent={currentContent}
          onClose={() => setDiffVersion(null)}
        />
      )}
    </div>
  )
}
