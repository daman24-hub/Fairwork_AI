import mongoose from "mongoose";
import ChangeRequest from "../models/ChangeRequest.js";
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

function parseDate(value) {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function listProjectIssues(req, res, next) {
  try {
    const project = await findMemberProject(req.params.projectId, req.user);
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });

    const [disputes, changeRequests] = await Promise.all([
      Dispute.find({ projectId: project._id })
        .populate("openedBy", "name role")
        .populate("evidenceIds")
        .sort({ createdAt: -1 }),
      ChangeRequest.find({ projectId: project._id })
        .populate("requestedBy", "name role")
        .sort({ createdAt: -1 })
    ]);

    return res.json({ success: true, disputes, changeRequests });
  } catch (error) {
    return next(error);
  }
}

export async function createChangeRequest(req, res, next) {
  try {
    const project = await findMemberProject(req.params.projectId, req.user);
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });

    const description = typeof req.body.description === "string" ? req.body.description.trim() : "";
    if (!description || description.length > 5000) {
      return res.status(400).json({ success: false, message: "Change request description must be between 1 and 5000 characters." });
    }

    let proposedAmountMinor;
    if (req.body.proposedAmountMinor !== undefined && req.body.proposedAmountMinor !== null && req.body.proposedAmountMinor !== "") {
      if (!Number.isSafeInteger(req.body.proposedAmountMinor) || req.body.proposedAmountMinor < 0) {
        return res.status(400).json({ success: false, message: "Proposed amount must be a non-negative whole number of paise." });
      }
      proposedAmountMinor = req.body.proposedAmountMinor;
    }

    let proposedDeadline;
    if (req.body.proposedDeadline !== undefined) {
      proposedDeadline = parseDate(req.body.proposedDeadline);
      if (proposedDeadline === undefined) {
        return res.status(400).json({ success: false, message: "Proposed deadline must be a valid date." });
      }
    }

    const changeRequest = await ChangeRequest.create({
      projectId: project._id,
      requestedBy: req.user._id,
      description,
      ...(proposedAmountMinor !== undefined ? { proposedAmountMinor } : {}),
      ...(proposedDeadline !== undefined ? { proposedDeadline } : {})
    });

    return res.status(201).json({ success: true, changeRequest });
  } catch (error) {
    return next(error);
  }
}

export async function respondToChangeRequest(req, res, next) {
  try {
    const project = await findMemberProject(req.params.projectId, req.user);
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });
    if (!mongoose.isValidObjectId(req.params.changeRequestId)) {
      return res.status(404).json({ success: false, message: "Change request not found." });
    }

    const changeRequest = await ChangeRequest.findOne({
      _id: req.params.changeRequestId,
      projectId: project._id,
      status: "pending"
    });
    if (!changeRequest) return res.status(404).json({ success: false, message: "Pending change request not found." });
    if (String(changeRequest.requestedBy) === String(req.user._id)) {
      return res.status(403).json({ success: false, message: "The requester cannot approve or reject their own change request." });
    }

    const decision = req.body.decision;
    if (!["accepted", "rejected"].includes(decision)) {
      return res.status(400).json({ success: false, message: "Decision must be accepted or rejected." });
    }

    if (decision === "accepted") {
      if (changeRequest.proposedAmountMinor !== undefined) {
        project.budgetPaise = changeRequest.proposedAmountMinor;
      }
      if (changeRequest.proposedDeadline !== undefined) {
        project.deadline = changeRequest.proposedDeadline;
      }
      await project.save();
    }

    changeRequest.status = decision;
    await changeRequest.save();
    return res.json({ success: true, changeRequest, project });
  } catch (error) {
    return next(error);
  }
}

export async function withdrawChangeRequest(req, res, next) {
  try {
    const project = await findMemberProject(req.params.projectId, req.user);
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });
    if (!mongoose.isValidObjectId(req.params.changeRequestId)) {
      return res.status(404).json({ success: false, message: "Change request not found." });
    }

    const changeRequest = await ChangeRequest.findOneAndUpdate(
      {
        _id: req.params.changeRequestId,
        projectId: project._id,
        requestedBy: req.user._id,
        status: "pending"
      },
      { $set: { status: "withdrawn" } },
      { new: true }
    );
    if (!changeRequest) return res.status(404).json({ success: false, message: "Pending change request not found." });

    return res.json({ success: true, changeRequest });
  } catch (error) {
    return next(error);
  }
}

