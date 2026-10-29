import { Router } from "express";
import { getMe, login, register } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { createWalletChallenge, linkWallet } from "../controllers/walletController.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.get("/wallet/challenge", protect, createWalletChallenge);
router.post("/wallet/link", protect, linkWallet);

export default router;
