import { useState } from 'react'
import type { Prompt } from '../types'
import styles from './Sidebar.module.css'

interface Props {
  prompts: Prompt[]
  selectedId: number | null
  onSelect: (p: Prompt) => void
  onCreate: (name: string) => void
  onDelete: (id: number) => void
}

export default function Sidebar({ prompts, selectedId, onSelect, onCreate, onDelete }: Props) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const handleCreate = () => {
    const name = newName.trim()
    if (!name) return
    void onCreate(name)
    setNewName('')
    setCreating(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate()
    if (e.key === 'Escape') {
      setCreating(false)
      setNewName('')
    }
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <span className={styles.title}>PromptVault</span>
        <button
          className={styles.newBtn}
          onClick={() => setCreating(true)}
          title="New prompt"
        >
          +
        </button>
      </div>

      {creating && (
        <div className={styles.createForm}>
          <input
            autoFocus
            className={styles.nameInput}
            placeholder="Prompt name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className={styles.createActions}>
            <button className={styles.confirmBtn} onClick={handleCreate}>
              Create
            </button>
            <button
              className={styles.cancelBtn}
              onClick={() => {
                setCreating(false)
                setNewName('')
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className={styles.list}>
        {prompts.length === 0 && !creating && (
          <div className={styles.empty}>No prompts yet. Click + to create one.</div>
        )}
        {prompts.map((p) => (
          <div
            key={p.id}
            className={`${styles.item} ${p.id === selectedId ? styles.selected : ''}`}
            onClick={() => onSelect(p)}
          >
            <span className={styles.itemName}>{p.name}</span>
            <button
              className={styles.deleteBtn}
              title="Delete prompt"
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(`Delete "${p.name}"?`)) void onDelete(p.id)
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
