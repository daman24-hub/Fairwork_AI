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
  createMilestone,
  getProjectWorkflow,
  submitAgreement,
  updateAgreement,
  updateMilestone,
  updateMilestoneStatus
} from "../controllers/projectWorkflowController.js";
import {
  cancelProjectInvitation,
  createProjectInvitation,
  listMyInvitations,
  listProjectInvitations,
  respondToProjectInvitation
} from "../controllers/projectInvitationController.js";

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
router.patch("/:projectId/agreements/:agreementId", updateAgreement);
router.post("/:projectId/agreements/:agreementId/submit", submitAgreement);
router.post("/:projectId/agreements/:agreementId/approve", approveAgreement);
router.post("/:projectId/milestones", createMilestone);
router.patch("/:projectId/milestones/:milestoneId", updateMilestone);
router.patch("/:projectId/milestones/:milestoneId/status", updateMilestoneStatus);
export default router;
