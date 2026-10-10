import {
  ButtonView,
  Dialog,
  IconCopy,
  IconUnlink,
  InputTextView,
  Plugin,
  View,
} from 'ckeditor5'

const ICON_CUT =
  '<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="5.5" cy="14.5" r="2.2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="14.5" cy="14.5" r="2.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7.4 13.2 12 4.5h1.6M12.6 13.2 8 4.5H6.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'

const ICON_PASTE =
  '<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="5" width="11" height="12" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 5.2V4.4A1.4 1.4 0 0 1 9.4 3h1.2A1.4 1.4 0 0 1 12 4.4v.8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 9.5h5M8 12h5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'

const ICON_FORMULA =
  '<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M5 5.5h4.2c1.4 0 2.3.8 2.3 2s-.9 2-2.3 2H6.6L12.8 15M11.2 5.5h3.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'

const ICON_SPELLCHECK =
  '<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M4.5 14.5 8 5.5h1.5l3.5 9M5.8 11h5.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="m12.5 12.5 2 2 3.2-3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'

function addToolbarButton(
  editor: Plugin['editor'],
  name: string,
  options: {
    label: string
    icon: string
    onExecute: () => void
    isToggleable?: boolean
  },
) {
  editor.ui.componentFactory.add(name, (locale) => {
    const button = new ButtonView(locale)
    button.set({
      label: options.label,
      icon: options.icon,
      tooltip: true,
      isToggleable: options.isToggleable,
    })
    button.on('execute', () => options.onExecute())
    return button
  })
}

function insertPlainText(editor: Plugin['editor'], value: string) {
  editor.model.change((writer) => {
    editor.model.insertContent(writer.createText(value))
  })
}

export class EditorExtras extends Plugin {
  static get pluginName() {
    return 'EditorExtras' as const
  }

  static get requires() {
    return [Dialog] as const
  }

  init() {
    const editor = this.editor

    addToolbarButton(editor, 'clipboardCut', {
      label: 'Cut',
      icon: ICON_CUT,
      onExecute: () => {
        editor.editing.view.focus()
        document.execCommand('cut')
      },
    })

    addToolbarButton(editor, 'clipboardCopy', {
      label: 'Copy',
      icon: IconCopy,
      onExecute: () => {
        editor.editing.view.focus()
        document.execCommand('copy')
      },
    })

    addToolbarButton(editor, 'clipboardPaste', {
      label: 'Paste',
      icon: ICON_PASTE,
      onExecute: () => {
        void this.pasteFromClipboard()
      },
    })

    addToolbarButton(editor, 'unlinkSelection', {
      label: 'Unlink',
      icon: IconUnlink,
      onExecute: () => {
        if (editor.commands.get('unlink')?.isEnabled) {
          editor.execute('unlink')
        }
      },
    })

    addToolbarButton(editor, 'insertFormula', {
      label: 'Insert formula',
      icon: ICON_FORMULA,
      onExecute: () => this.openFormulaDialog(),
    })

    editor.ui.componentFactory.add('toggleSpellcheck', (locale) => {
      const button = new ButtonView(locale)
      button.set({
        label: 'Spell check',
        icon: ICON_SPELLCHECK,
        tooltip: true,
        isToggleable: true,
        isOn: true,
      })
      button.on('execute', () => {
        const next = !button.isOn
        button.isOn = next
        const root = editor.editing.view.document.getRoot()
        if (!root) return
        editor.editing.view.change((writer) => {
          writer.setAttribute('spellcheck', next ? 'true' : 'false', root)
        })
      })
      return button
    })
  }

  private async pasteFromClipboard() {
    const editor = this.editor
    editor.editing.view.focus()

    try {
      const text = await navigator.clipboard.readText()
      if (text) insertPlainText(editor, text)
      return
    } catch {
      document.execCommand('paste')
    }
  }

  private openFormulaDialog() {
    const editor = this.editor
    const locale = editor.locale
    const input = new InputTextView(locale)
    input.set({ placeholder: 'e.g. x^2 + y^2 = z^2' })

    const content = new View(locale)
    content.setTemplate({
      tag: 'div',
      attributes: {
        class: 'ck ck-reset_all',
        style: 'min-width: 18rem; padding: 4px 0;',
      },
      children: [input],
    })

    const dialog = editor.plugins.get(Dialog)
    dialog.show({
      id: 'insert-formula',
      title: 'Insert formula',
      isModal: true,
      content,
      actionButtons: [
        {
          label: 'Cancel',
          withText: true,
          onExecute: () => dialog.hide(),
        },
        {
          label: 'Insert',
          withText: true,
          onExecute: () => {
            const tex = input.element?.value.trim()
            dialog.hide()
            if (!tex) return
            insertPlainText(editor, ` \\(${tex}\\) `)
          },
        },
      ],
    })

    setTimeout(() => input.focus(), 0)
  }
}
