import { createReadStream } from "node:fs";
import { unlink } from "node:fs/promises";
import mongoose from "mongoose";
import { basename, resolve } from "node:path";
import Evidence from "../models/Evidence.js";
import Milestone from "../models/Milestone.js";
import Project from "../models/Project.js";
import { evidenceFileExists, uploadDirectory } from "../middleware/evidenceUpload.js";

async function findMemberMilestone(projectId, milestoneId, user) {
  if (!mongoose.isValidObjectId(projectId) || !mongoose.isValidObjectId(milestoneId)) return null;

  const project = await Project.findOne({
    _id: projectId,
    $or: [{ clientId: user._id }, { freelancerId: user._id }]
  });
  if (!project) return null;

  const milestone = await Milestone.findOne({ _id: milestoneId, projectId: project._id });
  return milestone ? { project, milestone } : null;
}

export async function listMilestoneEvidence(req, res, next) {
  try {
    const context = await findMemberMilestone(req.params.projectId, req.params.milestoneId, req.user);
    if (!context) return res.status(404).json({ success: false, message: "Milestone not found." });

    const evidence = await Evidence.find({ milestoneId: context.milestone._id })
      .select("+storedName")
      .populate("submittedBy", "name role")
      .sort({ createdAt: -1 });

    return res.json({ success: true, evidence });
  } catch (error) {
    return next(error);
  }
}

export async function submitMilestoneEvidence(req, res, next) {
  let uploadedPath;
  try {
    const context = await findMemberMilestone(req.params.projectId, req.params.milestoneId, req.user);
    if (!context) {
      if (req.file) await unlink(req.file.path).catch(() => {});
      return res.status(404).json({ success: false, message: "Milestone not found." });
    }
    if (req.user.role !== "freelancer" || String(context.project.freelancerId) !== String(req.user._id)) {
      if (req.file) await unlink(req.file.path).catch(() => {});
      return res.status(403).json({ success: false, message: "Only the assigned freelancer can submit milestone evidence." });
    }
    if (!["in_progress", "changes_requested"].includes(context.milestone.status)) {
      if (req.file) await unlink(req.file.path).catch(() => {});
      return res.status(409).json({ success: false, message: "Evidence can only be submitted for milestones in progress or needing changes." });
    }

    const description = typeof req.body.description === "string" ? req.body.description.trim() : "";
    if (description.length > 5000) {
      if (req.file) await unlink(req.file.path).catch(() => {});
      return res.status(400).json({ success: false, message: "Evidence description must be 5000 characters or fewer." });
    }
    if (!description && !req.file) {
      return res.status(400).json({ success: false, message: "Add a delivery note or attach a file." });
    }

    uploadedPath = req.file?.path;
    const evidence = await Evidence.create({
      milestoneId: context.milestone._id,
      submittedBy: req.user._id,
      description,
      fileName: req.file?.originalname || "",
      storedName: req.file?.filename || "",
      mimeType: req.file?.mimetype || "",
      fileSize: req.file?.size || 0
    });

    if (req.file) {
      evidence.fileUrl = `/projects/${context.project._id}/milestones/${context.milestone._id}/evidence/${evidence._id}/file`;
      await evidence.save();
    }

    context.milestone.status = "submitted";
    await context.milestone.save();

    const result = await Evidence.findById(evidence._id)
      .populate("submittedBy", "name role");
    return res.status(201).json({ success: true, evidence: result, milestone: context.milestone });
  } catch (error) {
    if (uploadedPath) await unlink(uploadedPath).catch(() => {});
    return next(error);
  }
}

export async function downloadEvidenceFile(req, res, next) {
  try {
    const context = await findMemberMilestone(req.params.projectId, req.params.milestoneId, req.user);
    if (!context || !mongoose.isValidObjectId(req.params.evidenceId)) {
      return res.status(404).json({ success: false, message: "Evidence file not found." });
    }

    const evidence = await Evidence.findOne({
      _id: req.params.evidenceId,
      milestoneId: context.milestone._id
    }).select("+storedName");
    if (!evidence?.storedName || basename(evidence.storedName) !== evidence.storedName) {
      return res.status(404).json({ success: false, message: "Evidence file not found." });
    }

    const filePath = resolve(uploadDirectory, evidence.storedName);
    if (!filePath.startsWith(`${uploadDirectory}/`)) {
      return res.status(404).json({ success: false, message: "Evidence file not found." });
    }
    if (!(await evidenceFileExists(filePath))) {
      return res.status(404).json({ success: false, message: "Evidence file not found." });
    }

    res.setHeader("Content-Type", evidence.mimeType || "application/octet-stream");
    res.setHeader("Content-Length", evidence.fileSize);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(evidence.fileName || "evidence")}"`);
    return createReadStream(filePath)
      .on("error", next)
      .pipe(res);
  } catch (error) {
    return next(error);
  }
}
