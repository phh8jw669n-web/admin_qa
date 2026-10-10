import { SettingHint } from '@/features/test-manager/components/setting-hint'
import { SettingRadioGroup } from '@/features/test-manager/components/setting-radio-row'
import type {
  EndTestSettingSettings,
  YesNo,
} from '@/features/test-manager/schema/step-2-settings.schema'
import { cn } from '@/lib/utils'

const YES_NO_OPTIONS: Array<{ value: YesNo; label: string }> = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

type EndTestSettingPanelProps = {
  value: EndTestSettingSettings
  onChange: (value: EndTestSettingSettings) => void
}

const cellClass = 'border border-border px-3 py-2.5 align-middle text-xs'
const categoryClass = cn(cellClass, 'w-48 bg-muted/20 font-medium text-foreground')
const fieldClass = cn(cellClass, 'text-foreground')
const controlClass = cn(cellClass, 'w-[12.5rem]')

function SettingTextarea({
  id,
  value,
  onChange,
  rows = 3,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  rows?: number
}) {
  return (
    <textarea
      id={id}
      rows={rows}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        'min-h-[4rem] w-full resize-y rounded-sm border border-input bg-background px-2 py-1.5 text-xs shadow-none',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    />
  )
}

export function EndTestSettingPanel({ value, onChange }: EndTestSettingPanelProps) {
  const update = <K extends keyof EndTestSettingSettings>(
    field: K,
    next: EndTestSettingSettings[K],
  ) => {
    onChange({ ...value, [field]: next })
  }

  return (
    <div>
      <p className="border-b border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Amend final phase changes to the test that includes result, score, message, etc.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td rowSpan={3} className={categoryClass}>
                <span className="inline-flex items-center gap-1">
                  Custom Message
                  <SettingHint hint="Show a personalized pass or fail message when the test ends." />
                </span>
              </td>
              <td className={fieldClass}>Show Personalized Message</td>
              <td className={controlClass}>
                <SettingRadioGroup
                  name="show-personalized-message"
                  label="Show Personalized Message"
                  value={value.showPersonalizedMessage}
                  options={YES_NO_OPTIONS}
                  onChange={(next) => update('showPersonalizedMessage', next)}
                />
              </td>
            </tr>
            <tr>
              <td className={fieldClass}>
                <label htmlFor="feedback-for-pass">Feedback for pass</label>
              </td>
              <td className={cn(cellClass, 'w-auto')}>
                <SettingTextarea
                  id="feedback-for-pass"
                  value={value.feedbackForPass}
                  onChange={(next) => update('feedbackForPass', next)}
                />
              </td>
            </tr>
            <tr>
              <td className={fieldClass}>
                <label htmlFor="feedback-for-fail">Feedback for fail</label>
              </td>
              <td className={cn(cellClass, 'w-auto')}>
                <SettingTextarea
                  id="feedback-for-fail"
                  value={value.feedbackForFail}
                  onChange={(next) => update('feedbackForFail', next)}
                />
              </td>
            </tr>

            <tr>
              <td className={categoryClass}>
                Display Message Upon
                <br />
                Submission
              </td>
              <td colSpan={2} className={cellClass}>
                <SettingTextarea
                  id="display-message-upon-submission"
                  value={value.displayMessageUponSubmission}
                  onChange={(next) => update('displayMessageUponSubmission', next)}
                />
              </td>
            </tr>

            <tr>
              <td className={categoryClass}>Feedback</td>
              <td className={fieldClass}>Provide Feedback to Candidates</td>
              <td className={controlClass}>
                <SettingRadioGroup
                  name="provide-feedback-to-candidates"
                  label="Provide Feedback to Candidates"
                  value={value.provideFeedbackToCandidates}
                  options={YES_NO_OPTIONS}
                  onChange={(next) => update('provideFeedbackToCandidates', next)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
