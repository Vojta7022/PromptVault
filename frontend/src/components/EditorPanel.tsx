import { useRef, useEffect, useCallback } from 'react'
import Editor, { type OnMount, type Monaco } from '@monaco-editor/react'
import styles from './EditorPanel.module.css'

interface DeltaDecoration {
  range: {
    startLineNumber: number
    startColumn: number
    endLineNumber: number
    endColumn: number
  }
  options: {
    inlineClassName: string
    hoverMessage: { value: string }
  }
}

interface Props {
  promptId: number | null
  promptName: string
  initialContent: string
  onChange: (value: string) => void
  onSave: () => void
  isSaving: boolean
}

// Regex that matches {variable} but not {{escaped}} braces
const VAR_REGEX = /(?<!\{)\{([a-zA-Z_]\w*)\}(?!\})/g

export default function EditorPanel({
  promptId,
  promptName,
  initialContent,
  onChange,
  onSave,
  isSaving,
}: Props) {
  type IEditor = Parameters<OnMount>[0]

  const editorRef = useRef<IEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const decoIdsRef = useRef<string[]>([])
  const onSaveRef = useRef(onSave)

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  const updateDecorations = useCallback((editor: IEditor, _monaco: Monaco, text: string) => {
    const model = editor.getModel()
    if (!model) return

    const decorations: DeltaDecoration[] = []
    VAR_REGEX.lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = VAR_REGEX.exec(text)) !== null) {
      const start = model.getPositionAt(match.index)
      const end = model.getPositionAt(match.index + match[0].length)
      decorations.push({
        range: {
          startLineNumber: start.lineNumber,
          startColumn: start.column,
          endLineNumber: end.lineNumber,
          endColumn: end.column,
        },
        options: {
          inlineClassName: 'variable-highlight',
          hoverMessage: { value: `Variable: **${match[1]}**` },
        },
      })
    }

    // deltaDecorations returns the new decoration IDs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    decoIdsRef.current = (editor as any).deltaDecorations(decoIdsRef.current, decorations)
  }, [])

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor
      monacoRef.current = monaco

      editor.addAction({
        id: 'promptvault.save',
        label: 'Save Prompt',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
        run: () => onSaveRef.current(),
      })

      updateDecorations(editor, monaco, initialContent)
    },
    [initialContent, updateDecorations],
  )

  const handleChange = useCallback(
    (value: string | undefined) => {
      const text = value ?? ''
      onChange(text)
      if (editorRef.current && monacoRef.current) {
        updateDecorations(editorRef.current, monacoRef.current, text)
      }
    },
    [onChange, updateDecorations],
  )

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>
          {promptId !== null ? promptName || 'Untitled' : 'No prompt selected'}
        </span>
        {promptId !== null && (
          <button className={styles.saveBtn} onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>
      <div className={styles.editorWrapper}>
        <Editor
          defaultValue={initialContent}
          language="plaintext"
          theme="vs-dark"
          onChange={handleChange}
          onMount={handleMount}
          options={{
            fontSize: 14,
            lineHeight: 22,
            wordWrap: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 16, bottom: 16 },
            readOnly: promptId === null,
            renderLineHighlight: 'gutter',
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
          }}
        />
      </div>
    </div>
  )
}
