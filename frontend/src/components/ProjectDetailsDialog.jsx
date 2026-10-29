import { lazy, Suspense } from "react";
import AgreementGenerator from "./AgreementGenerator.jsx";
import EscrowOverview from "./EscrowOverview.jsx";
import EscrowPanel from "./EscrowPanel.jsx";

const BlockchainEscrowPanel = lazy(() => import("./BlockchainEscrowPanel.jsx"));

export default function ProjectDetailsDialog(props) {
  const {
    detailProject,
    closeProjectDetails,
    loadingProjectDetails,
    projectDetailsError,
    openProjectDetails,
    formatBudget,
    formatDeadline,
    user,
    projectInvitations,
    cancellingInvitationId,
    cancelProjectInvitation,
    sendingInvitation,
    sendProjectInvitation,
    invitationEmail,
    setInvitationEmail,
    workflowMessage,
    workflowError,
    projectWorkflow,
    loadingWorkflow,
    savingAgreement,
    agreementBrief,
    setAgreementBrief,
    agreementAiConsent,
    setAgreementAiConsent,
    generatingAgreement,
    generateAgreement,
    approveAgreement,
    agreementDraft,
    updateAgreementField,
    saveAgreement,
    submitAgreement,
    uploadingEvidenceId,
    downloadEvidence,
    submitEvidence,
    savingMilestone,
    updatingMilestoneId,
    escrowActionId,
    updateDemoEscrow,
    editMilestone,
    changeMilestoneStatus,
    milestoneDraft,
    setMilestoneDraft,
    editingMilestoneId,
    resetMilestoneForm,
    saveMilestone,
    projectIssues,
    changeRequestDraft,
    setChangeRequestDraft,
    submittingIssue,
    createChangeRequest,
    respondingIssueId,
    updateChangeRequest,
    disputeDraft,
    setDisputeDraft,
    createDispute,
    resolutionNotes,
    setResolutionNotes,
    updateDispute,
    openEditProject,
    startAgreementVersion,
    recordBlockchainDeal
  } = props;

  return (
    <>
        {detailProject && (
          <div
            className="dialog-backdrop"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeProjectDetails();
            }}
          >
            <section
              aria-label="Project details"
              aria-modal="true"
              className="project-details-dialog"
              role="dialog"
            >
              <div className="details-heading">
                <div>
                  <p className="eyebrow">PROJECT DETAILS</p>
                  <span className={`project-status status-${detailProject.status}`}>
                    {detailProject.status.replaceAll("_", " ")}
                  </span>
                </div>
                <button
                  aria-label="Close project details"
                  className="icon-button"
                  onClick={closeProjectDetails}
                  type="button"
                >
                  ×
                </button>
              </div>

              {loadingProjectDetails ? (
                <div className="details-loading" role="status">Loading project details…</div>
              ) : projectDetailsError ? (
                <div className="form-error details-error" role="alert">
                  <span>{projectDetailsError}</span>
                  <button className="text-button" onClick={() => openProjectDetails(detailProject)} type="button">
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  <h2 id="project-details-title">{detailProject.title}</h2>
                  <p className="details-description">
                    {detailProject.description || "No description has been added to this project."}
                  </p>
                  <div className="details-grid">
                    <div className="details-item">
                      <span>Budget</span>
                      <strong>{formatBudget(detailProject.budgetPaise)}</strong>
                    </div>
                    <div className="details-item">
                      <span>Deadline</span>
                      <strong>{formatDeadline(detailProject.deadline)}</strong>
                    </div>
                    <div className="details-item">
                      <span>Created</span>
                      <strong>{formatDeadline(detailProject.createdAt)}</strong>
                    </div>
                    <div className="details-item">
                      <span>Last updated</span>
                      <strong>{formatDeadline(detailProject.updatedAt)}</strong>
                    </div>
                  </div>
                  {(() => {
                    const isProjectCreator = user.role === "client"
                      ? detailProject.clientId === user.id
                      : detailProject.freelancerId === user.id;
                    const counterpartId = user.role === "client"
                      ? detailProject.freelancerId
                      : detailProject.clientId;
                    const pendingInvitation = projectInvitations.find((item) => item.status === "pending");
                    const counterpartRole = user.role === "client" ? "freelancer" : "client";

                    return (
                      <section className="invitation-section" aria-labelledby="invite-heading">
                        <div className="workflow-section-heading">
                          <div>
                            <p className="eyebrow">COLLABORATION</p>
                            <h3 id="invite-heading">Project participant</h3>
                          </div>
                          {counterpartId ? (
                            <span className="project-status status-active">Joined</span>
                          ) : pendingInvitation ? (
                            <span className="project-status">Invitation pending</span>
                          ) : (
                            <span className="project-status">Not invited</span>
                          )}
                        </div>
                        {counterpartId ? (
                          <p className="workflow-note">The {counterpartRole} has joined this project.</p>
                        ) : pendingInvitation ? (
                          <div className="outgoing-invitation">
                            <p>
                              Waiting for {pendingInvitation.invitee?.email ||
                                pendingInvitation.inviteeId?.email || "the invited account"} to accept.
                            </p>
                            {isProjectCreator && (
                              <button
                                className="button button-quiet"
                                disabled={cancellingInvitationId === pendingInvitation._id}
                                onClick={() => cancelProjectInvitation(pendingInvitation)}
                                type="button"
                              >
                                {cancellingInvitationId === pendingInvitation._id ? "Cancelling…" : "Cancel invitation"}
                              </button>
                            )}
                          </div>
                        ) : isProjectCreator ? (
                          <form className="invite-form" onSubmit={sendProjectInvitation}>
                            <label className="field-label" htmlFor="invite-email">
                              Invite a registered {counterpartRole}
                            </label>
                            <div className="invite-input-row">
                              <input
                                autoComplete="email"
                                className="form-input"
                                id="invite-email"
                                onChange={(event) => setInvitationEmail(event.target.value)}
                                placeholder="their account email"
                                required
                                type="email"
                                value={invitationEmail}
                              />
                              <button className="button button-primary" disabled={sendingInvitation} type="submit">
                                {sendingInvitation ? "Sending…" : "Send invite"}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <p className="workflow-note">Waiting for the project creator to invite a {counterpartRole}.</p>
                        )}
                      </section>
                    );
                  })()}
                  <div className="workflow-sections">
                    {workflowMessage && <p className="project-message" role="status">{workflowMessage}</p>}
                    {workflowError && <p className="form-error workflow-error" role="alert">{workflowError}</p>}

                    <section className="workflow-section" aria-labelledby="agreement-heading">
                      <div className="workflow-section-heading">
                        <div>
                          <p className="eyebrow">SHARED TERMS</p>
                          <h3 id="agreement-heading">Agreement</h3>
                        </div>
                        {projectWorkflow?.agreement && (
                          <span className={`project-status status-${projectWorkflow.agreement.status}`}>
                            {projectWorkflow.agreement.status.replaceAll("_", " ")}
                          </span>
                        )}
                      </div>

                      {loadingWorkflow ? (
                        <p className="workflow-loading" role="status">Loading agreement…</p>
                      ) : projectWorkflow?.agreement?.status === "pending_approval" ? (
                        <div className="agreement-review">
                          <p className="agreement-terms">{projectWorkflow.agreement.terms}</p>
                          {projectWorkflow.agreement.acceptanceCriteria?.length > 0 && (
                            <ul className="criteria-list">
                              {projectWorkflow.agreement.acceptanceCriteria.map((criterion, index) => (
                                <li key={`${index}-${criterion}`}>{criterion}</li>
                              ))}
                            </ul>
                          )}
                          <div className="approval-status">
                            <span className={projectWorkflow.agreement.clientApprovedAt ? "approval-done" : ""}>
                              Client {projectWorkflow.agreement.clientApprovedAt ? "approved" : "approval pending"}
                            </span>
                            <span className={projectWorkflow.agreement.freelancerApprovedAt ? "approval-done" : ""}>
                              Freelancer {projectWorkflow.agreement.freelancerApprovedAt ? "approved" : "approval pending"}
                            </span>
                          </div>
                          {!projectWorkflow.agreement[user.role === "client" ? "clientApprovedAt" : "freelancerApprovedAt"] && (
                            <button
                              className="button button-primary workflow-action"
                              disabled={savingAgreement}
                              onClick={approveAgreement}
                              type="button"
                            >
                              {savingAgreement ? "Saving…" : "Approve agreement"}
                            </button>
                          )}
                        </div>
                      ) : projectWorkflow?.agreement?.status === "approved" ? (
                        <div className="agreement-review">
                          <p className="agreement-terms">{projectWorkflow.agreement.terms}</p>
                          {projectWorkflow.agreement.acceptanceCriteria?.length > 0 && (
                            <ul className="criteria-list">
                              {projectWorkflow.agreement.acceptanceCriteria.map((criterion, index) => (
                                <li key={`${index}-${criterion}`}>{criterion}</li>
                              ))}
                            </ul>
                          )}
                          <p className="workflow-note">Approved by both parties.</p>
                          <AgreementGenerator
                            brief={agreementBrief}
                            consent={agreementAiConsent}
                            generating={generatingAgreement}
                            disabled={savingAgreement}
                            onBriefChange={setAgreementBrief}
                            onConsentChange={setAgreementAiConsent}
                            onGenerate={generateAgreement}
                          />
                          <button
                            className="button button-quiet workflow-action"
                            onClick={startAgreementVersion}
                            type="button"
                          >
                            Create a new agreement version
                          </button>
                        </div>
                      ) : (
                        <>
                          <AgreementGenerator
                            brief={agreementBrief}
                            consent={agreementAiConsent}
                            generating={generatingAgreement}
                            disabled={savingAgreement}
                            onBriefChange={setAgreementBrief}
                            onConsentChange={setAgreementAiConsent}
                            onGenerate={generateAgreement}
                          />
                          <form className="workflow-form" onSubmit={saveAgreement}>
                            <label className="field-label" htmlFor="agreement-terms">Agreement terms</label>
                            <textarea
                              className="form-input workflow-textarea"
                              id="agreement-terms"
                              maxLength={20000}
                              name="terms"
                              onChange={updateAgreementField}
                              placeholder="Describe the agreed work, scope, and responsibilities."
                              required
                              rows={4}
                              value={agreementDraft.terms}
                            />
                            <label className="field-label" htmlFor="agreement-criteria">Acceptance criteria <span>(one per line)</span></label>
                            <textarea
                              className="form-input workflow-textarea"
                              id="agreement-criteria"
                              maxLength={15000}
                              name="criteria"
                              onChange={updateAgreementField}
                              placeholder={"Homepage matches approved design\nMobile layout is responsive"}
                              rows={3}
                              value={agreementDraft.criteria}
                            />
                            <div className="workflow-form-actions">
                              <button className="button button-primary" disabled={savingAgreement} type="submit">
                                {savingAgreement ? "Saving…" : projectWorkflow?.agreement ? "Save draft" : "Create agreement draft"}
                              </button>
                              {projectWorkflow?.agreement?.status === "draft" && (
                                <button
                                  className="button button-quiet"
                                  disabled={savingAgreement}
                                  onClick={submitAgreement}
                                  type="button"
                                >
                                  Submit for approval
                                </button>
                              )}
                            </div>
                          </form>
                        </>
                      )}
                    </section>

                    <section className="workflow-section" aria-labelledby="milestones-heading">
                      <div className="workflow-section-heading">
                        <div>
                          <p className="eyebrow">DELIVERABLES</p>
                          <h3 id="milestones-heading">Milestones</h3>
                        </div>
                        <span className="loading-label">
                          {projectWorkflow?.milestones?.length || 0} total
                        </span>
                      </div>

                      {loadingWorkflow ? (
                        <p className="workflow-loading" role="status">Loading milestones…</p>
                      ) : projectWorkflow?.milestones?.length ? (
                        <div className="workflow-milestone-list">
                          {projectWorkflow.milestones.map((milestone) => {
                            const nextStatuses = user.role === "freelancer"
                              ? {
                                pending: ["in_progress"],
                                in_progress: ["submitted"],
                                changes_requested: ["submitted"]
                              }[milestone.status] || []
                              : milestone.status === "submitted" ? ["approved", "changes_requested"] : [];
                            const statusLabels = {
                              in_progress: "Start work",
                              submitted: "Submit work",
                              approved: "Approve",
                              changes_requested: "Request changes"
                            };

                            return (
                              <article className="workflow-milestone" key={milestone._id}>
                                <div className="workflow-milestone-top">
                                  <div>
                                    <h4>{milestone.title}</h4>
                                    <span className={`project-status status-${milestone.status}`}>
                                      {milestone.status.replaceAll("_", " ")}
                                    </span>
                                  </div>
                                  <strong>{formatBudget(milestone.amountMinor)}</strong>
                                </div>
                                <div className="workflow-milestone-meta">
                                  <span>{formatDeadline(milestone.deadline)}</span>
                                  {milestone.acceptanceCriteria?.length > 0 && (
                                    <ul className="criteria-list">
                                      {milestone.acceptanceCriteria.map((criterion, index) => (
                                        <li key={`${index}-${criterion}`}>{criterion}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                                <EscrowPanel
                                  busy={escrowActionId === milestone._id}
                                  formatBudget={formatBudget}
                                  formatDeadline={formatDeadline}
                                  milestone={milestone}
                                  agreementApproved={projectWorkflow?.agreement?.status === "approved" && detailProject.status === "active"}
                                  onAction={(action) => updateDemoEscrow(milestone, action)}
                                  role={user.role}
                                  transactions={projectWorkflow.transactions || []}
                                />
                                <Suspense fallback={<p className="workflow-note">Loading blockchain escrow…</p>}>
                                  <BlockchainEscrowPanel
                                    agreement={projectWorkflow?.agreement}
                                    linkedWallet={user.walletAddress}
                                    milestone={milestone}
                                    onRecordDeal={recordBlockchainDeal}
                                    projectId={detailProject._id}
                                    role={user.role}
                                    wallets={projectWorkflow?.wallets}
                                  />
                                </Suspense>
                                {milestone.evidence?.length > 0 && (
                                  <div className="evidence-list">
                                    <h5>Submitted evidence</h5>
                                    {milestone.evidence.map((evidence) => (
                                      <div className="evidence-item" key={evidence._id}>
                                        <div>
                                          <p>{evidence.description || "File attached"}</p>
                                          <span>
                                            {evidence.submittedBy?.name || "Project participant"} ·{" "}
                                            {formatDeadline(evidence.createdAt)}
                                          </span>
                                        </div>
                                        {evidence.fileUrl && (
                                          <button
                                            className="text-button"
                                            onClick={() => downloadEvidence(evidence)}
                                            type="button"
                                          >
                                            Download {evidence.fileName || "file"}
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {user.role === "freelancer" &&
                                  String(detailProject.freelancerId) === user.id &&
                                  ["in_progress", "changes_requested"].includes(milestone.status) && (
                                    <form
                                      className="evidence-form"
                                      onSubmit={(event) => submitEvidence(event, milestone)}
                                    >
                                      <label className="field-label" htmlFor={`evidence-note-${milestone._id}`}>
                                        Delivery note
                                      </label>
                                      <textarea
                                        className="form-input workflow-textarea"
                                        id={`evidence-note-${milestone._id}`}
                                        maxLength={5000}
                                        name="description"
                                        placeholder="Describe what you delivered or changed."
                                        rows={2}
                                      />
                                      <label className="field-label" htmlFor={`evidence-file-${milestone._id}`}>
                                        Attach file <span>(PDF, TXT, PNG, JPG, WEBP; up to 10 MB)</span>
                                      </label>
                                      <input
                                        className="form-input evidence-file-input"
                                        id={`evidence-file-${milestone._id}`}
                                        name="file"
                                        accept=".pdf,.txt,.png,.jpg,.jpeg,.webp"
                                        type="file"
                                      />
                                      <button
                                        className="button button-primary evidence-submit"
                                        disabled={uploadingEvidenceId === milestone._id}
                                        type="submit"
                                      >
                                        {uploadingEvidenceId === milestone._id ? "Submitting…" : "Submit delivery"}
                                      </button>
                                    </form>
                                  )}
                                <div className="workflow-milestone-actions">
                                  {milestone.status === "pending" && (
                                    <button
                                      className="button button-quiet"
                                      disabled={savingMilestone || updatingMilestoneId === milestone._id}
                                      onClick={() => editMilestone(milestone)}
                                      type="button"
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {nextStatuses.map((status) => (
                                    <button
                                      className={status === "changes_requested" ? "button button-quiet" : "button button-primary"}
                                      disabled={updatingMilestoneId === milestone._id}
                                      key={status}
                                      onClick={() => changeMilestoneStatus(milestone, status)}
                                      type="button"
                                    >
                                      {updatingMilestoneId === milestone._id ? "Updating…" : statusLabels[status]}
                                    </button>
                                  ))}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="workflow-note">No milestones yet. Add the first deliverable below.</p>
                      )}

                      <form className="workflow-form milestone-form" onSubmit={saveMilestone}>
                        <h4>{editingMilestoneId ? "Edit milestone" : "Add a milestone"}</h4>
                        <div className="project-fields">
                          <div className="project-field project-field-wide">
                            <label className="field-label" htmlFor="milestone-title">Milestone title</label>
                            <input
                              className="form-input"
                              id="milestone-title"
                              maxLength={160}
                              onChange={(event) => setMilestoneDraft((current) => ({ ...current, title: event.target.value }))}
                              placeholder="e.g. Initial design delivery"
                              required
                              value={milestoneDraft.title}
                            />
                          </div>
                          <div className="project-field">
                            <label className="field-label" htmlFor="milestone-amount">Amount <span>(INR)</span></label>
                            <div className="currency-input">
                              <span aria-hidden="true">₹</span>
                              <input
                                className="form-input"
                                id="milestone-amount"
                                inputMode="decimal"
                                onChange={(event) => setMilestoneDraft((current) => ({ ...current, budgetRupees: event.target.value }))}
                                placeholder="0.00"
                                required
                                value={milestoneDraft.budgetRupees}
                              />
                            </div>
                          </div>
                          <div className="project-field">
                            <label className="field-label" htmlFor="milestone-deadline">Deadline <span>(optional)</span></label>
                            <input
                              className="form-input"
                              id="milestone-deadline"
                              onChange={(event) => setMilestoneDraft((current) => ({ ...current, deadline: event.target.value }))}
                              type="date"
                              value={milestoneDraft.deadline}
                            />
                          </div>
                          <div className="project-field project-field-wide">
                            <label className="field-label" htmlFor="milestone-criteria">Acceptance criteria <span>(one per line)</span></label>
                            <textarea
                              className="form-input workflow-textarea"
                              id="milestone-criteria"
                              maxLength={15000}
                              onChange={(event) => setMilestoneDraft((current) => ({ ...current, criteria: event.target.value }))}
                              placeholder="Describe how this deliverable will be reviewed."
                              rows={2}
                              value={milestoneDraft.criteria}
                            />
                          </div>
                        </div>
                        <div className="workflow-form-actions">
                          {editingMilestoneId && (
                            <button className="button button-quiet" onClick={resetMilestoneForm} type="button">Cancel edit</button>
                          )}
                          <button className="button button-primary" disabled={savingMilestone} type="submit">
                            {savingMilestone ? "Saving…" : editingMilestoneId ? "Save milestone" : "Add milestone"}
                          </button>
                        </div>
                      </form>
                    </section>
                  </div>
                  <EscrowOverview
                    formatBudget={formatBudget}
                    formatDeadline={formatDeadline}
                    summary={projectWorkflow?.escrow}
                    transactions={projectWorkflow?.transactions || []}
                  />
                  <section className="issue-section" aria-labelledby="change-requests-heading">
                    <div className="workflow-section-heading">
                      <div>
                        <p className="eyebrow">SCOPE UPDATES</p>
                        <h3 id="change-requests-heading">Change requests</h3>
                      </div>
                      <span className="loading-label">{projectIssues.changeRequests.length} total</span>
                    </div>
                    <form className="workflow-form" onSubmit={createChangeRequest}>
                      <label className="field-label" htmlFor="change-description">What needs to change?</label>
                      <textarea
                        className="form-input workflow-textarea"
                        id="change-description"
                        maxLength={5000}
                        onChange={(event) => setChangeRequestDraft((current) => ({ ...current, description: event.target.value }))}
                        placeholder="Describe the requested scope change."
                        required
                        rows={3}
                        value={changeRequestDraft.description}
                      />
                      <div className="project-fields">
                        <div className="project-field">
                          <label className="field-label" htmlFor="change-budget">Proposed budget <span>(optional, INR)</span></label>
                          <div className="currency-input">
                            <span aria-hidden="true">₹</span>
                            <input
                              className="form-input"
                              id="change-budget"
                              inputMode="decimal"
                              onChange={(event) => setChangeRequestDraft((current) => ({ ...current, budgetRupees: event.target.value }))}
                              placeholder="No change"
                              value={changeRequestDraft.budgetRupees}
                            />
                          </div>
                        </div>
                        <div className="project-field">
                          <label className="field-label" htmlFor="change-deadline">Proposed deadline <span>(optional)</span></label>
                          <input
                            className="form-input"
                            id="change-deadline"
                            onChange={(event) => setChangeRequestDraft((current) => ({ ...current, deadline: event.target.value }))}
                            type="date"
                            value={changeRequestDraft.deadline}
                          />
                        </div>
                      </div>
                      <div className="workflow-form-actions">
                        <button className="button button-primary" disabled={submittingIssue} type="submit">
                          {submittingIssue ? "Sending…" : "Send change request"}
                        </button>
                      </div>
                    </form>
                    {projectIssues.changeRequests.length > 0 && (
                      <div className="issue-list">
                        {projectIssues.changeRequests.map((changeRequest) => {
                          const requesterId = typeof changeRequest.requestedBy === "string"
                            ? changeRequest.requestedBy
                            : changeRequest.requestedBy?._id;
                          const isRequester = requesterId === user.id;
                          const isPending = changeRequest.status === "pending";
                          return (
                            <article className="issue-card" key={changeRequest._id}>
                              <div className="issue-card-heading">
                                <span className={`project-status status-${changeRequest.status}`}>
                                  {changeRequest.status}
                                </span>
                                <span>{changeRequest.requestedBy?.name || (isRequester ? user.name : "Project participant")}</span>
                              </div>
                              <p>{changeRequest.description}</p>
                              {(changeRequest.proposedAmountMinor !== undefined || changeRequest.proposedDeadline) && (
                                <div className="issue-proposal">
                                  {changeRequest.proposedAmountMinor !== undefined && (
                                    <span>Budget: {formatBudget(changeRequest.proposedAmountMinor)}</span>
                                  )}
                                  {changeRequest.proposedDeadline && (
                                    <span>Deadline: {formatDeadline(changeRequest.proposedDeadline)}</span>
                                  )}
                                </div>
                              )}
                              {isPending && (
                                <div className="issue-actions">
                                  {isRequester ? (
                                    <button
                                      className="button button-quiet"
                                      disabled={respondingIssueId === changeRequest._id}
                                      onClick={() => updateChangeRequest(changeRequest, "withdraw")}
                                      type="button"
                                    >
                                      Withdraw
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        className="button button-quiet"
                                        disabled={respondingIssueId === changeRequest._id}
                                        onClick={() => updateChangeRequest(changeRequest, "rejected")}
                                        type="button"
                                      >
                                        Reject
                                      </button>
                                      <button
                                        className="button button-primary"
                                        disabled={respondingIssueId === changeRequest._id}
                                        onClick={() => updateChangeRequest(changeRequest, "accepted")}
                                        type="button"
                                      >
                                        Accept
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  <section className="issue-section" aria-labelledby="disputes-heading">
                    <div className="workflow-section-heading">
                      <div>
                        <p className="eyebrow">DOCUMENT A CONCERN</p>
                        <h3 id="disputes-heading">Disputes</h3>
                      </div>
                      <span className="loading-label">{projectIssues.disputes.length} total</span>
                    </div>
                    <form className="workflow-form" onSubmit={createDispute}>
                      <label className="field-label" htmlFor="dispute-milestone">Milestone</label>
                      <select
                        className="form-input"
                        id="dispute-milestone"
                        onChange={(event) => setDisputeDraft((current) => ({ ...current, milestoneId: event.target.value }))}
                        required
                        value={disputeDraft.milestoneId}
                      >
                        <option value="">Select a milestone</option>
                        {(projectWorkflow?.milestones || [])
                          .filter((milestone) => !projectIssues.disputes.some((dispute) =>
                            dispute.milestoneId === milestone._id && ["open", "under_review"].includes(dispute.status)
                          ))
                          .map((milestone) => (
                            <option key={milestone._id} value={milestone._id}>{milestone.title}</option>
                          ))}
                      </select>
                      <label className="field-label" htmlFor="dispute-reason">What is the concern?</label>
                      <textarea
                        className="form-input workflow-textarea"
                        id="dispute-reason"
                        maxLength={5000}
                        onChange={(event) => setDisputeDraft((current) => ({ ...current, reason: event.target.value }))}
                        placeholder="Describe the issue so both participants can review it."
                        required
                        rows={3}
                        value={disputeDraft.reason}
                      />
                      <div className="workflow-form-actions">
                        <button
                          className="button button-quiet"
                          disabled={submittingIssue || !projectWorkflow?.milestones?.length}
                          type="submit"
                        >
                          {submittingIssue ? "Opening…" : "Open dispute"}
                        </button>
                      </div>
                    </form>
                    {projectIssues.disputes.length > 0 && (
                      <div className="issue-list">
                        {projectIssues.disputes.map((dispute) => {
                          const openerId = typeof dispute.openedBy === "string"
                            ? dispute.openedBy
                            : dispute.openedBy?._id;
                          const isOpener = openerId === user.id;
                          const canRespond = !isOpener && ["open", "under_review"].includes(dispute.status);
                          return (
                            <article className="issue-card" key={dispute._id}>
                              <div className="issue-card-heading">
                                <span className={`project-status status-${dispute.status}`}>
                                  {dispute.status.replaceAll("_", " ")}
                                </span>
                                <span>Opened by {dispute.openedBy?.name || (isOpener ? user.name : "project participant")}</span>
                              </div>
                              <p>{dispute.reason}</p>
                              {dispute.resolutionNotes && (
                                <p className="resolution-notes"><strong>Resolution:</strong> {dispute.resolutionNotes}</p>
                              )}
                              {dispute.evidenceIds?.length > 0 && (
                                <span className="issue-evidence-count">
                                  {dispute.evidenceIds.length} evidence item{dispute.evidenceIds.length === 1 ? "" : "s"} attached
                                </span>
                              )}
                              {canRespond && (
                                <div className="dispute-response">
                                  {dispute.status === "open" && (
                                    <button
                                      className="button button-quiet"
                                      disabled={respondingIssueId === dispute._id}
                                      onClick={() => updateDispute(dispute, "under_review")}
                                      type="button"
                                    >
                                      Mark under review
                                    </button>
                                  )}
                                  {dispute.status === "under_review" && (
                                    <>
                                      <label className="field-label" htmlFor={`resolution-${dispute._id}`}>
                                        Resolution notes
                                      </label>
                                      <textarea
                                        className="form-input workflow-textarea"
                                        id={`resolution-${dispute._id}`}
                                        maxLength={5000}
                                        onChange={(event) => setResolutionNotes(event.target.value)}
                                        placeholder="Record the agreed next steps."
                                        rows={2}
                                        value={resolutionNotes}
                                      />
                                      <div className="issue-actions">
                                        <button
                                          className="button button-quiet"
                                          disabled={respondingIssueId === dispute._id || !resolutionNotes.trim()}
                                          onClick={() => updateDispute(dispute, "closed")}
                                          type="button"
                                        >
                                          Close with notes
                                        </button>
                                        <button
                                          className="button button-primary"
                                          disabled={respondingIssueId === dispute._id || !resolutionNotes.trim()}
                                          onClick={() => updateDispute(dispute, "resolved")}
                                          type="button"
                                        >
                                          Resolve dispute
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    )}
                    <p className="workflow-note">
                      Disputes are recorded for the project participants to resolve; FairWork does not make an automated ruling.
                    </p>
                  </section>
                  <div className="details-actions">
                    <button className="button button-quiet" onClick={closeProjectDetails} type="button">Close</button>
                    <button
                      className="button button-primary"
                      onClick={() => {
                        openEditProject(detailProject);
                        closeProjectDetails();
                      }}
                      type="button"
                    >
                      Edit project
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
    </>
  );
}
