# FairWork AI — Blockchain module

## Requirements
- Node.js 20+
- Testnet RPC URL and test wallet only if deploying to Sepolia

## Install and test locally
```bash
npm install
npx hardhat compile
npx hardhat test
```

## Deploy to Sepolia (optional)
1. Copy `.env.example` to `.env`.
2. Set `SEPOLIA_RPC_URL` from an RPC provider.
3. Set `PRIVATE_KEY` to a throwaway wallet private key funded only with Sepolia test ETH.
4. Never commit `.env` or expose the private key.
5. Run:
```bash
npm run deploy:sepolia
```

The deploy script prints the deployed contract address. Save that address for your frontend integration.

## Demo flow
- Client calls `createDeal(freelancerAddress, agreementHash)` and attaches testnet ETH.
- Client calls `release(dealId)` after accepting the milestone.
- Either party can call `raiseDispute(dealId)` to block the ordinary release/refund functions.
- `resolveDispute(dealId, payFreelancer)` is intentionally unsafe for production: either party can pick the outcome. It is only present to demonstrate a flow. Remove it or replace it with an agreed arbitrator/multisig process before any real use.

## Important security notes
- This contract is not audited and must not hold real funds.
- It supports one lump-sum milestone per deal. Extend and independently audit before multi-milestone escrow.
- The agreement text stays off-chain. Store only a hash on-chain to reduce privacy exposure.
- The contract uses native chain currency, not ERC-20 tokens.
- The current client-controlled refund is a demo simplification; production refund and dispute rules must be mutually agreed and carefully specified.
