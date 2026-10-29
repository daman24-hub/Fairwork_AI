import mongoose from "mongoose";
import Agreement from "../models/Agreement.js";
import Dispute from "../models/Dispute.js";
import Evidence from "../models/Evidence.js";
import Milestone from "../models/Milestone.js";
import Project from "../models/Project.js";

async function findMemberProject(projectId, user) {
  if (!mongoose.isValidObjectId(projectId)) return null;

  return Project.findOne({
    _id: projectId,
    $or: [{ clientId: user._id }, { freelancerId: user._id }]
  });
}

function parseCriteria(value) {
  if (!Array.isArray(value) || value.length > 30) return undefined;
  if (value.some((item) => typeof item !== "string" || item.trim().length > 500)) return undefined;
  return value.map((item) => item.trim()).filter(Boolean);
}

function parseDate(value) {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function getProjectWorkflow(req, res, next) {
  try {
    const project = await findMemberProject(req.params.projectId, req.user);
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });

    const [agreement, milestones] = await Promise.all([
      Agreement.findOne({ projectId: project._id }).sort({ version: -1 }),
      Milestone.find({ projectId: project._id }).sort({ createdAt: 1 })
    ]);

    const evidence = await Evidence.find({
      milestoneId: { $in: milestones.map((milestone) => milestone._id) }
    })
      .populate("submittedBy", "name role")
      .sort({ createdAt: -1 });
    const evidenceByMilestone = new Map();
    for (const item of evidence) {
      const key = String(item.milestoneId);
      const items = evidenceByMilestone.get(key) || [];
      items.push(item);
      evidenceByMilestone.set(key, items);
    }

    return res.json({
      success: true,
      agreement,
      milestones: milestones.map((milestone) => ({
        ...milestone.toObject(),
        evidence: evidenceByMilestone.get(String(milestone._id)) || []
      }))
    });
  } catch (error) {
    return next(error);
  }
}

export async function createAgreement(req, res, next) {
  try {
    const project = await findMemberProject(req.params.projectId, req.user);
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });

    const terms = typeof req.body.terms === "string" ? req.body.terms.trim() : "";
    if (!terms || terms.length > 20000) {
      return res.status(400).json({ success: false, message: "Agreement terms must be between 1 and 20000 characters." });
    }

    const acceptanceCriteria = req.body.acceptanceCriteria === undefined
      ? []
      : parseCriteria(req.body.acceptanceCriteria);
    if (!acceptanceCriteria) {
      return res.status(400).json({ success: false, message: "Acceptance criteria must be a list of up to 30 strings, each no longer than 500 characters." });
    }

    const latest = await Agreement.findOne({ projectId: project._id }).sort({ version: -1 });
    if (latest && !["approved", "superseded"].includes(latest.status)) {
      return res.status(409).json({ success: false, message: "The current agreement must be approved before creating a new version." });
    }

    if (latest) {
      latest.status = "superseded";
      await latest.save();
    }
    const version = latest ? latest.version + 1 : 1;
    const agreement = await Agreement.create({
      projectId: project._id,
      version,
      terms,
      acceptanceCriteria,
      status: "draft"
    });

    project.status = "awaiting_agreement";
    await project.save();

    return res.status(201).json({ success: true, agreement });
  } catch (error) {
    return next(error);
  }
}

export async function updateAgreement(req, res, next) {
  try {
    const project = await findMemberProject(req.params.projectId, req.user);
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });
    if (!mongoose.isValidObjectId(req.params.agreementId)) {
      return res.status(404).json({ success: false, message: "Agreement not found." });
    }

    const agreement = await Agreement.findOne({
      _id: req.params.agreementId,
      projectId: project._id
    });
    if (!agreement) return res.status(404).json({ success: false, message: "Agreement not found." });
    if (agreement.status !== "draft") {
      return res.status(409).json({ success: false, message: "Only draft agreements can be edited." });
    }

    if (req.body.terms !== undefined) {
      if (typeof req.body.terms !== "string" || !req.body.terms.trim() || req.body.terms.trim().length > 20000) {
        return res.status(400).json({ success: false, message: "Agreement terms must be between 1 and 20000 characters." });
      }
      agreement.terms = req.body.terms.trim();
    }

    if (req.body.acceptanceCriteria !== undefined) {
      const acceptanceCriteria = parseCriteria(req.body.acceptanceCriteria);
      if (!acceptanceCriteria) {
        return res.status(400).json({ success: false, message: "Acceptance criteria must be a list of up to 30 strings, each no longer than 500 characters." });
      }
      agreement.acceptanceCriteria = acceptanceCriteria;
    }

    await agreement.save();
    return res.json({ success: true, agreement });
  } catch (error) {
    return next(error);
  }
}

export async function submitAgreement(req, res, next) {
  try {
    const project = await findMemberProject(req.params.projectId, req.user);
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });
    if (!mongoose.isValidObjectId(req.params.agreementId)) {
      return res.status(404).json({ success: false, message: "Agreement not found." });
    }

    const agreement = await Agreement.findOne({
      _id: req.params.agreementId,
      projectId: project._id
    });
    if (!agreement) return res.status(404).json({ success: false, message: "Agreement not found." });
    if (agreement.status !== "draft") {
      return res.status(409).json({ success: false, message: "Only draft agreements can be submitted." });
    }

    agreement.status = "pending_approval";
    agreement.clientApprovedAt = null;
    agreement.freelancerApprovedAt = null;
    await agreement.save();

    project.status = "awaiting_agreement";
    await project.save();
    return res.json({ success: true, agreement });
  } catch (error) {
    return next(error);
  }
}

