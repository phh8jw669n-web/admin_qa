import { useMemo, useRef } from 'react'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import type { Editor, WordCount } from 'ckeditor5'
import 'ckeditor5/ckeditor5.css'

import {
  ClassicEditor,
  createEditorConfig,
  type RichTextEditorVariant,
} from '@/components/shared/rich-text-editor/editor-config'
import { refreshEditorImageUrls } from '@/components/shared/rich-text-editor/editor-upload-adapter'
import '@/components/shared/rich-text-editor/rich-text-editor.css'

type CkEditorInstanceProps = {
  value: string
  placeholder: string
  variant: RichTextEditorVariant
  disabled?: boolean
  minHeight?: string
  onChange: (value: string) => void
}

function elementPathLabel(editor: Editor) {
  const position = editor.model.document.selection.getFirstPosition()
  const name = position?.parent.is('element') ? position.parent.name : 'paragraph'
  const tag = name === 'paragraph' ? 'p' : name
  return `body  ${tag}`
}

export function CkEditorInstance({
  value,
  placeholder,
  variant,
  disabled,
  minHeight,
  onChange,
}: CkEditorInstanceProps) {
  const pathRef = useRef<HTMLSpanElement>(null)
  const countRef = useRef<HTMLDivElement>(null)
  const skipChangeRef = useRef(false)
  const config = useMemo(() => createEditorConfig(variant, placeholder), [placeholder, variant])

  return (
    <div className="rich-text-editor" style={{ ['--rte-min-height' as string]: minHeight }}>
      <CKEditor
        editor={ClassicEditor}
        config={config}
        data={value}
        disabled={disabled}
        onChange={(_event, editor) => {
          if (skipChangeRef.current) return
          onChange(editor.getData())
          if (pathRef.current) pathRef.current.textContent = elementPathLabel(editor)
        }}
        onReady={(editor) => {
          if (pathRef.current) pathRef.current.textContent = elementPathLabel(editor)

          const wordCount = editor.plugins.get('WordCount') as WordCount
          if (countRef.current && wordCount.wordCountContainer) {
            countRef.current.replaceChildren(wordCount.wordCountContainer)
          }

          editor.model.document.selection.on('change', () => {
            if (pathRef.current) pathRef.current.textContent = elementPathLabel(editor)
          })

          skipChangeRef.current = true
          void refreshEditorImageUrls(editor)
            .then((updated) => {
              skipChangeRef.current = false
              if (updated) onChange(editor.getData())
            })
            .catch(() => {
              skipChangeRef.current = false
            })
        }}
      />
      <div className="rich-text-editor__status">
        <span ref={pathRef}>body  p</span>
        <div ref={countRef} />
      </div>
    </div>
  )
}
