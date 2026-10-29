import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import Agreement from "../models/Agreement.js";
import Dispute from "../models/Dispute.js";
import Milestone from "../models/Milestone.js";
import Project from "../models/Project.js";
import Transaction from "../models/Transaction.js";

async function findProject(projectId, user) {
  if (!mongoose.isValidObjectId(projectId)) return null;
  return Project.findOne({
    _id: projectId,
    $or: [{ clientId: user._id }, { freelancerId: user._id }]
  });
}

function isProjectClient(project, user) {
  return user.role === "client" && String(project.clientId) === String(user._id);
}

async function applyDemoTransaction(req, res, next, action) {
  let project;
  let milestone;
  let nextMilestoneStatus;

  try {
    project = await findProject(req.params.projectId, req.user);
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });
    if (!isProjectClient(project, req.user)) {
      return res.status(403).json({ success: false, message: "Only the project client can manage demo escrow." });
    }
    if (!mongoose.isValidObjectId(req.params.milestoneId)) {
      return res.status(404).json({ success: false, message: "Milestone not found." });
    }

    milestone = await Milestone.findOne({
      _id: req.params.milestoneId,
      projectId: project._id
    });
    if (!milestone) return res.status(404).json({ success: false, message: "Milestone not found." });

    const activeDispute = await Dispute.exists({
      milestoneId: milestone._id,
      status: { $in: ["open", "under_review"] }
    });
    if (activeDispute) {
      return res.status(409).json({ success: false, message: "Resolve the milestone dispute before changing demo escrow." });
    }

    let updateFilter;
    let statusUpdate;
    let note;
    if (action === "fund") {
      const approvedAgreement = await Agreement.exists({
        projectId: project._id,
        status: "approved"
      });
      if (!approvedAgreement) {
        return res.status(409).json({ success: false, message: "Both parties must approve an agreement before funding a milestone." });
      }
      if (project.status !== "active" || milestone.amountMinor <= 0) {
        return res.status(409).json({ success: false, message: "Only active project milestones with a positive amount can be funded." });
      }
      updateFilter = {
        _id: milestone._id,
        projectId: project._id,
        $or: [
          { escrowStatus: "not_funded" },
          { escrowStatus: { $exists: false } }
        ],
        status: { $in: ["pending", "in_progress"] }
      };
      statusUpdate = { escrowStatus: "funded" };
      note = "Demo funds marked as held; no money was transferred.";
    } else if (action === "release") {
      updateFilter = {
        _id: milestone._id,
        projectId: project._id,
        escrowStatus: "funded",
        status: "approved"
      };
      statusUpdate = { escrowStatus: "released", status: "paid" };
      note = "Demo funds marked as released; no money was transferred.";
    } else {
      updateFilter = {
        _id: milestone._id,
        projectId: project._id,
        escrowStatus: "funded",
        status: { $in: ["pending", "changes_requested"] }
      };
      statusUpdate = { escrowStatus: "refunded" };
      note = "Demo funds marked as refunded; no money was transferred.";
    }

    const updatedMilestone = await Milestone.findOneAndUpdate(
      updateFilter,
      { $set: statusUpdate },
      { new: true, runValidators: true }
    );
    if (!updatedMilestone) {
      return res.status(409).json({ success: false, message: "This milestone is not in a state that allows that demo escrow action." });
    }
    nextMilestoneStatus = updatedMilestone.status;

    const type = action === "fund" ? "funded_demo" : action === "release" ? "released_demo" : "refunded_demo";
    let transaction;
    try {
      transaction = await Transaction.create({
        projectId: project._id,
        milestoneId: updatedMilestone._id,
        type,
        amountMinor: updatedMilestone.amountMinor,
        reference: `demo_${randomUUID()}`,
        note
      });
    } catch (error) {
      await Milestone.updateOne(
        { _id: updatedMilestone._id, escrowStatus: statusUpdate.escrowStatus },
        { $set: { escrowStatus: milestone.escrowStatus || "not_funded", status: nextMilestoneStatus === "paid" ? "approved" : milestone.status } }
      );
      throw error;
    }

    return res.status(action === "fund" ? 201 : 200).json({
      success: true,
      transaction,
      milestone: updatedMilestone,
      message: note
    });
  } catch (error) {
    return next(error);
  }
}

export function fundMilestoneDemo(req, res, next) {
  return applyDemoTransaction(req, res, next, "fund");
}

export function releaseMilestoneDemo(req, res, next) {
  return applyDemoTransaction(req, res, next, "release");
}

export function refundMilestoneDemo(req, res, next) {
  return applyDemoTransaction(req, res, next, "refund");
}
