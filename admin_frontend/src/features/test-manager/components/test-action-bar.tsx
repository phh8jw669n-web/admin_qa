import { FileUp, Plus, Trash2, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useWizardStore } from '@/features/test-manager/store/wizard-store'
import { useAppPath } from '@/hooks/use-app-path'

type TestActionBarProps = {
  onImport: () => void
  onDelete: () => void
  disableDelete?: boolean
}

export function TestActionBar({ onImport, onDelete, disableDelete = false }: TestActionBarProps) {
  const appPath = useAppPath()
  const resetWizard = useWizardStore((state) => state.resetWizard)

  return (
    <>
      <Button variant="outline" size="sm" className="bg-card shadow-sm" onClick={onImport}>
        <FileUp />
        Import Tests
      </Button>
      <Button variant="outline" size="sm" className="bg-card shadow-sm">
        <UserPlus />
        Quick Assign
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="bg-card shadow-sm"
        disabled={disableDelete}
        onClick={onDelete}
      >
        <Trash2 />
        Delete
      </Button>
      <Button variant="default" size="sm" className="shadow-sm" asChild>
        <Link to={appPath('/test-manager/wizard/step-1')} onClick={() => resetWizard()}>
          <Plus />
          Create Tests
        </Link>
      </Button>
    </>
  )
}
