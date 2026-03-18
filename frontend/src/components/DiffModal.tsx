import ReactDiffViewer from 'react-diff-viewer-continued'
import type { Version } from '../types'
import styles from './DiffModal.module.css'

interface Props {
  version: Version
  currentContent: string
  onClose: () => void
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function DiffModal({ version, currentContent, onClose }: Props) {
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.title}>
            Version from {formatDate(version.timestamp)}
          </span>
          <button className={styles.closeBtn} onClick={onClose} title="Close">
            ✕
          </button>
        </div>
        <div className={styles.diffWrapper}>
          <ReactDiffViewer
            oldValue={version.content}
            newValue={currentContent}
            splitView={true}
            useDarkTheme={true}
            leftTitle="Previous version"
            rightTitle="Current content"
          />
        </div>
      </div>
    </div>
  )
}
