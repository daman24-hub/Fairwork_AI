import {
  BrowserProvider,
  Contract,
  Interface,
  formatEther,
  keccak256,
  parseEther,
  toUtf8Bytes
} from "ethers";
import { useEffect, useState } from "react";
import api from "../services/api.js";

const escrowInterface = new Interface([
  "function createDeal(address freelancer, bytes32 agreementHash) payable returns (uint256 dealId)",
  "function release(uint256 dealId)",
  "function refund(uint256 dealId)",
  "function getDeal(uint256 dealId) view returns (tuple(address client, address freelancer, uint256 amount, uint8 status, bytes32 agreementHash, bytes32 milestoneReference, uint64 createdAt))",
  "event DealCreated(uint256 indexed dealId, address indexed client, address indexed freelancer, uint256 amount, bytes32 agreementHash, bytes32 milestoneReference)"
]);
const chainId = 11155111;
const statusNames = ["Funded", "Released", "Refunded", "Disputed"];

function agreementDigest(agreement) {
  return keccak256(toUtf8Bytes(JSON.stringify({
    version: agreement.version,
    terms: agreement.terms,
    acceptanceCriteria: agreement.acceptanceCriteria
  })));
}

export default function BlockchainEscrowPanel({
  agreement,
  milestone,
  projectId,
  role,
  wallets,
  linkedWallet,
  onRecordDeal
}) {
  const [configuration, setConfiguration] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [amountEth, setAmountEth] = useState("");
  const [deal, setDeal] = useState(null);
  const [pendingRecord, setPendingRecord] = useState(null);

  useEffect(() => {
    let active = true;
    api.get("/projects/blockchain/sepolia/config")
      .then(({ data }) => {
        if (active) setConfiguration(data);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.message ||
            "Sepolia escrow is not configured."
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function getContract(requireSigner, allowNetworkSwitch = true) {
    if (!window.ethereum) throw new Error("Install MetaMask or another browser wallet to use Sepolia escrow.");
    if (!configuration) throw new Error("Sepolia escrow contract is not configured.");

    const provider = new BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    if (network.chainId !== BigInt(chainId)) {
      if (!allowNetworkSwitch) throw new Error("Switch your wallet to Sepolia to view this on-chain deal.");
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }]
        });
      } catch (switchError) {
        if (switchError.code !== 4902) throw switchError;
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0xaa36a7",
            chainName: "Sepolia",
            nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://rpc.sepolia.org"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"]
          }]
        });
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }]
        });
      }
      const updatedProvider = new BrowserProvider(window.ethereum);
      return new Contract(
        configuration.contractAddress,
        escrowInterface,
        requireSigner ? await updatedProvider.getSigner() : updatedProvider
      );
    }
    return new Contract(
      configuration.contractAddress,
      escrowInterface,
      requireSigner ? await provider.getSigner() : provider
    );
  }

  async function refreshDeal(contract, dealId) {
    const current = await contract.getDeal(dealId);
    setDeal({
      client: current.client,
      freelancer: current.freelancer,
      amount: current.amount,
      status: Number(current.status),
      agreementHash: current.agreementHash
    });
  }

  async function persistDeal(data) {
    const response = await api.post(
      `/projects/${projectId}/milestones/${milestone._id}/blockchain`,
      { dealId: data.dealId, transactionHash: data.transactionHash }
    );
    setPendingRecord(null);
    await onRecordDeal(milestone._id, response.data.blockchainEscrow);
  }

  async function retryRecord() {
    setError("");
    setBusy(true);
    try {
      await persistDeal(pendingRecord);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Could not link the confirmed deal.");
    } finally {
      setBusy(false);
    }
  }

  async function refreshOnchainState() {
    setError("");
    try {
      const contract = await getContract(false, false);
      await refreshDeal(contract, milestone.blockchainEscrow.dealId);
    } catch (requestError) {
      setError(requestError.message || "Could not read the Sepolia deal.");
    }
  }

  async function createDeal() {
    setError("");
    setBusy(true);
    try {
      if (!agreement || agreement.status !== "approved") throw new Error("Both participants must approve the agreement first.");
      if (!wallets?.client || !wallets?.freelancer) throw new Error("Both participants must link their wallets first.");
      if (!linkedWallet || linkedWallet.toLowerCase() !== wallets.client.toLowerCase()) {
        throw new Error("The client must connect the wallet linked to their FairWork account.");
      }
      if (!/^(?:\d+)(?:\.\d{1,18})?$/.test(amountEth) || Number(amountEth) <= 0) {
        throw new Error("Enter a positive Sepolia test ETH amount (up to 18 decimal places).");
      }

      const contract = await getContract(true);
      const signerAddress = await contract.runner.getAddress();
      if (signerAddress.toLowerCase() !== wallets.client.toLowerCase()) {
        throw new Error("The connected wallet does not match the linked client wallet.");
      }

      const transaction = await contract.createDeal(
        wallets.freelancer,
        agreementDigest(agreement),
        keccak256(toUtf8Bytes(milestone._id)),
        { value: parseEther(amountEth) }
      );
      const receipt = await transaction.wait();
      const event = receipt.logs
        .filter((log) => log.address.toLowerCase() === configuration.contractAddress.toLowerCase())
        .map((log) => {
          try {
            return escrowInterface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((log) => log?.name === "DealCreated");
      if (!event) throw new Error("Transaction succeeded, but its deal-created event could not be found.");

      const record = {
        dealId: event.args.dealId.toString(),
        transactionHash: receipt.hash
      };
      setPendingRecord(record);
      await persistDeal(record);
      await refreshDeal(contract, record.dealId);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "On-chain escrow failed.");
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action) {
    setError("");
    setBusy(true);
    try {
      if (!milestone.blockchainEscrow?.dealId) throw new Error("No Sepolia deal is linked to this milestone.");
      if (!linkedWallet) throw new Error("Connect your linked wallet to continue.");
      const contract = await getContract(true);
      const signerAddress = await contract.runner.getAddress();
      const isClient = signerAddress.toLowerCase() === wallets?.client?.toLowerCase();
      const isFreelancer = signerAddress.toLowerCase() === wallets?.freelancer?.toLowerCase();
      if (signerAddress.toLowerCase() !== linkedWallet.toLowerCase() || !(isClient || isFreelancer)) {
        throw new Error("Connect a wallet linked to a participant in this project.");
      }
      if (!isClient) {
        throw new Error("Only the linked client wallet can perform this escrow action.");
      }
      const transaction = await contract[action](milestone.blockchainEscrow.dealId);
      await transaction.wait();
      await refreshDeal(contract, milestone.blockchainEscrow.dealId);
    } catch (requestError) {
      setError(requestError.reason || requestError.message || "On-chain action failed.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function load() {
      if (!configuration || !milestone.blockchainEscrow?.dealId || !window.ethereum) return;
      try {
        const contract = await getContract(false, false);
        const current = await contract.getDeal(milestone.blockchainEscrow.dealId);
        if (active) {
          setDeal({
            client: current.client,
            freelancer: current.freelancer,
            amount: current.amount,
            status: Number(current.status),
            agreementHash: current.agreementHash
          });
        }
      } catch (requestError) {
        if (active) setError(requestError.message || "Could not read the Sepolia deal.");
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [configuration, milestone.blockchainEscrow?.dealId]);

  const canCreate = role === "client" &&
    agreement?.status === "approved" &&
    ["pending", "in_progress"].includes(milestone.status) &&
    !milestone.blockchainEscrow?.dealId;
  const funded = deal?.status === 0;
  const isClientWallet = linkedWallet && wallets?.client &&
    linkedWallet.toLowerCase() === wallets.client.toLowerCase();
  const canRelease = funded && role === "client" && isClientWallet &&
    ["approved", "paid"].includes(milestone.status);
  const canRefund = funded && role === "client" && isClientWallet &&
    ["pending", "changes_requested"].includes(milestone.status);
  return (
    <section className="blockchain-escrow" aria-label={`Sepolia blockchain escrow for ${milestone.title}`}>
      <div className="workflow-section-heading">
        <div>
          <p className="eyebrow">SEPOLIA TESTNET · TEST ETH ONLY</p>
          <h4>Blockchain escrow</h4>
        </div>
        <span className="project-status">
          {deal ? statusNames[deal.status] : milestone.blockchainEscrow?.dealId ? "Checking status" : "Not funded"}
        </span>
      </div>

      {milestone.blockchainEscrow?.dealId ? (
        <div className="blockchain-deal-info">
          <p>
            Deal #{milestone.blockchainEscrow.dealId} ·{" "}
            {milestone.blockchainEscrow.amountWei
              ? `${formatEther(BigInt(milestone.blockchainEscrow.amountWei))} test ETH`
              : "Loading on-chain state…"}
          </p>
          <a
            href={`https://sepolia.etherscan.io/tx/${milestone.blockchainEscrow.transactionHash}`}
            rel="noreferrer"
            target="_blank"
          >
            View funding transaction
          </a>
          <button className="button button-quiet" disabled={busy} onClick={refreshOnchainState} type="button">
            Refresh status
          </button>
        </div>
      ) : (
        <p className="workflow-note">
          Creates a separate on-chain deal using Sepolia test ETH; it is not linked to the INR budget or demo ledger.
        </p>
      )}

      {canCreate && (
        <div className="blockchain-create">
          <label className="field-label" htmlFor={`test-eth-${milestone._id}`}>Test ETH amount</label>
          <input
            className="form-input"
            id={`test-eth-${milestone._id}`}
            inputMode="decimal"
            onChange={(event) => setAmountEth(event.target.value)}
            placeholder="e.g. 0.001"
            value={amountEth}
          />
          <button className="button button-primary" disabled={busy || !configuration} onClick={createDeal} type="button">
            {busy ? "Waiting for wallet…" : "Fund with Sepolia test ETH"}
          </button>
        </div>
      )}

      {pendingRecord && (
        <button className="button button-quiet" disabled={busy} onClick={retryRecord} type="button">
          Retry linking the confirmed deal
        </button>
      )}

      {(canRelease || canRefund) && (
        <div className="issue-actions">
          {canRelease && (
            <button className="button button-primary" disabled={busy} onClick={() => runAction("release")} type="button">
              Release to freelancer
            </button>
          )}
          {canRefund && (
            <button className="button button-quiet" disabled={busy} onClick={() => runAction("refund")} type="button">
              Refund client
            </button>
          )}
        </div>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="workflow-note">
        Testnet only. Transactions are public and irreversible; the demo contract is unaudited and must never hold real funds. FairWork disputes are not handled by this on-chain escrow.
      </p>
    </section>
  );
}
