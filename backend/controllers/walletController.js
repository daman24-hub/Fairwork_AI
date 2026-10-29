import { randomBytes } from "node:crypto";
import { getAddress, isAddress, verifyMessage } from "ethers";
import User from "../models/User.js";

const challengeLifetimeMs = 5 * 60 * 1000;

export async function createWalletChallenge(req, res, next) {
  try {
    const user = await User.findById(req.user._id)
      .select("+walletChallenge +walletChallengeExpiresAt");
    if (!user) return res.status(401).json({ success: false, message: "User not found." });

    const nonce = randomBytes(24).toString("hex");
    const issuedAt = new Date();
    const challenge = [
      "Link this wallet to your FairWork account.",
      `Account: ${user._id}`,
      `Nonce: ${nonce}`,
      `Issued at: ${issuedAt.toISOString()}`
    ].join("\n");
    user.walletChallenge = challenge;
    user.walletChallengeExpiresAt = new Date(issuedAt.getTime() + challengeLifetimeMs);
    await user.save();

    return res.json({ success: true, challenge });
  } catch (error) {
    return next(error);
  }
}

export async function linkWallet(req, res, next) {
  try {
    const { address, signature } = req.body;
    if (typeof address !== "string" || !isAddress(address) ||
        typeof signature !== "string" || !/^0x[0-9a-f]{130}$/i.test(signature)) {
      return res.status(400).json({ success: false, message: "A valid wallet address and signature are required." });
    }

    const user = await User.findById(req.user._id)
      .select("+walletChallenge +walletChallengeExpiresAt");
    if (!user) return res.status(401).json({ success: false, message: "User not found." });
    if (!user.walletChallenge || !user.walletChallengeExpiresAt ||
        user.walletChallengeExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: "Wallet verification expired. Request a new challenge." });
    }

    let signer;
    try {
      signer = getAddress(verifyMessage(user.walletChallenge, signature));
    } catch {
      return res.status(400).json({ success: false, message: "Wallet signature could not be verified." });
    }
    if (signer !== getAddress(address)) {
      return res.status(403).json({ success: false, message: "The signature does not match the selected wallet." });
    }

    const normalizedAddress = signer.toLowerCase();
    const linkedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        walletChallenge: user.walletChallenge,
        walletChallengeExpiresAt: { $gt: new Date() },
        $or: [
          { walletAddress: { $exists: false } },
          { walletAddress: normalizedAddress }
        ]
      },
      {
        $set: { walletAddress: normalizedAddress },
        $unset: { walletChallenge: "", walletChallengeExpiresAt: "" }
      },
      { new: true }
    );
    if (!linkedUser) {
      return res.status(409).json({
        success: false,
        message: "Wallet verification expired, already used, or this account already has a different wallet linked."
      });
    }
    return res.json({ success: true, walletAddress: linkedUser.walletAddress });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "This wallet is already linked to another FairWork account." });
    }
    return next(error);
  }
}
