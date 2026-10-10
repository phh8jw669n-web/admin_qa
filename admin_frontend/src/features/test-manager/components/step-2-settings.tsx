import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

import { TooltipProvider } from '@/components/ui/tooltip'
import { EndTestSettingPanel } from '@/features/test-manager/components/end-test-setting-panel'
import { ShuffleQuestionPanel } from '@/features/test-manager/components/shuffle-question-panel'
import { TestOptionsPanel } from '@/features/test-manager/components/test-options-panel'
import { TimeSettingPanel } from '@/features/test-manager/components/time-setting-panel'
import { TEST_SETTINGS } from '@/features/test-manager/constants/step-2-settings'
import {
  emptyTestSettings,
  type TestSettingsData,
} from '@/features/test-manager/schema/step-2-settings.schema'
import { cn } from '@/lib/utils'

type Step2SettingsProps = {
  value?: TestSettingsData
  onChange: (value: TestSettingsData) => void
}

export function Step2Settings({ value, onChange }: Step2SettingsProps) {
  const settings: TestSettingsData = {
    ...emptyTestSettings,
    ...value,
    shuffleQuestion: value?.shuffleQuestion ?? emptyTestSettings.shuffleQuestion,
    testOptions: { ...emptyTestSettings.testOptions, ...value?.testOptions },
    timeSetting: { ...emptyTestSettings.timeSetting, ...value?.timeSetting },
    endTestSetting: { ...emptyTestSettings.endTestSetting, ...value?.endTestSetting },
  }
  const [openId, setOpenId] = useState<string | null>('shuffle-question')

  const toggle = (id: string) => {
    setOpenId((current) => (current === id ? null : id))
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-1.5">
        {TEST_SETTINGS.map((setting) => {
          const isOpen = openId === setting.id

          return (
            <div key={setting.id} className="overflow-hidden rounded-md border border-border">
              <button
                type="button"
                onClick={() => toggle(setting.id)}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isOpen
                    ? 'border-b border-border bg-primary/10 text-foreground'
                    : 'bg-muted/40 text-foreground hover:bg-muted',
                )}
              >
                <span>{setting.label}</span>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>

              {isOpen && setting.id === 'shuffle-question' ? (
                <ShuffleQuestionPanel
                  value={settings.shuffleQuestion}
                  onChange={(shuffleQuestion) => onChange({ ...settings, shuffleQuestion })}
                />
              ) : null}

              {isOpen && setting.id === 'test-options' ? (
                <TestOptionsPanel
                  value={settings.testOptions}
                  onChange={(testOptions) => onChange({ ...settings, testOptions })}
                />
              ) : null}

              {isOpen && setting.id === 'time-setting' ? (
                <TimeSettingPanel
                  value={settings.timeSetting}
                  onChange={(timeSetting) => onChange({ ...settings, timeSetting })}
                />
              ) : null}

              {isOpen && setting.id === 'end-test-setting' ? (
                <EndTestSettingPanel
                  value={settings.endTestSetting}
                  onChange={(endTestSetting) => onChange({ ...settings, endTestSetting })}
                />
              ) : null}
            </div>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
