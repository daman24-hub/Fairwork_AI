import mongoose from "mongoose";
import Agreement from "../models/Agreement.js";
import Milestone from "../models/Milestone.js";
import Project from "../models/Project.js";
import ProjectInvitation from "../models/ProjectInvitation.js";

function membershipFilter(user) {
  return {
    $or: [
      { clientId: user._id },
      { freelancerId: user._id }
    ]
  };
}

function isValidBudget(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function parseDeadline(value) {
  if (value === null || value === "") return null;
  if (typeof value !== "string" && !(value instanceof Date)) return undefined;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function invalidProjectId(id) {
  return !mongoose.isValidObjectId(id);
}

export async function listProjects(req, res, next) {
  try {
    const projects = await Project.find(membershipFilter(req.user))
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, projects });
  } catch (error) {
    next(error);
  }
}

export async function createProject(req, res, next) {
  try {
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    if (!title) return res.status(400).json({ success: false, message: "Project title is required." });
    if (title.length > 160) return res.status(400).json({ success: false, message: "Project title must be 160 characters or fewer." });

    const description = typeof req.body.description === "string" ? req.body.description.trim() : "";
    if (description.length > 10000) return res.status(400).json({ success: false, message: "Project description must be 10000 characters or fewer." });

    const budgetPaise = req.body.budgetPaise ?? null;
    if (budgetPaise !== null && !isValidBudget(budgetPaise)) {
      return res.status(400).json({ success: false, message: "Budget must be a non-negative whole number of paise." });
    }

    const deadline = req.body.deadline === undefined ? null : parseDeadline(req.body.deadline);
    if (deadline === undefined) {
      return res.status(400).json({ success: false, message: "Deadline must be a valid date." });
    }

    const clientId = req.user.role === "client" ? req.user._id : undefined;
    const freelancerId = req.user.role === "freelancer" ? req.user._id : undefined;

    const project = await Project.create({
      title,
      description,
      budgetPaise,
      deadline,
      clientId,
      freelancerId,
      status: "draft"
    });

    res.status(201).json({ success: true, project });
  } catch (error) {
    next(error);
  }
}

export async function getProject(req, res, next) {
  try {
    if (invalidProjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    const project = await Project.findOne({
      _id: req.params.id,
      ...membershipFilter(req.user)
    });

    if (!project) return res.status(404).json({ success: false, message: "Project not found." });
    return res.json({ success: true, project });
  } catch (error) {
    return next(error);
  }
}

export async function updateProject(req, res, next) {
  try {
    if (invalidProjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    const project = await Project.findOne({
      _id: req.params.id,
      ...membershipFilter(req.user)
    });

    if (!project) return res.status(404).json({ success: false, message: "Project not found." });

    const updates = {};
    if (req.body.title !== undefined) {
      if (typeof req.body.title !== "string" || !req.body.title.trim() || req.body.title.trim().length > 160) {
        return res.status(400).json({ success: false, message: "Project title must be between 1 and 160 characters." });
      }
      updates.title = req.body.title.trim();
    }

    if (req.body.description !== undefined) {
      if (typeof req.body.description !== "string" || req.body.description.length > 10000) {
        return res.status(400).json({ success: false, message: "Project description must be 10000 characters or fewer." });
      }
      updates.description = req.body.description.trim();
    }

    if (req.body.budgetPaise !== undefined) {
      if (req.body.budgetPaise !== null && !isValidBudget(req.body.budgetPaise)) {
        return res.status(400).json({ success: false, message: "Budget must be a non-negative whole number of paise." });
      }
      updates.budgetPaise = req.body.budgetPaise;
    }

    if (req.body.deadline !== undefined) {
      const deadline = parseDeadline(req.body.deadline);
      if (deadline === undefined) {
        return res.status(400).json({ success: false, message: "Deadline must be a valid date." });
      }
      updates.deadline = deadline;
    }

    Object.assign(project, updates);
    await project.save();
    return res.json({ success: true, project });
  } catch (error) {
    return next(error);
  }
}

export async function deleteProject(req, res, next) {
  try {
    if (invalidProjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    const ownerField = req.user.role === "client" ? "clientId" : "freelancerId";
    const project = await Project.findOne({
      _id: req.params.id,
      [ownerField]: req.user._id
    });

    if (!project) return res.status(404).json({ success: false, message: "Project not found." });
    await Promise.all([
      Agreement.deleteMany({ projectId: project._id }),
      Milestone.deleteMany({ projectId: project._id }),
      ProjectInvitation.deleteMany({ projectId: project._id })
    ]);
    await project.deleteOne();
    return res.json({ success: true, message: "Project deleted." });
  } catch (error) {
    return next(error);
  }
}
