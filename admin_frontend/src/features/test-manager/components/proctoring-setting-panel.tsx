import { SettingNumberRow } from '@/features/test-manager/components/setting-number-row'
import { SettingRadioRow } from '@/features/test-manager/components/setting-radio-row'
import type {
  ProctoringSettingSettings,
  StreamRecordingMode,
  YesNo,
} from '@/features/test-manager/schema/step-2-settings.schema'

const YES_NO_OPTIONS: Array<{ value: YesNo; label: string }> = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

type ProctoringSettingPanelProps = {
  value: ProctoringSettingSettings
  onChange: (value: ProctoringSettingSettings) => void
}

export function ProctoringSettingPanel({ value, onChange }: ProctoringSettingPanelProps) {
  const update = <K extends keyof ProctoringSettingSettings>(
    field: K,
    next: ProctoringSettingSettings[K],
  ) => {
    onChange({ ...value, [field]: next })
  }

  return (
    <div className="space-y-3 px-3 py-3">
      <p className="text-xs text-muted-foreground">Setup settings as per your test requirement</p>

      <div className="divide-y divide-border">
        <div className="py-2 first:pt-0">
          <SettingRadioRow
            name="enable-proctor-monitoring"
            label="Enable Proctor Monitoring"
            description="Allow Proctoring"
            value={value.enableProctorMonitoring}
            options={YES_NO_OPTIONS}
            onChange={(next) => update('enableProctorMonitoring', next)}
          />
        </div>

        <div className="space-y-2 py-2">
          <SettingRadioRow
            name="stream-recording-mode"
            label="Choose streaming type for proctoring"
            description="If this feature is set to Camera then Proctor will see candidate camera live stream. If this feature is set to Screen then proctor will see candidate screen with camera live stream."
            value={value.streamRecordingMode}
            options={[
              { value: 'camera' as StreamRecordingMode, label: 'Camera' },
              { value: 'screen' as StreamRecordingMode, label: 'Screen' },
            ]}
            onChange={(next) => update('streamRecordingMode', next)}
          />

          <SettingRadioRow
            name="capture-camera-recording"
            label="Do you wish to capture Camera recording as well"
            value={value.captureCameraRecording}
            options={YES_NO_OPTIONS}
            onChange={(next) => update('captureCameraRecording', next)}
          />
        </div>

        <div className="py-2">
          <SettingRadioRow
            name="enable-mic"
            label="Allow Proctor to Access Candidate's Microphone"
            description="Enable Mic"
            value={value.enableMic}
            options={YES_NO_OPTIONS}
            onChange={(next) => update('enableMic', next)}
          />
        </div>

        <div className="py-2">
          <SettingRadioRow
            name="enable-location"
            label="Enable Proctor to Track Candidate's Location"
            description="Enable Location"
            value={value.enableLocation}
            options={YES_NO_OPTIONS}
            onChange={(next) => update('enableLocation', next)}
          />
        </div>

        <div className="py-2">
          <SettingNumberRow
            id="fnp-count-termination"
            label="FNP Count Termination"
            description="Test Termination based on FNP Counts. Enter the value in the text box."
            value={value.fnpCountTermination}
            onChange={(next) => update('fnpCountTermination', next)}
          />
        </div>

        <div className="py-2">
          <SettingRadioRow
            name="face-recognition"
            label="Candidate face recognition before"
            description="Face Recognition"
            value={value.faceRecognition}
            options={YES_NO_OPTIONS}
            onChange={(next) => update('faceRecognition', next)}
          />
        </div>

        <div className="py-2">
          <SettingRadioRow
            name="enable-unfair-means-detection"
            label="Enable Unfair Means Detection for Candidate"
            description="If this feature is enabled, the candidate will be able to see all the enabled UFMs. MFD, FM, FNP will only work if the Face Recognition feature is also enabled."
            value={value.enableUnfairMeansDetection}
            options={YES_NO_OPTIONS}
            onChange={(next) => update('enableUnfairMeansDetection', next)}
          />
        </div>

        <div className="space-y-2 py-2">
          <SettingRadioRow
            name="use-credibility-score"
            label="Use Credibility Score in Rank Generation"
            description="Credibility Score generated based on UFMs. Set a minimum score to qualify candidates for the test. If the credibility score is less than the given percentage, then the candidate will be disqualified based on credibility score."
            value={value.useCredibilityScore}
            options={YES_NO_OPTIONS}
            onChange={(next) => update('useCredibilityScore', next)}
          />

          {value.useCredibilityScore === 'yes' ? (
            <SettingNumberRow
              id="minimum-credibility-score"
              label="Minimum Credibility Score"
              value={value.minimumCredibilityScore}
              onChange={(next) => update('minimumCredibilityScore', next)}
            />
          ) : null}

          <SettingRadioRow
            name="make-credibility-score-visible"
            label="Make it visible to candidates"
            description="Ensure that candidates are able to see live credibility score."
            value={value.makeCredibilityScoreVisible}
            options={YES_NO_OPTIONS}
            onChange={(next) => update('makeCredibilityScoreVisible', next)}
          />
        </div>

        <div className="py-2">
          <SettingRadioRow
            name="allow-proctor-to-suspend-tests"
            label="Allow Proctor to Suspend Tests"
            description="If this feature is enabled then proctor will see the suspend option and will be able to suspend candidate Test for a time period."
            value={value.allowProctorToSuspendTests}
            options={YES_NO_OPTIONS}
            onChange={(next) => update('allowProctorToSuspendTests', next)}
          />
        </div>

        <div className="py-2">
          <SettingRadioRow
            name="escalation-matrix"
            label="Escalation Matrix"
            description="Parameter that can be used to define escalation to the proctor based on candidate UFMs or Credibility Score."
            value={value.escalationMatrix}
            options={YES_NO_OPTIONS}
            onChange={(next) => update('escalationMatrix', next)}
          />
        </div>

        <div className="py-2">
          <SettingRadioRow
            name="candidate-initiate-chat"
            label="Can candidate initiate the chat"
            description="Candidate can engage in real-time chat communication during the exam."
            value={value.candidateInitiateChat}
            options={YES_NO_OPTIONS}
            onChange={(next) => update('candidateInitiateChat', next)}
          />
        </div>

        <div className="py-2">
          <SettingRadioRow
            name="ufm-matrix"
            label="Define UFMs"
            description="Based on the priority and seriousness of UFMs, determine their weightage on a scale of 1 to 5."
            value={value.ufmMatrix}
            options={YES_NO_OPTIONS}
            onChange={(next) => update('ufmMatrix', next)}
          />
        </div>

        <div className="py-2 last:pb-0">
          <SettingRadioRow
            name="manual-proctoring-automatic-compatibility"
            label="Manual proctoring - Automatic compatibility"
            description="When this feature is enabled, manual proctoring compatibility will function automatically."
            value={value.manualProctoringAutomaticCompatibility}
            options={YES_NO_OPTIONS}
            onChange={(next) => update('manualProctoringAutomaticCompatibility', next)}
          />
        </div>
      </div>
    </div>
  )
}
