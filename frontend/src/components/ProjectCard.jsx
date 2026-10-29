export default function ProjectCard({
  project,
  isProjectCreator,
  isDeleting,
  formatBudget,
  formatDeadline,
  onDetails,
  onEdit,
  onDelete
}) {
  return (
    <article className="project-card">
      <div className="project-card-main">
        <div className="project-card-title">
          <span className="project-card-icon" aria-hidden="true">◈</span>
          <div>
            <h3>{project.title}</h3>
            <span className={`project-status status-${project.status}`}>{project.status.replaceAll("_", " ")}</span>
          </div>
        </div>
        {project.description && <p className="project-card-description">{project.description}</p>}
      </div>
      <div className="project-card-meta">
        <div><span>Budget</span><strong>{formatBudget(project.budgetPaise)}</strong></div>
        <div><span>Deadline</span><strong>{formatDeadline(project.deadline)}</strong></div>
      </div>
      <div className="project-card-actions">
        <button className="button button-quiet" onClick={onDetails}>Details</button>
        <button className="button button-quiet" onClick={onEdit}>Edit</button>
        <button
          className="button button-danger"
          disabled={isDeleting || !isProjectCreator}
          onClick={onDelete}
          title={!isProjectCreator ? "Only the project creator can delete it." : undefined}
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </article>
  );
}
