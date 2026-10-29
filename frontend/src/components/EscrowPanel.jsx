const actionLabels = {
  fund: "Fund demo escrow",
  release: "Release demo funds",
  refund: "Refund demo funds"
};

const transactionLabels = {
  funded_demo: "Demo funds held",
  released_demo: "Demo funds released",
  refunded_demo: "Demo funds refunded",
  held_demo: "Demo funds held"
};

export default function EscrowPanel({
  milestone,
  transactions,
  role,
  agreementApproved,
  busy,
  formatBudget,
  formatDeadline,
  onAction
}) {
  const canFund = milestone.escrowStatus === "not_funded" &&
    ["pending", "in_progress"].includes(milestone.status) &&
    agreementApproved &&
    milestone.amountMinor > 0;
  const canRelease = milestone.escrowStatus === "funded" && milestone.status === "approved";
  const canRefund = milestone.escrowStatus === "funded" &&
    ["pending", "changes_requested"].includes(milestone.status);
  const actions = [
    ...(canFund ? ["fund"] : []),
    ...(canRelease ? ["release"] : []),
    ...(canRefund ? ["refund"] : [])
  ];
  const milestoneTransactions = transactions.filter((item) =>
    String(item.milestoneId) === String(milestone._id)
  );

  return (
    <section className="milestone-escrow" aria-label={`Demo escrow for ${milestone.title}`}>
      <div className="milestone-escrow-heading">
        <div>
          <strong>Demo escrow</strong>
          <span className={`project-status status-${milestone.escrowStatus || "not_funded"}`}>
            {(milestone.escrowStatus || "not_funded").replaceAll("_", " ")}
          </span>
        </div>
        <strong>{formatBudget(milestone.amountMinor)}</strong>
      </div>
      {role === "client" && actions.length > 0 && (
        <div className="issue-actions">
          {actions.map((action) => (
            <button
              className={action === "release" ? "button button-primary" : "button button-quiet"}
              disabled={busy}
              key={action}
              onClick={() => onAction(action)}
              type="button"
            >
              {busy ? "Updating…" : actionLabels[action]}
            </button>
          ))}
        </div>
      )}
      {role !== "client" && milestone.escrowStatus === "not_funded" && (
        <p className="workflow-note">The client controls the demo escrow simulation.</p>
      )}
      {role === "client" && milestone.escrowStatus === "not_funded" && !agreementApproved && (
        <p className="workflow-note">Both participants must approve an agreement before demo funding.</p>
      )}
      {milestoneTransactions.length > 0 && (
        <ul className="escrow-transaction-list">
          {milestoneTransactions.map((transaction) => (
            <li key={transaction._id}>
              <span>{transactionLabels[transaction.type] || transaction.type}</span>
              <span>{formatBudget(transaction.amountMinor)} · {formatDeadline(transaction.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
