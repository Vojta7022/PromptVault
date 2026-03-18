import { useState, useEffect, useCallback } from 'react'
import type { Prompt } from './types'
import { getPrompts, createPrompt, updatePrompt, deletePrompt } from './api'
import Sidebar from './components/Sidebar'
import EditorPanel from './components/EditorPanel'
import RunPanel from './components/RunPanel'
import VersionPanel from './components/VersionPanel'
import styles from './App.module.css'

export default function App() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)
  const [editedContent, setEditedContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [versionRefreshKey, setVersionRefreshKey] = useState(0)

  const loadPrompts = useCallback(async () => {
    const data = await getPrompts()
    setPrompts(data)
  }, [])

  useEffect(() => {
    void loadPrompts()
  }, [loadPrompts])

  const handleSelect = (prompt: Prompt) => {
    setSelectedPrompt(prompt)
    setEditedContent(prompt.content)
  }

  const handleCreate = async (name: string) => {
    const prompt = await createPrompt(name, '')
    setPrompts((prev) => [...prev, prompt])
    handleSelect(prompt)
  }

  const handleSave = useCallback(async () => {
    if (!selectedPrompt) return
    setIsSaving(true)
    try {
      const updated = await updatePrompt(selectedPrompt.id, { content: editedContent })
      setSelectedPrompt(updated)
      setPrompts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      setVersionRefreshKey((k) => k + 1)
    } finally {
      setIsSaving(false)
    }
  }, [selectedPrompt, editedContent])

  const handleDelete = async (id: number) => {
    await deletePrompt(id)
    if (selectedPrompt?.id === id) {
      setSelectedPrompt(null)
      setEditedContent('')
    }
    setPrompts((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className={styles.layout}>
      <Sidebar
        prompts={prompts}
        selectedId={selectedPrompt?.id ?? null}
        onSelect={handleSelect}
        onCreate={handleCreate}
        onDelete={handleDelete}
      />
      <div className={styles.center}>
        <EditorPanel
          key={selectedPrompt?.id ?? 0}
          promptId={selectedPrompt?.id ?? null}
          promptName={selectedPrompt?.name ?? ''}
          initialContent={selectedPrompt?.content ?? ''}
          onChange={setEditedContent}
          onSave={handleSave}
          isSaving={isSaving}
        />
        <RunPanel promptId={selectedPrompt?.id ?? null} content={editedContent} />
      </div>
      <VersionPanel
        promptId={selectedPrompt?.id ?? null}
        currentContent={editedContent}
        refreshKey={versionRefreshKey}
      />
    </div>
  )
}
