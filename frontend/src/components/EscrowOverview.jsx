const transactionLabels = {
  funded_demo: "Demo funding",
  released_demo: "Demo release",
  refunded_demo: "Demo refund",
  held_demo: "Demo funds held"
};

export default function EscrowOverview({ summary, transactions, formatBudget, formatDeadline }) {
  const totals = summary || { fundedMinor: 0, heldMinor: 0, releasedMinor: 0, refundedMinor: 0 };

  return (
    <section className="escrow-overview" aria-labelledby="escrow-overview-heading">
      <div className="workflow-section-heading">
        <div>
          <p className="eyebrow">SIMULATED ONLY · NO MONEY MOVES</p>
          <h3 id="escrow-overview-heading">Escrow ledger</h3>
        </div>
        <span className="project-status">Demo</span>
      </div>
      <div className="escrow-summary-grid">
        <div><span>Held</span><strong>{formatBudget(totals.heldMinor)}</strong></div>
        <div><span>Total funded</span><strong>{formatBudget(totals.fundedMinor)}</strong></div>
        <div><span>Released</span><strong>{formatBudget(totals.releasedMinor)}</strong></div>
        <div><span>Refunded</span><strong>{formatBudget(totals.refundedMinor)}</strong></div>
      </div>
      {transactions.length > 0 ? (
        <ol className="escrow-ledger">
          {transactions.map((transaction) => (
            <li key={transaction._id}>
              <div>
                <strong>{transactionLabels[transaction.type] || transaction.type}</strong>
                <span>{transaction.note}</span>
              </div>
              <div>
                <strong>{formatBudget(transaction.amountMinor)}</strong>
                <span>{formatDeadline(transaction.createdAt)}</span>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="workflow-note">No simulated escrow transactions yet.</p>
      )}
      <p className="workflow-note">
        This ledger is a demonstration record only. It does not collect, hold, refund, or transfer actual funds.
      </p>
    </section>
  );
}
