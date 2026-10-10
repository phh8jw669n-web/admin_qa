import { Plugin, type Editor, type ViewElement } from 'ckeditor5'
import { toast } from 'sonner'

import { FILE_DOWNLOAD_URL_EXPIRES_IN, getFileDownloadUrl } from '@/lib/files/get-download-url'
import { uploadEditorImage } from '@/lib/files/upload-file'

type FileLoader = {
  file: Promise<File | null>
  uploaded: number
  uploadTotal?: number
}

type FileRepository = {
  createUploadAdapter: (loader: FileLoader) => {
    upload: () => Promise<{
      default?: string
      fileKey?: string
      urls?: { default: string }
    }>
    abort: () => void
  }
}

type ImageUtils = {
  findViewImgElement: (element: ViewElement) => ViewElement | null
}

type ModelItem = {
  name: string
  is: (type: string, name?: string) => boolean
  getAttribute: (key: string) => unknown
}

type DowncastData = {
  item: ModelItem
  attributeNewValue: unknown
}

type DowncastApi = {
  consumable: { consume: (item: unknown, name: string) => boolean }
  mapper: { toViewElement: (item: unknown) => ViewElement | undefined }
  writer: {
    setAttribute: (key: string, value: string, element: ViewElement) => void
    removeAttribute: (key: string, element: ViewElement) => void
  }
}

const IMAGE_ELEMENTS = ['imageBlock', 'imageInline'] as const

function findViewImg(
  viewElement: ViewElement | undefined,
  imageUtils?: ImageUtils | null,
): ViewElement | null {
  if (!viewElement) return null
  if (imageUtils?.findViewImgElement) {
    return imageUtils.findViewImgElement(viewElement)
  }
  if (viewElement.is('element', 'img')) return viewElement
  for (const child of viewElement.getChildren()) {
    if (child.is('element', 'img')) return child as ViewElement
    if (child.is('element')) {
      const nested = findViewImg(child as ViewElement)
      if (nested) return nested
    }
  }
  return null
}

class ApiImageUploadAdapter {
  controller: AbortController | null = null
  loader: FileLoader

  constructor(loader: FileLoader) {
    this.loader = loader
  }

  async upload() {
    const file = await this.loader.file
    if (!file) {
      throw new Error('No image selected')
    }

    this.controller = new AbortController()

    try {
      const uploaded = await uploadEditorImage(file, {
        signal: this.controller.signal,
        onUploadProgress: (event) => {
          if (!event.total) return
          this.loader.uploadTotal = event.total
          this.loader.uploaded = event.loaded
        },
      })

      const previewUrl = uploaded.key.startsWith('mock/')
        ? uploaded.url
        : await getFileDownloadUrl(uploaded.key, FILE_DOWNLOAD_URL_EXPIRES_IN, this.controller.signal)

      return {
        default: previewUrl,
        fileKey: uploaded.key,
      }
    } catch (error) {
      if ((error as { name?: string }).name === 'CanceledError' || this.controller.signal.aborted) {
        throw error
      }
      toast.error(error instanceof Error ? error.message : 'Unable to upload image')
      throw error
    }
  }

  abort() {
    this.controller?.abort()
  }
}

export class EditorImageUpload extends Plugin {
  static get pluginName() {
    return 'EditorImageUpload' as const
  }

  init() {
    const editor = this.editor
    const fileRepository = editor.plugins.get('FileRepository') as unknown as FileRepository
    const imageUtils = editor.plugins.has('ImageUtils')
      ? (editor.plugins.get('ImageUtils') as unknown as ImageUtils)
      : null

    fileRepository.createUploadAdapter = (loader) => new ApiImageUploadAdapter(loader)

    for (const name of IMAGE_ELEMENTS) {
      editor.model.schema.extend(name, { allowAttributes: ['fileKey'] })
    }

    editor.conversion.for('upcast').attributeToAttribute({
      view: { name: 'img', key: 'data-file-key' },
      model: 'fileKey',
    })

    for (const name of IMAGE_ELEMENTS) {
      editor.conversion.for('downcast').add((dispatcher) => {
        dispatcher.on(
          `attribute:fileKey:${name}`,
          (event: { name: string }, data: DowncastData, conversionApi: DowncastApi) => {
            if (!conversionApi.consumable.consume(data.item, event.name)) return

            const viewElement = conversionApi.mapper.toViewElement(data.item)
            const img = findViewImg(viewElement, imageUtils)
            if (!img) return

            if (data.attributeNewValue) {
              conversionApi.writer.setAttribute('data-file-key', String(data.attributeNewValue), img)
            } else {
              conversionApi.writer.removeAttribute('data-file-key', img)
            }
          },
        )
      })
    }

    if (!editor.plugins.has('ImageUploadEditing')) return

    editor.plugins.get('ImageUploadEditing').on(
      'uploadComplete',
      (_event: unknown, payload: { data: { default?: string; fileKey?: string }; imageElement: ModelItem }) => {
        const previewUrl = payload.data.default
        const fileKey = payload.data.fileKey
        if (!previewUrl && !fileKey) return

        editor.model.change((writer) => {
          if (previewUrl) writer.setAttribute('src', previewUrl, payload.imageElement as never)
          if (fileKey) writer.setAttribute('fileKey', fileKey, payload.imageElement as never)
        })

        if (!previewUrl || !imageUtils) return
        const viewFigure = editor.editing.mapper.toViewElement(payload.imageElement as never)
        const img = viewFigure ? imageUtils.findViewImgElement(viewFigure) : null
        if (!img) return

        editor.editing.view.change((writer) => {
          writer.setAttribute('src', previewUrl, img)
        })
      },
      { priority: 'high' },
    )
  }
}

export async function refreshEditorImageUrls(editor: Editor) {
  const root = editor.model.document.getRoot()
  if (!root) return false

  const jobs: Array<{ item: ModelItem; key: string }> = []

  for (const item of editor.model.createRangeIn(root).getItems()) {
    if (!item.is('element')) continue
    if (item.name !== 'imageBlock' && item.name !== 'imageInline') continue
    const key = item.getAttribute('fileKey')
    if (typeof key !== 'string' || !key.trim()) continue
    jobs.push({ item: item as unknown as ModelItem, key: key.trim() })
  }

  if (jobs.length === 0) return false

  await Promise.all(
    jobs.map(async ({ item, key }) => {
      const url = await getFileDownloadUrl(key)
      editor.model.change((writer) => {
        writer.setAttribute('src', url, item as never)
      })
    }),
  )

  return true
}
