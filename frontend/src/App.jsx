import { useEffect, useState } from "react";
import api, { clearAuthToken, getAuthToken, saveAuthToken } from "./services/api.js";
import AuthScreen from "./components/AuthScreen.jsx";
import ProjectCard from "./components/ProjectCard.jsx";
import ProjectDetailsDialog from "./components/ProjectDetailsDialog.jsx";

export default function App() {
  const [mode, setMode] = useState("login");
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState("");
  const [projectMessage, setProjectMessage] = useState("");
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [invitationsError, setInvitationsError] = useState("");
  const [respondingInvitationId, setRespondingInvitationId] = useState(null);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [detailProject, setDetailProject] = useState(null);
  const [loadingProjectDetails, setLoadingProjectDetails] = useState(false);
  const [projectDetailsError, setProjectDetailsError] = useState("");
  const [projectWorkflow, setProjectWorkflow] = useState(null);
  const [projectInvitations, setProjectInvitations] = useState([]);
  const [projectIssues, setProjectIssues] = useState({ disputes: [], changeRequests: [] });
  const [changeRequestDraft, setChangeRequestDraft] = useState({
    description: "",
    budgetRupees: "",
    deadline: ""
  });
  const [disputeDraft, setDisputeDraft] = useState({ milestoneId: "", reason: "" });
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [submittingIssue, setSubmittingIssue] = useState(false);
  const [respondingIssueId, setRespondingIssueId] = useState(null);
  const [invitationEmail, setInvitationEmail] = useState("");
  const [sendingInvitation, setSendingInvitation] = useState(false);
  const [cancellingInvitationId, setCancellingInvitationId] = useState(null);
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);
  const [workflowError, setWorkflowError] = useState("");
  const [workflowMessage, setWorkflowMessage] = useState("");
  const [savingAgreement, setSavingAgreement] = useState(false);
  const [agreementDraft, setAgreementDraft] = useState({ terms: "", criteria: "" });
  const [savingMilestone, setSavingMilestone] = useState(false);
  const [updatingMilestoneId, setUpdatingMilestoneId] = useState(null);
  const [uploadingEvidenceId, setUploadingEvidenceId] = useState(null);
  const [milestoneDraft, setMilestoneDraft] = useState({
    title: "",
    budgetRupees: "",
    deadline: "",
    criteria: ""
  });
  const [editingMilestoneId, setEditingMilestoneId] = useState(null);
  const [savingProject, setSavingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState(null);
  const [projectForm, setProjectForm] = useState({
    title: "",
    description: "",
    budgetRupees: "",
    deadline: ""
  });
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "client"
  });

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      if (!getAuthToken()) {
        setCheckingSession(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");
        if (active) setUser(response.data.user);
      } catch {
        clearAuthToken();
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    let active = true;
    setLoadingProjects(true);
    setProjectsError("");

    api.get("/projects")
      .then((response) => {
        if (active) setProjects(response.data.projects);
      })
      .catch((requestError) => {
        if (active) {
          setProjectsError(
            requestError.response?.data?.message ||
            "Could not load projects. Check your connection and try again."
          );
        }
      })
      .finally(() => {
        if (active) setLoadingProjects(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    let active = true;
    setLoadingInvitations(true);
    setInvitationsError("");
    api.get("/projects/invitations/pending")
      .then((response) => {
        if (active) setPendingInvitations(response.data.invitations);
      })
      .catch((requestError) => {
        if (active) {
          setInvitationsError(
            requestError.response?.data?.message ||
            "Could not load invitations. Check your connection and try again."
          );
        }
      })
      .finally(() => {
        if (active) setLoadingInvitations(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const isRegistering = mode === "register";
      const endpoint = isRegistering ? "/auth/register" : "/auth/login";
      const payload = isRegistering
        ? { name: form.name, email: form.email, password: form.password, role: form.role }
        : { email: form.email, password: form.password };
      const response = await api.post(endpoint, payload);

      saveAuthToken(response.data.token);
      setUser(response.data.user);
      setForm((current) => ({ ...current, password: "" }));
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        "Could not connect to FairWork. Check that the backend is running and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
  }

  function handleLogout() {
    clearAuthToken();
    setUser(null);
    closeProjectDetails();
    setMode("login");
    setForm({ name: "", email: "", password: "", role: "client" });
  }

  function resetProjectForm() {
    setProjectForm({ title: "", description: "", budgetRupees: "", deadline: "" });
    setEditingProjectId(null);
    setProjectFormOpen(false);
    setProjectsError("");
  }

  function openCreateProject() {
    setProjectForm({ title: "", description: "", budgetRupees: "", deadline: "" });
    setEditingProjectId(null);
    setProjectFormOpen(true);
    setProjectsError("");
    setProjectMessage("");
  }

  async function openProjectDetails(project) {
    setDetailProject(project);
    setLoadingProjectDetails(true);
    setLoadingWorkflow(true);
    setProjectDetailsError("");
    setWorkflowError("");
    setWorkflowMessage("");
    setProjectWorkflow(null);
    setProjectInvitations([]);
    setProjectIssues({ disputes: [], changeRequests: [] });
    setInvitationEmail("");

    const [projectResult, workflowResult, invitationsResult, issuesResult] = await Promise.allSettled([
      api.get(`/projects/${project._id}`),
      api.get(`/projects/${project._id}/workflow`),
      api.get(`/projects/${project._id}/invitations`),
      api.get(`/projects/${project._id}/issues`)
    ]);

    if (projectResult.status === "fulfilled") {
      setDetailProject(projectResult.value.data.project);
    } else {
      setProjectDetailsError(
        projectResult.reason.response?.data?.message ||
        "Could not load project details. Check your connection and try again."
      );
    }

    if (workflowResult.status === "fulfilled") {
      const { agreement, milestones } = workflowResult.value.data;
      setProjectWorkflow({ agreement, milestones });
      setAgreementDraft({
        terms: agreement?.terms || "",
        criteria: agreement?.acceptanceCriteria?.join("\n") || ""
      });
    } else {
      setWorkflowError(
        workflowResult.reason.response?.data?.message ||
        "Could not load agreement and milestone data. Try again."
      );
    }
    if (invitationsResult.status === "fulfilled") {
      setProjectInvitations(invitationsResult.value.data.invitations);
    } else {
      setWorkflowError((current) => current || invitationsResult.reason.response?.data?.message ||
        "Could not load project invitations. Try again.");
    }
    if (issuesResult.status === "fulfilled") {
      setProjectIssues({
        disputes: issuesResult.value.data.disputes,
        changeRequests: issuesResult.value.data.changeRequests
      });
    } else {
      setWorkflowError((current) => current || issuesResult.reason.response?.data?.message ||
        "Could not load disputes and change requests. Try again.");
    }
    setLoadingProjectDetails(false);
    setLoadingWorkflow(false);
  }

  function closeProjectDetails() {
    setDetailProject(null);
    setProjectDetailsError("");
    setProjectWorkflow(null);
    setProjectInvitations([]);
    setProjectIssues({ disputes: [], changeRequests: [] });
    setWorkflowError("");
    setWorkflowMessage("");
    setEditingMilestoneId(null);
    setMilestoneDraft({ title: "", budgetRupees: "", deadline: "", criteria: "" });
  }

  async function sendProjectInvitation(event) {
    event.preventDefault();
    if (!detailProject) return;

    setSendingInvitation(true);
    setWorkflowError("");
    setWorkflowMessage("");
    try {
      const response = await api.post(`/projects/${detailProject._id}/invitations`, {
        email: invitationEmail.trim()
      });
      setProjectInvitations((current) => [response.data.invitation, ...current]);
      setInvitationEmail("");
      setWorkflowMessage("Invitation sent. The other participant can accept it from their workspace.");
    } catch (requestError) {
      setWorkflowError(
        requestError.response?.data?.message || "Could not send this invitation. Try again."
      );
    } finally {
      setSendingInvitation(false);
    }
  }

  async function cancelProjectInvitation(invitation) {
    if (!detailProject) return;
    setCancellingInvitationId(invitation._id);
    setWorkflowError("");
    setWorkflowMessage("");
    try {
      await api.delete(`/projects/${detailProject._id}/invitations/${invitation._id}`);
      setProjectInvitations((current) => current.map((item) =>
        item._id === invitation._id ? { ...item, status: "cancelled" } : item
      ));
      setWorkflowMessage("Invitation cancelled.");
    } catch (requestError) {
      setWorkflowError(
        requestError.response?.data?.message || "Could not cancel this invitation. Try again."
      );
    } finally {
      setCancellingInvitationId(null);
    }
  }

  async function createChangeRequest(event) {
    event.preventDefault();
    if (!detailProject) return;
    const proposedAmountMinor = budgetToPaise(changeRequestDraft.budgetRupees);
    if (proposedAmountMinor === undefined) {
      setWorkflowError("Enter a proposed budget with no more than two decimal places.");
      return;
    }

    setSubmittingIssue(true);
    setWorkflowError("");
    setWorkflowMessage("");
    try {
      const response = await api.post(`/projects/${detailProject._id}/change-requests`, {
        description: changeRequestDraft.description.trim(),
        ...(proposedAmountMinor !== null ? { proposedAmountMinor } : {}),
        ...(changeRequestDraft.deadline ? { proposedDeadline: changeRequestDraft.deadline } : {})
      });
      setProjectIssues((current) => ({
        ...current,
        changeRequests: [response.data.changeRequest, ...current.changeRequests]
      }));
      setChangeRequestDraft({ description: "", budgetRupees: "", deadline: "" });
      setWorkflowMessage("Change request sent to the other participant.");
    } catch (requestError) {
      setWorkflowError(
        requestError.response?.data?.message || "Could not submit the change request."
      );
    } finally {
      setSubmittingIssue(false);
    }
  }

  async function updateChangeRequest(changeRequest, decision) {
    if (!detailProject) return;
    setRespondingIssueId(changeRequest._id);
    setWorkflowError("");
    setWorkflowMessage("");
    try {
      const endpoint = decision === "withdraw"
        ? `/projects/${detailProject._id}/change-requests/${changeRequest._id}/withdraw`
        : `/projects/${detailProject._id}/change-requests/${changeRequest._id}/respond`;
      const response = await api.post(endpoint, decision === "withdraw" ? {} : { decision });
      setProjectIssues((current) => ({
        ...current,
        changeRequests: current.changeRequests.map((item) =>
          item._id === changeRequest._id ? response.data.changeRequest : item
        )
      }));
      if (response.data.project) {
        setDetailProject(response.data.project);
        setProjects((current) => current.map((item) =>
          item._id === response.data.project._id ? response.data.project : item
        ));
      }
      setWorkflowMessage(decision === "withdraw" ? "Change request withdrawn." : `Change request ${decision}.`);
    } catch (requestError) {
      setWorkflowError(
        requestError.response?.data?.message || "Could not update the change request."
      );
    } finally {
      setRespondingIssueId(null);
    }
  }

  async function createDispute(event) {
    event.preventDefault();
    if (!detailProject) return;
    setSubmittingIssue(true);
    setWorkflowError("");
    setWorkflowMessage("");
    try {
      const response = await api.post(`/projects/${detailProject._id}/disputes`, {
        milestoneId: disputeDraft.milestoneId,
        reason: disputeDraft.reason.trim()
      });
      setProjectIssues((current) => ({
        ...current,
        disputes: [response.data.dispute, ...current.disputes]
      }));
      setProjectWorkflow((current) => ({
        ...current,
        milestones: current.milestones.map((milestone) =>
          milestone._id === response.data.milestone._id ? response.data.milestone : milestone
        )
      }));
      setDetailProject(response.data.project);
      setProjects((current) => current.map((item) =>
        item._id === response.data.project._id ? response.data.project : item
      ));
      setDisputeDraft({ milestoneId: "", reason: "" });
      setWorkflowMessage("Dispute opened and recorded for both project participants.");
    } catch (requestError) {
      setWorkflowError(requestError.response?.data?.message || "Could not open the dispute.");
    } finally {
      setSubmittingIssue(false);
    }
  }

  async function updateDispute(dispute, status) {
    if (!detailProject) return;
    setRespondingIssueId(dispute._id);
    setWorkflowError("");
    setWorkflowMessage("");
    try {
      const response = await api.patch(`/projects/${detailProject._id}/disputes/${dispute._id}`, {
        status,
        resolutionNotes
      });
      setProjectIssues((current) => ({
        ...current,
        disputes: current.disputes.map((item) =>
          item._id === dispute._id ? response.data.dispute : item
        )
      }));
      setDetailProject(response.data.project);
      setProjects((current) => current.map((item) =>
        item._id === response.data.project._id ? response.data.project : item
      ));
      setProjectWorkflow((current) => ({
        ...current,
        milestones: current.milestones.map((milestone) =>
          milestone._id === dispute.milestoneId
            ? { ...milestone, status: status === "under_review" ? milestone.status : "in_progress" }
            : milestone
        )
      }));
      setResolutionNotes("");
      setWorkflowMessage(status === "under_review" ? "Dispute moved to review." : "Dispute resolution recorded.");
    } catch (requestError) {
      setWorkflowError(requestError.response?.data?.message || "Could not update the dispute.");
    } finally {
      setRespondingIssueId(null);
    }
  }

  async function respondToInvitation(invitation, action) {
    setRespondingInvitationId(invitation._id);
    setInvitationsError("");
    try {
      const response = await api.post(`/projects/invitations/${invitation._id}/${action}`);
      setPendingInvitations((current) => current.filter((item) => item._id !== invitation._id));
      if (action === "accept") {
        setProjects((current) => [
          response.data.project,
          ...current.filter((project) => project._id !== response.data.project._id)
        ]);
      }
    } catch (requestError) {
      setInvitationsError(
        requestError.response?.data?.message || `Could not ${action} this invitation. Try again.`
      );
    } finally {
      setRespondingInvitationId(null);
    }
  }

  useEffect(() => {
    if (!detailProject) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") closeProjectDetails();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [detailProject]);

  function openEditProject(project) {
    setProjectForm({
      title: project.title,
      description: project.description || "",
      budgetRupees: project.budgetPaise === null || project.budgetPaise === undefined
        ? ""
        : (project.budgetPaise / 100).toFixed(2),
      deadline: project.deadline ? new Date(project.deadline).toISOString().slice(0, 10) : ""
    });
    setEditingProjectId(project._id);
    setProjectFormOpen(true);
    setProjectsError("");
    setProjectMessage("");
  }

  function updateProjectField(event) {
    const { name, value } = event.target;
    setProjectForm((current) => ({ ...current, [name]: value }));
  }

  function budgetToPaise(rupees) {
    if (rupees.trim() === "") return null;
    if (!/^\d+(?:\.\d{1,2})?$/.test(rupees)) return undefined;

    const [whole, fraction = ""] = rupees.split(".");
    const paise = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
    return Number.isSafeInteger(paise) ? paise : undefined;
  }

  async function handleProjectSubmit(event) {
    event.preventDefault();
    setProjectsError("");
    setProjectMessage("");

    const budgetPaise = budgetToPaise(projectForm.budgetRupees);
    if (budgetPaise === undefined) {
      setProjectsError("Enter a valid budget with no more than two decimal places.");
      return;
    }

    setSavingProject(true);
    const payload = {
      title: projectForm.title.trim(),
      description: projectForm.description.trim(),
      budgetPaise,
      deadline: projectForm.deadline || null
    };

    try {
      if (editingProjectId) {
        const response = await api.patch(`/projects/${editingProjectId}`, payload);
        setProjects((current) => current.map((project) =>
          project._id === editingProjectId ? response.data.project : project
        ));
        setDetailProject((current) => (
          current?._id === editingProjectId ? response.data.project : current
        ));
        setProjectMessage("Project updated.");
      } else {
        const response = await api.post("/projects", payload);
        setProjects((current) => [response.data.project, ...current]);
        setProjectMessage("Project created.");
      }

      setProjectFormOpen(false);
      setEditingProjectId(null);
      setProjectForm({ title: "", description: "", budgetRupees: "", deadline: "" });
    } catch (requestError) {
      setProjectsError(
        requestError.response?.data?.message ||
        "Could not save this project. Check your connection and try again."
      );
    } finally {
      setSavingProject(false);
    }
  }

  async function handleDeleteProject(project) {
    if (!window.confirm(`Delete "${project.title}"? This cannot be undone.`)) return;

    setProjectsError("");
    setProjectMessage("");
    setDeletingProjectId(project._id);
    try {
      await api.delete(`/projects/${project._id}`);
      setProjects((current) => current.filter((item) => item._id !== project._id));
      setProjectMessage("Project deleted.");
      if (editingProjectId === project._id) resetProjectForm();
    } catch (requestError) {
      setProjectsError(
        requestError.response?.data?.message ||
        "Could not delete this project. Check your connection and try again."
      );
    } finally {
      setDeletingProjectId(null);
    }
  }

  function formatBudget(budgetPaise) {
    if (budgetPaise === null || budgetPaise === undefined) return "Budget not set";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2
    }).format(budgetPaise / 100);
  }

  function formatDeadline(deadline) {
    if (!deadline) return "No deadline";
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(new Date(deadline));
  }

  function parseCriteriaText(value) {
    return value.split("\n").map((item) => item.trim()).filter(Boolean);
  }

  function updateAgreementField(event) {
    const { name, value } = event.target;
    setAgreementDraft((current) => ({ ...current, [name]: value }));
  }

  async function saveAgreement(event) {
    event.preventDefault();
    if (!detailProject) return;

    setSavingAgreement(true);
    setWorkflowError("");
    setWorkflowMessage("");
    const payload = {
      terms: agreementDraft.terms.trim(),
      acceptanceCriteria: parseCriteriaText(agreementDraft.criteria)
    };

    try {
      const agreement = projectWorkflow?.agreement;
      const response = agreement?.status === "draft"
        ? await api.patch(`/projects/${detailProject._id}/agreements/${agreement._id}`, payload)
        : await api.post(`/projects/${detailProject._id}/agreements`, payload);
      setProjectWorkflow((current) => ({ ...current, agreement: response.data.agreement }));
      setWorkflowMessage("Agreement draft saved.");
    } catch (requestError) {
      setWorkflowError(
        requestError.response?.data?.message ||
        "Could not save the agreement. Try again."
      );
    } finally {
      setSavingAgreement(false);
    }
  }

  async function submitAgreement() {
    if (!detailProject || !projectWorkflow?.agreement) return;
    setSavingAgreement(true);
    setWorkflowError("");
    setWorkflowMessage("");
    try {
      const agreement = projectWorkflow.agreement;
      const response = await api.post(
        `/projects/${detailProject._id}/agreements/${agreement._id}/submit`
      );
      setProjectWorkflow((current) => ({ ...current, agreement: response.data.agreement }));
      setDetailProject(response.data.project || { ...detailProject, status: "awaiting_agreement" });
      setWorkflowMessage("Agreement submitted for both parties to review.");
    } catch (requestError) {
      setWorkflowError(
        requestError.response?.data?.message || "Could not submit the agreement. Try again."
      );
    } finally {
      setSavingAgreement(false);
    }
  }

  async function approveAgreement() {
    if (!detailProject || !projectWorkflow?.agreement) return;
    setSavingAgreement(true);
    setWorkflowError("");
    setWorkflowMessage("");
    try {
      const agreement = projectWorkflow.agreement;
      const response = await api.post(
        `/projects/${detailProject._id}/agreements/${agreement._id}/approve`
      );
      setProjectWorkflow((current) => ({ ...current, agreement: response.data.agreement }));
      if (response.data.project) {
        setDetailProject(response.data.project);
        setProjects((current) => current.map((item) =>
          item._id === response.data.project._id ? response.data.project : item
        ));
      }
      setWorkflowMessage(response.data.agreement.status === "approved"
        ? "Both parties approved the agreement."
        : "Your approval is recorded. The other party must also approve.");
    } catch (requestError) {
      setWorkflowError(
        requestError.response?.data?.message || "Could not approve the agreement. Try again."
      );
    } finally {
      setSavingAgreement(false);
    }
  }

  function resetMilestoneForm() {
    setMilestoneDraft({ title: "", budgetRupees: "", deadline: "", criteria: "" });
    setEditingMilestoneId(null);
  }

  function editMilestone(milestone) {
    setMilestoneDraft({
      title: milestone.title,
      budgetRupees: (milestone.amountMinor / 100).toFixed(2),
      deadline: milestone.deadline ? new Date(milestone.deadline).toISOString().slice(0, 10) : "",
      criteria: milestone.acceptanceCriteria?.join("\n") || ""
    });
    setEditingMilestoneId(milestone._id);
  }

  async function saveMilestone(event) {
    event.preventDefault();
    if (!detailProject) return;
    const amountMinor = budgetToPaise(milestoneDraft.budgetRupees);
    if (amountMinor === undefined || amountMinor === null) {
      setWorkflowError("Enter a milestone amount with no more than two decimal places.");
      return;
    }

    setSavingMilestone(true);
    setWorkflowError("");
    setWorkflowMessage("");
    const payload = {
      title: milestoneDraft.title.trim(),
      amountMinor,
      deadline: milestoneDraft.deadline || null,
      acceptanceCriteria: parseCriteriaText(milestoneDraft.criteria)
    };

    try {
      const response = editingMilestoneId
        ? await api.patch(`/projects/${detailProject._id}/milestones/${editingMilestoneId}`, payload)
        : await api.post(`/projects/${detailProject._id}/milestones`, payload);
      setProjectWorkflow((current) => ({
        ...current,
        milestones: editingMilestoneId
          ? current.milestones.map((milestone) =>
            milestone._id === editingMilestoneId ? response.data.milestone : milestone
          )
          : [...current.milestones, response.data.milestone]
      }));
      setWorkflowMessage(editingMilestoneId ? "Milestone updated." : "Milestone added.");
      resetMilestoneForm();
    } catch (requestError) {
      setWorkflowError(
        requestError.response?.data?.message || "Could not save the milestone. Try again."
      );
    } finally {
      setSavingMilestone(false);
    }
  }

  async function changeMilestoneStatus(milestone, status) {
    if (!detailProject) return;
    setUpdatingMilestoneId(milestone._id);
    setWorkflowError("");
    setWorkflowMessage("");
    try {
      const response = await api.patch(
        `/projects/${detailProject._id}/milestones/${milestone._id}/status`,
        { status }
      );
      setProjectWorkflow((current) => ({
        ...current,
        milestones: current.milestones.map((item) =>
          item._id === milestone._id ? response.data.milestone : item
        )
      }));
      setWorkflowMessage("Milestone status updated.");
    } catch (requestError) {
      setWorkflowError(
        requestError.response?.data?.message || "Could not update milestone status. Try again."
      );
    } finally {
      setUpdatingMilestoneId(null);
    }
  }

  async function submitEvidence(event, milestone) {
    event.preventDefault();
    if (!detailProject) return;

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    setUploadingEvidenceId(milestone._id);
    setWorkflowError("");
    setWorkflowMessage("");
    try {
      const response = await api.post(
        `/projects/${detailProject._id}/milestones/${milestone._id}/evidence`,
        formData
      );
      setProjectWorkflow((current) => ({
        ...current,
        milestones: current.milestones.map((item) =>
          item._id === milestone._id
            ? {
              ...item,
              ...response.data.milestone,
              evidence: [response.data.evidence, ...(item.evidence || [])]
            }
            : item
        )
      }));
      setWorkflowMessage("Delivery evidence submitted for client review.");
      formElement.reset();
    } catch (requestError) {
      setWorkflowError(
        requestError.response?.data?.message || "Could not submit evidence. Try again."
      );
    } finally {
      setUploadingEvidenceId(null);
    }
  }

  async function downloadEvidence(evidence) {
    if (!evidence.fileUrl) return;
    setWorkflowError("");
    try {
      const response = await api.get(evidence.fileUrl, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = evidence.fileName || "evidence";
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setWorkflowError(
        requestError.response?.data?.message || "Could not download this evidence file."
      );
    }
  }

  if (checkingSession) {
    return (
      <main className="auth-page">
        <div className="loading-card" role="status">Loading your FairWork workspace…</div>
      </main>
    );
  }

  if (user) {
    return (
      <main className="workspace-page">
        <header className="topbar">
          <a className="brand" href="/">FairWork<span>AI</span></a>
          <div className="user-menu">
            <span className="user-greeting">{user.name}</span>
            <span className="user-role">{user.role}</span>
            <button className="button button-quiet" onClick={handleLogout}>Log out</button>
          </div>
        </header>
        <div className="workspace-content">
          <section className="workspace-heading">
            <div>
              <p className="eyebrow">YOUR WORKSPACE</p>
              <h1>Projects, made clearer.</h1>
              <p>Keep your freelance work and expectations organized in one place.</p>
            </div>
            <button className="button button-primary create-project-button" onClick={openCreateProject}>
              <span aria-hidden="true">＋</span> New project
            </button>
          </section>

          {(loadingInvitations || invitationsError || pendingInvitations.length > 0) && (
            <section className="invitations-panel" aria-labelledby="invitations-heading">
              <div className="project-panel-heading">
                <div>
                  <h2 id="invitations-heading">Project invitations</h2>
                  <p>Join a project when you’re ready.</p>
                </div>
                {loadingInvitations && <span className="loading-label" role="status">Loading…</span>}
              </div>
              {invitationsError && <p className="form-error" role="alert">{invitationsError}</p>}
              {pendingInvitations.map((invitation) => (
                <article className="incoming-invitation" key={invitation._id}>
                  <div className="incoming-invitation-copy">
                    <span className="invitation-icon" aria-hidden="true">✉</span>
                    <div>
                      <h3>{invitation.projectId?.title || "Project invitation"}</h3>
                      <p>
                        {invitation.inviterId?.name || "A FairWork member"} invited you as a{" "}
                        <strong>{invitation.invitedRole}</strong>
                      </p>
                    </div>
                  </div>
                  <div className="invitation-actions">
                    <button
                      className="button button-quiet"
                      disabled={respondingInvitationId === invitation._id}
                      onClick={() => respondToInvitation(invitation, "decline")}
                      type="button"
                    >
                      Decline
                    </button>
                    <button
                      className="button button-primary"
                      disabled={respondingInvitationId === invitation._id}
                      onClick={() => respondToInvitation(invitation, "accept")}
                      type="button"
                    >
                      {respondingInvitationId === invitation._id ? "Please wait…" : "Accept invitation"}
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}

          <section className="project-panel" aria-labelledby="projects-title">
            <div className="project-panel-heading">
              <div>
                <h2 id="projects-title">Your projects</h2>
                <p>{projects.length} {projects.length === 1 ? "project" : "projects"}</p>
              </div>
              {loadingProjects && <span className="loading-label" role="status">Refreshing…</span>}
            </div>

            {projectMessage && <p className="project-message" role="status">{projectMessage}</p>}
            {projectsError && (
              <div className="form-error project-error" role="alert">
                <span>{projectsError}</span>
                <button className="text-button" onClick={() => {
                  setLoadingProjects(true);
                  setProjectsError("");
                  api.get("/projects")
                    .then((response) => setProjects(response.data.projects))
                    .catch((requestError) => setProjectsError(
                      requestError.response?.data?.message || "Could not load projects. Try again."
                    ))
                    .finally(() => setLoadingProjects(false));
                }} type="button">Retry</button>
              </div>
            )}

            {projectFormOpen && (
              <form className="project-form" onSubmit={handleProjectSubmit}>
                <div className="project-form-heading">
                  <div>
                    <p className="eyebrow">{editingProjectId ? "EDIT PROJECT" : "NEW PROJECT"}</p>
                    <h3>{editingProjectId ? "Update project details" : "Start with the essentials"}</h3>
                  </div>
                  <button className="icon-button" onClick={resetProjectForm} type="button" aria-label="Close project form">×</button>
                </div>
                <div className="project-fields">
                  <div className="project-field project-field-wide">
                    <label className="field-label" htmlFor="project-title">Project title</label>
                    <input
                      autoFocus
                      className="form-input"
                      id="project-title"
                      maxLength={160}
                      name="title"
                      onChange={updateProjectField}
                      placeholder="e.g. Brand identity and website"
                      required
                      value={projectForm.title}
                    />
                  </div>
                  <div className="project-field project-field-wide">
                    <label className="field-label" htmlFor="project-description">Description <span>(optional)</span></label>
                    <textarea
                      className="form-input project-description"
                      id="project-description"
                      maxLength={10000}
                      name="description"
                      onChange={updateProjectField}
                      placeholder="What are you planning to work on?"
                      rows={3}
                      value={projectForm.description}
                    />
                  </div>
                  <div className="project-field">
                    <label className="field-label" htmlFor="project-budget">Budget <span>(INR)</span></label>
                    <div className="currency-input">
                      <span aria-hidden="true">₹</span>
                      <input
                        className="form-input"
                        id="project-budget"
                        inputMode="decimal"
                        name="budgetRupees"
                        onChange={updateProjectField}
                        placeholder="0.00"
                        value={projectForm.budgetRupees}
                      />
                    </div>
                    <small className="field-hint">Stored as whole paise.</small>
                  </div>
                  <div className="project-field">
                    <label className="field-label" htmlFor="project-deadline">Deadline <span>(optional)</span></label>
                    <input
                      className="form-input"
                      id="project-deadline"
                      name="deadline"
                      onChange={updateProjectField}
                      type="date"
                      value={projectForm.deadline}
                    />
                  </div>
                </div>
                <div className="project-form-actions">
                  <button className="button button-quiet" onClick={resetProjectForm} type="button">Cancel</button>
                  <button className="button button-primary" disabled={savingProject} type="submit">
                    {savingProject ? "Saving…" : editingProjectId ? "Save changes" : "Create project"}
                  </button>
                </div>
              </form>
            )}

            {loadingProjects && projects.length === 0 ? (
              <div className="projects-empty" role="status">Loading your projects…</div>
            ) : projects.length === 0 && !projectsError ? (
              <div className="projects-empty">
                <span className="empty-project-icon" aria-hidden="true">◈</span>
                <h3>Your next great project starts here.</h3>
                <p>Create a project to define the work, budget, and target date.</p>
                <button className="button button-primary" onClick={openCreateProject}>Create a project</button>
              </div>
            ) : (
              <div className="project-list">
                {projects.map((project) => {
                  const isProjectCreator = user.role === "client"
                    ? project.clientId === user.id
                    : project.freelancerId === user.id;

                  return (
                    <ProjectCard
                      formatBudget={formatBudget}
                      formatDeadline={formatDeadline}
                      isDeleting={deletingProjectId === project._id}
                      isProjectCreator={isProjectCreator}
                      key={project._id}
                      onDelete={() => handleDeleteProject(project)}
                      onDetails={() => openProjectDetails(project)}
                      onEdit={() => openEditProject(project)}
                      project={project}
                    />
                  );
                })}
              </div>
            )}
          </section>
        </div>
        <ProjectDetailsDialog {...{
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
          openEditProject
        }} />
      </main>
    );
  }

  return (
    <AuthScreen
      error={error}
      form={form}
      mode={mode}
      onFieldChange={updateField}
      onModeChange={switchMode}
      onSubmit={handleSubmit}
      submitting={submitting}
    />
  );
}
