export default function AgreementGenerator({
  brief,
  onBriefChange,
  consent,
  onConsentChange,
  onGenerate,
  generating,
  disabled = false
}) {
  return (
    <div className="agreement-generator">
      <label className="field-label" htmlFor="agreement-brief">
        Brief for AI draft
      </label>
      <textarea
        className="form-input workflow-textarea"
        id="agreement-brief"
        maxLength={10000}
        onChange={(event) => {
          onBriefChange(event.target.value);
          onConsentChange(false);
        }}
        placeholder="Add deliverables, responsibilities, review rounds, or other agreed details."
        rows={3}
        value={brief}
      />
      <label className="agreement-ai-consent">
        <input
          checked={consent}
          onChange={(event) => onConsentChange(event.target.checked)}
          type="checkbox"
        />
        <span>I agree to send only this brief to OpenAI to generate a draft. I will not include confidential information.</span>
      </label>
      <div className="workflow-form-actions">
        <button
          className="button button-quiet"
          disabled={generating || disabled || !consent || !brief.trim()}
          onClick={onGenerate}
          type="button"
        >
          {generating ? "Generating…" : "Generate AI draft"}
        </button>
      </div>
      <p className="workflow-note">
        AI output is a starting point, not legal advice. Review and agree on every term before approval.
      </p>
    </div>
  );
}
