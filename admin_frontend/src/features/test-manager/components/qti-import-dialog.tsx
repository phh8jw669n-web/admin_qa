import { FileUp } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Loader } from '@/components/shared/loader/loader'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { useImportQtiTest } from '@/features/test-manager/api/tests-mutations'
import { getApiErrorMessage } from '@/lib/axios'
import { cn } from '@/lib/utils'

const ACCEPT = '.xml,.zip,.qti,application/zip,text/xml,application/xml'
const MAX_FILE_BYTES = 10 * 1024 * 1024

type ImportPhase = 'idle' | 'uploading' | 'processing' | 'success' | 'error'

type QtiImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function isQtiFile(file: File) {
  return /\.(xml|zip|qti)$/i.test(file.name)
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function QtiImportDialog({ open, onOpenChange }: QtiImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importQti = useImportQtiTest()
  const [file, setFile] = useState<File | null>(null)
  const [phase, setPhase] = useState<ImportPhase>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const isBusy = phase === 'uploading' || phase === 'processing'

  const reset = () => {
    setFile(null)
    setPhase('idle')
    setProgress(0)
    setError('')
    setIsDragging(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (isBusy) return
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  const selectFile = (nextFile: File | undefined) => {
    if (!nextFile) return

    if (!isQtiFile(nextFile)) {
      setError('Choose a QTI package (.xml, .zip, or .qti).')
      setFile(null)
      setPhase('error')
      return
    }

    if (nextFile.size > MAX_FILE_BYTES) {
      setError('File is larger than 10 MB.')
      setFile(null)
      setPhase('error')
      return
    }

    setFile(nextFile)
    setError('')
    setPhase('idle')
    setProgress(0)
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    selectFile(event.dataTransfer.files[0])
  }

  const handleImport = async () => {
    if (!file) return

    try {
      setPhase('uploading')
      setError('')

      for (let value = 8; value <= 55; value += 8) {
        setProgress(value)
        await delay(90)
      }

      setPhase('processing')
      for (let value = 62; value <= 88; value += 8) {
        setProgress(value)
        await delay(90)
      }

      const imported = await importQti.mutateAsync(file)
      setProgress(100)
      setPhase('success')
      toast.success(`Imported “${imported.name}” as a draft test`)
    } catch (caught) {
      setPhase('error')
      setError(getApiErrorMessage(caught))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import QTI tests</DialogTitle>
          <DialogDescription>
            Upload a QTI 2.x package (.xml or .zip). Progress is shown while the file is validated
            and imported.
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            'mt-4 rounded-md border border-dashed border-border p-6 text-center transition-colors',
            isDragging && 'border-primary bg-primary/5',
            isBusy && 'pointer-events-none opacity-70',
          )}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
        >
          <FileUp className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Drop a QTI file here, or browse</p>
          <p className="mt-1 text-xs text-muted-foreground">XML, ZIP, or QTI · max 10 MB</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={isBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            Choose file
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
        </div>

        {file && (
          <p className="mt-3 truncate text-sm text-foreground">
            Selected: <span className="font-medium">{file.name}</span>
          </p>
        )}

        {(isBusy || phase === 'success' || phase === 'error') && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {phase === 'uploading' && 'Uploading package…'}
                {phase === 'processing' && 'Processing QTI items…'}
                {phase === 'success' && 'Import complete'}
                {phase === 'error' && 'Import failed'}
              </span>
              <span className="font-data">{progress}%</span>
            </div>
            <Progress value={progress} />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isBusy}>
            {phase === 'success' ? 'Close' : 'Cancel'}
          </Button>
          {phase !== 'success' && (
            <Button onClick={() => void handleImport()} disabled={!file || isBusy}>
              {isBusy && <Loader size="sm" />}
              Import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
