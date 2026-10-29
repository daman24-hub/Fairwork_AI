import { Router } from "express";
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject
} from "../controllers/projectController.js";
import { authorizeRoles, protect } from "../middleware/authMiddleware.js";
import {
  approveAgreement,
  createAgreement,
  generateAgreementDraft,
  createMilestone,
  getProjectWorkflow,
  submitAgreement,
  updateAgreement,
  updateMilestone,
  updateMilestoneStatus
} from "../controllers/projectWorkflowController.js";
import {
  fundMilestoneDemo,
  refundMilestoneDemo,
  releaseMilestoneDemo
} from "../controllers/escrowController.js";
import {
  cancelProjectInvitation,
  createProjectInvitation,
  listMyInvitations,
  listProjectInvitations,
  respondToProjectInvitation
} from "../controllers/projectInvitationController.js";
import {
  downloadEvidenceFile,
  listMilestoneEvidence,
  submitMilestoneEvidence
} from "../controllers/evidenceController.js";
import { handleEvidenceUpload } from "../middleware/evidenceUpload.js";
import {
  createChangeRequest,
  createDispute,
  listProjectIssues,
  respondToChangeRequest,
  updateDispute,
  withdrawChangeRequest
} from "../controllers/projectIssuesController.js";

const router = Router();
router.use(protect, authorizeRoles("client", "freelancer"));
router.get("/invitations/pending", listMyInvitations);
router.post("/invitations/:invitationId/:action", respondToProjectInvitation);
router.get("/:projectId/invitations", listProjectInvitations);
router.post("/:projectId/invitations", createProjectInvitation);
router.delete("/:projectId/invitations/:invitationId", cancelProjectInvitation);
router.get("/", listProjects);
router.post("/", createProject);
router.get("/:id", getProject);
router.patch("/:id", updateProject);
router.delete("/:id", deleteProject);
router.get("/:projectId/workflow", getProjectWorkflow);
router.post("/:projectId/agreements", createAgreement);
router.post("/:projectId/agreements/generate-draft", generateAgreementDraft);
router.patch("/:projectId/agreements/:agreementId", updateAgreement);
router.post("/:projectId/agreements/:agreementId/submit", submitAgreement);
router.post("/:projectId/agreements/:agreementId/approve", approveAgreement);
router.post("/:projectId/milestones", createMilestone);
router.patch("/:projectId/milestones/:milestoneId", updateMilestone);
router.patch("/:projectId/milestones/:milestoneId/status", updateMilestoneStatus);
router.post("/:projectId/milestones/:milestoneId/escrow/fund", fundMilestoneDemo);
router.post("/:projectId/milestones/:milestoneId/escrow/release", releaseMilestoneDemo);
router.post("/:projectId/milestones/:milestoneId/escrow/refund", refundMilestoneDemo);
router.get("/:projectId/milestones/:milestoneId/evidence", listMilestoneEvidence);
router.post("/:projectId/milestones/:milestoneId/evidence", handleEvidenceUpload, submitMilestoneEvidence);
router.get("/:projectId/milestones/:milestoneId/evidence/:evidenceId/file", downloadEvidenceFile);
router.get("/:projectId/issues", listProjectIssues);
router.post("/:projectId/change-requests", createChangeRequest);
router.post("/:projectId/change-requests/:changeRequestId/respond", respondToChangeRequest);
router.post("/:projectId/change-requests/:changeRequestId/withdraw", withdrawChangeRequest);
router.post("/:projectId/disputes", createDispute);
router.patch("/:projectId/disputes/:disputeId", updateDispute);
export default router;