export async function createDispute(req, res, next) {
  try {
    const project = await findMemberProject(req.params.projectId, req.user);
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });
    if (!mongoose.isValidObjectId(req.body.milestoneId)) {
      return res.status(400).json({ success: false, message: "A valid milestone ID is required." });
    }

    const milestone = await Milestone.findOne({
      _id: req.body.milestoneId,
      projectId: project._id
    });
    if (!milestone) return res.status(404).json({ success: false, message: "Milestone not found." });

    const reason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";
    if (!reason || reason.length > 5000) {
      return res.status(400).json({ success: false, message: "Dispute reason must be between 1 and 5000 characters." });
    }

    const existing = await Dispute.findOne({
      milestoneId: milestone._id,
      status: { $in: ["open", "under_review"] }
    });
    if (existing) {
      return res.status(409).json({ success: false, message: "This milestone already has an unresolved dispute." });
    }

    let evidenceIds = [];
    if (req.body.evidenceIds !== undefined) {
      if (!Array.isArray(req.body.evidenceIds) || req.body.evidenceIds.length > 20 ||
        req.body.evidenceIds.some((id) => !mongoose.isValidObjectId(id))) {
        return res.status(400).json({ success: false, message: "Evidence IDs must be a list of up to 20 valid IDs." });
      }
      const evidence = await Evidence.find({
        _id: { $in: req.body.evidenceIds },
        milestoneId: milestone._id
      }).select("_id");
      if (evidence.length !== new Set(req.body.evidenceIds.map(String)).size) {
        return res.status(400).json({ success: false, message: "All attached evidence must belong to this milestone." });
      }
      evidenceIds = evidence.map((item) => item._id);
    }

    const dispute = await Dispute.create({
      projectId: project._id,
      milestoneId: milestone._id,
      openedBy: req.user._id,
      reason,
      evidenceIds
    });
    milestone.status = "disputed";
    project.status = "disputed";
    await Promise.all([milestone.save(), project.save()]);

    return res.status(201).json({ success: true, dispute, milestone, project });
  } catch (error) {
    return next(error);
  }
}

export async function updateDispute(req, res, next) {
  try {
    const project = await findMemberProject(req.params.projectId, req.user);
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });
    if (!mongoose.isValidObjectId(req.params.disputeId)) {
      return res.status(404).json({ success: false, message: "Dispute not found." });
    }

    const dispute = await Dispute.findOne({
      _id: req.params.disputeId,
      projectId: project._id
    });
    if (!dispute) return res.status(404).json({ success: false, message: "Dispute not found." });

    const status = req.body.status;
    const isOpener = String(dispute.openedBy) === String(req.user._id);
    if (status === "under_review" && dispute.status === "open" && !isOpener) {
      dispute.status = "under_review";
    } else if (["resolved", "closed"].includes(status) &&
      dispute.status === "under_review" && !isOpener) {
      const resolutionNotes = typeof req.body.resolutionNotes === "string"
        ? req.body.resolutionNotes.trim()
        : "";
      if (!resolutionNotes || resolutionNotes.length > 5000) {
        return res.status(400).json({ success: false, message: "Resolution notes are required and must be 5000 characters or fewer." });
      }
      dispute.status = status;
      dispute.resolutionNotes = resolutionNotes;
    } else {
      return res.status(409).json({ success: false, message: "Only the other project participant can review or resolve an open dispute." });
    }

    await dispute.save();
    if (["resolved", "closed"].includes(dispute.status)) {
      const openDisputeCount = await Dispute.countDocuments({
        projectId: project._id,
        status: { $in: ["open", "under_review"] }
      });
      if (openDisputeCount === 0) project.status = "active";
      const milestone = await Milestone.findById(dispute.milestoneId);
      if (milestone?.status === "disputed") milestone.status = "in_progress";
      await Promise.all([project.save(), milestone?.save()]);
    }

    return res.json({ success: true, dispute, project });
  } catch (error) {
    return next(error);
  }
}
