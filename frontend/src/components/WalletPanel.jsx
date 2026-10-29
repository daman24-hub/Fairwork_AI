import { useState } from "react";
import api from "../services/api.js";

export default function WalletPanel({ user, onLinked }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function linkWallet() {
    setError("");
    if (!window.ethereum) {
      setError("Install a browser wallet such as MetaMask to link a wallet.");
      return;
    }

    setBusy(true);
    try {
      const { BrowserProvider } = await import("ethers");
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const { data: challenge } = await api.get("/auth/wallet/challenge");
      const signature = await signer.signMessage(challenge.challenge);
      const response = await api.post("/auth/wallet/link", { address, signature });
      onLinked(response.data.walletAddress);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        requestError.message ||
        "Could not verify this wallet."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="wallet-panel" aria-label="Wallet settings">
      <div>
        <strong>{user.walletAddress ? "Wallet linked" : "Link a wallet"}</strong>
        <span>
          {user.walletAddress
            ? `${user.walletAddress.slice(0, 6)}…${user.walletAddress.slice(-4)}`
            : "Required for on-chain escrow"}
        </span>
      </div>
      {user.walletAddress ? (
        <span className="wallet-verified">Verified</span>
      ) : (
        <button className="button button-quiet" disabled={busy} onClick={linkWallet} type="button">
          {busy ? "Verifying…" : "Connect wallet"}
        </button>
      )}
      {error && <p className="form-error wallet-error" role="alert">{error}</p>}
    </section>
  );
}
