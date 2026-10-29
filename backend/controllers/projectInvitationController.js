import mongoose from "mongoose";
import Project from "../models/Project.js";
import ProjectInvitation from "../models/ProjectInvitation.js";
import User from "../models/User.js";

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

export async function listMyInvitations(req, res, next) {
  try {
    const invitations = await ProjectInvitation.find({
      inviteeId: req.user._id,
      status: "pending"
    })
      .populate("projectId", "title status")
      .populate("inviterId", "name email")
      .sort({ createdAt: -1 });

    return res.json({ success: true, invitations });
  } catch (error) {
    return next(error);
  }
}

export async function listProjectInvitations(req, res, next) {
  try {
    if (!isValidId(req.params.projectId)) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    const project = await Project.findOne({
      _id: req.params.projectId,
      $or: [{ clientId: req.user._id }, { freelancerId: req.user._id }]
    });
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });

    const invitations = await ProjectInvitation.find({ projectId: project._id })
      .populate("inviterId", "name email")
      .populate("inviteeId", "name email role")
      .sort({ createdAt: -1 });

    return res.json({ success: true, invitations });
  } catch (error) {
    return next(error);
  }
}

export async function createProjectInvitation(req, res, next) {
  try {
    if (!isValidId(req.params.projectId)) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    const ownerField = req.user.role === "client" ? "clientId" : "freelancerId";
    const counterpartField = req.user.role === "client" ? "freelancerId" : "clientId";
    const invitedRole = req.user.role === "client" ? "freelancer" : "client";
    const project = await Project.findOne({
      _id: req.params.projectId,
      [ownerField]: req.user._id
    });
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });
    if (project[counterpartField]) {
      return res.status(409).json({ success: false, message: "This project already has both participants." });
    }

    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: "A valid account email is required." });
    }
    if (email === req.user.email) {
      return res.status(400).json({ success: false, message: "You cannot invite your own account." });
    }

    const invitee = await User.findOne({ email }).select("_id email role name");
    if (!invitee) {
      return res.status(404).json({ success: false, message: "No FairWork account exists for that email yet." });
    }
    if (invitee.role !== invitedRole) {
      return res.status(400).json({ success: false, message: `This project needs a ${invitedRole} account.` });
    }

    const pending = await ProjectInvitation.findOne({ projectId: project._id, status: "pending" });
    if (pending) {
      return res.status(409).json({ success: false, message: "This project already has a pending invitation." });
    }

    const invitation = await ProjectInvitation.create({
      projectId: project._id,
      inviterId: req.user._id,
      inviteeId: invitee._id,
      invitedRole
    });

    return res.status(201).json({
      success: true,
      invitation: {
        ...invitation.toObject(),
        invitee: { id: invitee._id, name: invitee.name, email: invitee.email, role: invitee.role }
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "This project already has a pending invitation." });
    }
    return next(error);
  }
}

export async function respondToProjectInvitation(req, res, next) {
  try {
    if (!isValidId(req.params.invitationId)) {
      return res.status(404).json({ success: false, message: "Invitation not found." });
    }

    const invitation = await ProjectInvitation.findOne({
      _id: req.params.invitationId,
      inviteeId: req.user._id,
      status: "pending"
    });
    if (!invitation) return res.status(404).json({ success: false, message: "Pending invitation not found." });

    if (req.params.action === "decline") {
      invitation.status = "declined";
      invitation.respondedAt = new Date();
      await invitation.save();
      return res.json({ success: true, invitation });
    }

    if (req.params.action !== "accept") {
      return res.status(404).json({ success: false, message: "Invitation action not found." });
    }
    if (req.user.role !== invitation.invitedRole) {
      return res.status(403).json({ success: false, message: "This invitation is for a different account role." });
    }

    const counterpartField = invitation.invitedRole === "client" ? "clientId" : "freelancerId";
    const project = await Project.findOneAndUpdate(
      {
        _id: invitation.projectId,
        $or: [
          { [counterpartField]: null },
          { [counterpartField]: { $exists: false } }
        ]
      },
      { $set: { [counterpartField]: req.user._id } },
      { new: true }
    );

    if (!project) {
      return res.status(409).json({ success: false, message: "The project is no longer available for another participant." });
    }

    invitation.status = "accepted";
    invitation.respondedAt = new Date();
    await invitation.save();

    return res.json({ success: true, invitation, project });
  } catch (error) {
    return next(error);
  }
}

export async function cancelProjectInvitation(req, res, next) {
  try {
    if (!isValidId(req.params.projectId) || !isValidId(req.params.invitationId)) {
      return res.status(404).json({ success: false, message: "Invitation not found." });
    }

    const ownerField = req.user.role === "client" ? "clientId" : "freelancerId";
    const project = await Project.findOne({
      _id: req.params.projectId,
      [ownerField]: req.user._id
    });
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });

    const invitation = await ProjectInvitation.findOneAndUpdate(
      {
        _id: req.params.invitationId,
        projectId: project._id,
        inviterId: req.user._id,
        status: "pending"
      },
      { $set: { status: "cancelled", respondedAt: new Date() } },
      { new: true }
    );
    if (!invitation) return res.status(404).json({ success: false, message: "Pending invitation not found." });

    return res.json({ success: true, invitation });
  } catch (error) {
    return next(error);
  }
}
