import mongoose from "mongoose";
import Agreement from "../models/Agreement.js";
import Dispute from "../models/Dispute.js";
import Evidence from "../models/Evidence.js";
import Milestone from "../models/Milestone.js";
import Project from "../models/Project.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";

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

    const [agreement, milestones, transactions, client, freelancer] = await Promise.all([
      Agreement.findOne({ projectId: project._id }).sort({ version: -1 }),
      Milestone.find({ projectId: project._id }).sort({ createdAt: 1 }),
      Transaction.find({ projectId: project._id }).sort({ createdAt: -1 }).lean(),
      User.findById(project.clientId).select("walletAddress"),
      User.findById(project.freelancerId).select("walletAddress")
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

    const escrow = transactions.reduce((totals, transaction) => {
      if (transaction.type === "funded_demo") totals.fundedMinor += transaction.amountMinor;
      if (transaction.type === "released_demo") totals.releasedMinor += transaction.amountMinor;
      if (transaction.type === "refunded_demo") totals.refundedMinor += transaction.amountMinor;
      return totals;
    }, { fundedMinor: 0, releasedMinor: 0, refundedMinor: 0 });
    escrow.heldMinor = escrow.fundedMinor - escrow.releasedMinor - escrow.refundedMinor;

    return res.json({
      success: true,
      agreement,
      wallets: {
        client: client?.walletAddress || null,
        freelancer: freelancer?.walletAddress || null
      },
      escrow,
      transactions,
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

export async function generateAgreementDraft(req, res, next) {
  try {
    const project = await findMemberProject(req.params.projectId, req.user);
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });
    if (!project.clientId || !project.freelancerId) {
      return res.status(409).json({ success: false, message: "Invite and add both project participants before generating an agreement." });
    }

    const brief = typeof req.body.brief === "string" ? req.body.brief.trim() : "";
    if (req.body.consent !== true) {
      return res.status(400).json({ success: false, message: "Confirm that your agreement brief may be sent to OpenAI before generating a draft." });
    }
    if (!brief || brief.length > 10000) {
      return res.status(400).json({ success: false, message: "The agreement brief must be between 1 and 10000 characters." });
    }

    const latest = await Agreement.findOne({ projectId: project._id }).sort({ version: -1 });
    if (latest && !["draft", "approved", "superseded"].includes(latest.status)) {
      return res.status(409).json({ success: false, message: "The current agreement must be approved before generating a new version." });
    }
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ success: false, message: "AI agreement generation is not configured. Set AI_API_KEY on the backend." });
    }

    let response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json"
        },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          model: process.env.AI_MODEL || "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: "Create a practical, plain-language freelance project agreement draft for human review, not legal advice. Return only a JSON object with a string property terms and an array of 3-10 concise string acceptanceCriteria. Include scope, deliverables, responsibilities, review/revision expectations, and payment terms only when supported by the project information. Do not invent amounts or dates."
            },
            {
              role: "user",
              content: brief
            }
          ]
        })
      });
    } catch {
      return res.status(502).json({ success: false, message: "Could not reach the AI agreement service. Try again." });
    }
    if (!response.ok) {
      return res.status(502).json({ success: false, message: "The AI agreement service could not generate a draft. Try again." });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    let generated;
    try {
      generated = JSON.parse(content);
    } catch {
      return res.status(502).json({ success: false, message: "The AI service returned an invalid agreement draft." });
    }
    if (!generated || typeof generated !== "object" || Array.isArray(generated)) {
      return res.status(502).json({ success: false, message: "The AI service returned an invalid agreement draft." });
    }
    const terms = typeof generated.terms === "string" ? generated.terms.trim() : "";
    const acceptanceCriteria = parseCriteria(generated.acceptanceCriteria);
    if (!terms || terms.length > 20000 || !acceptanceCriteria || acceptanceCriteria.length < 1) {
      return res.status(502).json({ success: false, message: "The AI service returned an incomplete agreement draft." });
    }

    let agreement;
    if (latest?.status === "draft") {
      latest.terms = terms;
      latest.acceptanceCriteria = acceptanceCriteria;
      agreement = await latest.save();
    } else {
      if (latest?.status === "approved") {
        latest.status = "superseded";
        await latest.save();
      }
      agreement = await Agreement.create({
        projectId: project._id,
        version: latest ? latest.version + 1 : 1,
        terms,
        acceptanceCriteria,
        status: "draft"
      });
    }

    project.status = "awaiting_agreement";
    await project.save();
    return res.status(201).json({ success: true, agreement, project });
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
    if (milestone.escrowStatus !== "not_funded") {
      return res.status(409).json({ success: false, message: "A funded milestone cannot be edited." });
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
