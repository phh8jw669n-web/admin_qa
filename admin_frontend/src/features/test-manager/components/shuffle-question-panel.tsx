import { SettingRadioGroup } from '@/features/test-manager/components/setting-radio-row'
import {
  settingTableCategoryClass,
  settingTableControlClass,
  settingTableFieldClass,
} from '@/features/test-manager/components/setting-control'
import type {
  SectionNumbering,
  ShuffleQuestionSettings,
  YesNo,
} from '@/features/test-manager/schema/step-2-settings.schema'

const YES_NO_OPTIONS: Array<{ value: YesNo; label: string }> = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

const SECTION_NUMBERING_OPTIONS: Array<{ value: SectionNumbering; label: string }> = [
  { value: 'by-section', label: 'By Section' },
  { value: 'continuous', label: 'Continuous' },
]

type ShuffleQuestionPanelProps = {
  value: ShuffleQuestionSettings
  onChange: (value: ShuffleQuestionSettings) => void
}

export function ShuffleQuestionPanel({ value, onChange }: ShuffleQuestionPanelProps) {
  const update = <K extends keyof ShuffleQuestionSettings>(
    field: K,
    next: ShuffleQuestionSettings[K],
  ) => {
    onChange({ ...value, [field]: next })
  }

  return (
    <div>
      <p className="border-b border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Shuffle and bundle questions to create vivid sets with similar questions
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td rowSpan={3} className={settingTableCategoryClass}>
                Grouping
              </td>
              <td className={settingTableFieldClass}>Group Questions by Subject Area</td>
              <td className={settingTableControlClass}>
                <SettingRadioGroup
                  name="group-by-subject"
                  label="Group Questions by Subject Area"
                  value={value.groupBySubjectArea}
                  options={YES_NO_OPTIONS}
                  onChange={(next) => update('groupBySubjectArea', next)}
                />
              </td>
            </tr>
            <tr>
              <td className={settingTableFieldClass}>Group Questions by Topic</td>
              <td className={settingTableControlClass}>
                <SettingRadioGroup
                  name="group-by-topic"
                  label="Group Questions by Topic"
                  value={value.groupByTopic}
                  options={YES_NO_OPTIONS}
                  onChange={(next) => update('groupByTopic', next)}
                />
              </td>
            </tr>
            <tr>
              <td className={settingTableFieldClass}>Section-Specific Question Numbering</td>
              <td className={settingTableControlClass}>
                <SettingRadioGroup
                  name="section-numbering"
                  label="Section-Specific Question Numbering"
                  value={value.sectionNumbering}
                  options={SECTION_NUMBERING_OPTIONS}
                  onChange={(next) => update('sectionNumbering', next)}
                />
              </td>
            </tr>

            <tr>
              <td rowSpan={2} className={settingTableCategoryClass}>
                Shuffling
              </td>
              <td className={settingTableFieldClass}>Randomize Question Order Within Topics</td>
              <td className={settingTableControlClass}>
                <SettingRadioGroup
                  name="randomize-question-order"
                  label="Randomize Question Order Within Topics"
                  value={value.randomizeQuestionOrder}
                  options={YES_NO_OPTIONS}
                  onChange={(next) => update('randomizeQuestionOrder', next)}
                />
              </td>
            </tr>
            <tr>
              <td className={settingTableFieldClass}>
                Randomize Answer Options Within Questions
              </td>
              <td className={settingTableControlClass}>
                <SettingRadioGroup
                  name="randomize-answer-options"
                  label="Randomize Answer Options Within Questions"
                  value={value.randomizeAnswerOptions}
                  options={YES_NO_OPTIONS}
                  onChange={(next) => update('randomizeAnswerOptions', next)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