export async function approveAgreement(req, res, next) {
  try {
    const project = await findMemberProject(req.params.projectId, req.user);
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });
    if (!mongoose.isValidObjectId(req.params.agreementId)) {
      return res.status(404).json({ success: false, message: "Agreement not found." });
    }

    const agreement = await Agreement.findOne({
      _id: req.params.agreementId,
      projectId: project._id
    });
    if (!agreement) return res.status(404).json({ success: false, message: "Agreement not found." });
    if (agreement.status !== "pending_approval") {
      return res.status(409).json({ success: false, message: "Only agreements pending approval can be approved." });
    }

    const approvalField = req.user.role === "client" ? "clientApprovedAt" : "freelancerApprovedAt";
    if (agreement[approvalField]) {
      return res.status(409).json({ success: false, message: "You have already approved this agreement." });
    }

    agreement[approvalField] = new Date();
    if (agreement.clientApprovedAt && agreement.freelancerApprovedAt) {
      agreement.status = "approved";
      project.status = "active";
    }

    await agreement.save();
    await project.save();
    return res.json({ success: true, agreement, project });
  } catch (error) {
    return next(error);
  }
}

export async function createMilestone(req, res, next) {
  try {
    const project = await findMemberProject(req.params.projectId, req.user);
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });

    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    if (!title || title.length > 160) {
      return res.status(400).json({ success: false, message: "Milestone title must be between 1 and 160 characters." });
    }

    const amountMinor = req.body.amountMinor;
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
      return res.status(400).json({ success: false, message: "Milestone amount must be a non-negative whole number of paise." });
    }

    const acceptanceCriteria = req.body.acceptanceCriteria === undefined
      ? []
      : parseCriteria(req.body.acceptanceCriteria);
    if (!acceptanceCriteria) {
      return res.status(400).json({ success: false, message: "Acceptance criteria must be a list of up to 30 strings, each no longer than 500 characters." });
    }

    const deadline = req.body.deadline === undefined ? null : parseDate(req.body.deadline);
    if (deadline === undefined) {
      return res.status(400).json({ success: false, message: "Deadline must be a valid date." });
    }

    const milestone = await Milestone.create({
      projectId: project._id,
      title,
      amountMinor,
      deadline,
      acceptanceCriteria
    });

    return res.status(201).json({ success: true, milestone });
  } catch (error) {
    return next(error);
  }
}

export async function updateMilestone(req, res, next) {
  try {
    const project = await findMemberProject(req.params.projectId, req.user);
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });
    if (!mongoose.isValidObjectId(req.params.milestoneId)) {
      return res.status(404).json({ success: false, message: "Milestone not found." });
    }

    const milestone = await Milestone.findOne({
      _id: req.params.milestoneId,
      projectId: project._id
    });
    if (!milestone) return res.status(404).json({ success: false, message: "Milestone not found." });
    if (milestone.status !== "pending") {
      return res.status(409).json({ success: false, message: "Only pending milestones can be edited." });
    }

    if (req.body.title !== undefined) {
      if (typeof req.body.title !== "string" || !req.body.title.trim() || req.body.title.trim().length > 160) {
        return res.status(400).json({ success: false, message: "Milestone title must be between 1 and 160 characters." });
      }
      milestone.title = req.body.title.trim();
    }

    if (req.body.amountMinor !== undefined) {
      if (!Number.isSafeInteger(req.body.amountMinor) || req.body.amountMinor < 0) {
        return res.status(400).json({ success: false, message: "Milestone amount must be a non-negative whole number of paise." });
      }
      milestone.amountMinor = req.body.amountMinor;
    }

    if (req.body.deadline !== undefined) {
      const deadline = parseDate(req.body.deadline);
      if (deadline === undefined) {
        return res.status(400).json({ success: false, message: "Deadline must be a valid date." });
      }
      milestone.deadline = deadline;
    }

    if (req.body.acceptanceCriteria !== undefined) {
      const acceptanceCriteria = parseCriteria(req.body.acceptanceCriteria);
      if (!acceptanceCriteria) {
        return res.status(400).json({ success: false, message: "Acceptance criteria must be a list of up to 30 strings, each no longer than 500 characters." });
      }
      milestone.acceptanceCriteria = acceptanceCriteria;
    }

    await milestone.save();
    return res.json({ success: true, milestone });
  } catch (error) {
    return next(error);
  }
}

export async function updateMilestoneStatus(req, res, next) {
  try {
    const project = await findMemberProject(req.params.projectId, req.user);
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });
    if (!mongoose.isValidObjectId(req.params.milestoneId)) {
      return res.status(404).json({ success: false, message: "Milestone not found." });
    }

    const milestone = await Milestone.findOne({
      _id: req.params.milestoneId,
      projectId: project._id
    });
    if (!milestone) return res.status(404).json({ success: false, message: "Milestone not found." });

    const nextStatus = req.body.status;
    if (milestone.status === "disputed") {
      const unresolvedDispute = await Dispute.exists({
        milestoneId: milestone._id,
        status: { $in: ["open", "under_review"] }
      });
      if (unresolvedDispute) {
        return res.status(409).json({ success: false, message: "Resolve the dispute before changing this milestone status." });
      }
    }

    const transitions = req.user.role === "freelancer"
      ? {
        pending: ["in_progress"],
        in_progress: ["submitted"],
        changes_requested: ["submitted"],
        disputed: ["in_progress", "changes_requested"]
      }
      : { submitted: ["approved", "changes_requested"] };

    if (!transitions[milestone.status]?.includes(nextStatus)) {
      return res.status(409).json({ success: false, message: "This role cannot make that milestone status change." });
    }

    milestone.status = nextStatus;
    await milestone.save();
    return res.json({ success: true, milestone });
  } catch (error) {
    return next(error);
  }
}
