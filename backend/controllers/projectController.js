import Project from "../models/Project.js";

export async function listProjects(req, res, next) {
  try {
    // Authentication and project membership filters must be added before private project data is exposed.
    const projects = await Project.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, projects });
  } catch (error) {
    next(error);
  }
}

export async function createProject(req, res, next) {
  try {
    const title = String(req.body.title || "").trim();
    if (!title) return res.status(400).json({ success: false, message: "Project title is required." });

    const project = await Project.create({
      title,
      description: String(req.body.description || "").trim()
    });

    res.status(201).json({ success: true, project });
  } catch (error) {
    next(error);
  }
}
