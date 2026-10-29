import { Router } from "express";
import { createProject, listProjects } from "../controllers/projectController.js";

const router = Router();
router.get("/", listProjects);
router.post("/", createProject);
export default router;
