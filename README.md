# FairWork AI

FairWork AI helps freelancers and clients agree on clear deliverables, track milestones, document evidence, and manage disputes fairly.

## Architecture

- `frontend/`: React + Vite view layer
- `backend/`: Express MVC API, Mongoose models, controllers, routes, middleware, and services
- `blockchain/`: Solidity/Hardhat Sepolia escrow contract connected to milestone workflows when configured
- MongoDB stores application data
- AI service turns project briefs into draft agreements and flags possible scope changes
- The existing demo escrow is simulated; the optional Sepolia integration uses test ETH only and requires a separately deployed contract

## Prerequisites

- Node.js 20+
- MongoDB local instance or MongoDB Atlas connection string
- Git

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Set `MONGODB_URI` in `backend/.env`. The API starts on port 5000.
Set `JWT_SECRET` to a unique random value of at least 32 characters before starting the API.

The backend currently provides:

- `POST /api/auth/register` and `POST /api/auth/login` for client/freelancer accounts
- `GET /api/auth/me` for the authenticated account
- Authenticated project list, create, read, update, and delete endpoints under `/api/projects`
- Project budgets as whole-number `budgetPaise` values and optional ISO-8601 `deadline` values
- Project invitations for adding one registered participant in the opposite role
- Project agreement drafts, submission, and approval, plus milestone creation and status updates
- AI-assisted agreement draft generation through the OpenAI API (`AI_API_KEY` stays on the backend; `AI_MODEL` is optional)
- Milestone evidence submissions with protected downloads for project participants; files are limited to 10 MB and PDF, TXT, PNG, JPG, or WEBP
- Project change requests that the other participant can accept or reject; accepted budget and deadline proposals update the project
- Milestone disputes that move from open to under review before either participant can resolve or close them
- A demo escrow ledger for simulated milestone funding, release, refunds, balances, and transaction history
- Optional Sepolia milestone escrow using browser-wallet signatures, verified wallet ownership, test ETH, and a public agreement hash; it is separate from the INR budget and simulated ledger

Send project API requests with `Authorization: Bearer <token>`. Users can access only their own projects; only the project's creator can delete it.
Agreement approval becomes final only after both project roles approve. Milestones store amounts as whole-number paise; freelancers can advance delivery and clients can approve submitted work or request changes.
Project creators can invite a registered account using `POST /api/projects/:projectId/invitations` with `{ "email": "..." }`. Recipients can list invitations at `GET /api/projects/invitations/pending`, then accept or decline using `POST /api/projects/invitations/:invitationId/accept` or `/decline`. Only the invited account can respond; acceptance assigns the counterpart role on the project.

Freelancers assigned to a project can submit delivery notes or evidence files for milestones in progress. Clients can review and request changes or approve submitted work. Unresolved disputes prevent milestone status changes. Deleting a project also removes its related agreements, invitations, milestones, issue records, evidence records, and uploaded files.

Set `AI_API_KEY` in `backend/.env` to enable agreement generation; set `AI_MODEL` only if you want to use a model other than `gpt-4o-mini`. Only the brief you enter and explicitly consent to send is shared with OpenAI. Generated agreements are editable drafts, not legal advice; do not include confidential information.

The demo escrow ledger records simulated funding, release, and refund actions only. It does not collect, hold, refund, or transfer actual funds.

### Optional Sepolia blockchain escrow

The blockchain panel is separate from the simulated INR escrow. It accepts a manually entered Sepolia test ETH amount, and does not convert or reconcile that amount with the project INR budget. Both project participants must link wallets; only the client wallet funds, releases, or refunds.

1. Install the blockchain package dependencies and create a test-only deployer wallet:

   ```bash
   npm --prefix blockchain install
   cp blockchain/.env.example blockchain/.env
   ```

2. Set `SEPOLIA_RPC_URL` and a throwaway Sepolia-funded `PRIVATE_KEY` in `blockchain/.env`, then deploy:

   ```bash
   npm --prefix blockchain run deploy:sepolia
   ```

   Keep the printed contract address. Never use a wallet containing real funds.

3. Set `SEPOLIA_RPC_URL` and the deployed `SEPOLIA_ESCROW_ADDRESS` in `backend/.env`, then restart the backend. The backend checks that deal-creation transactions came from the linked client wallet, target the configured contract, include the linked freelancer wallet, and hash the approved agreement.

4. Start the frontend, log in as each project participant, and use **Connect wallet** to sign the wallet-link challenge. The client can then open an approved project's milestone, enter a Sepolia test ETH amount, and fund it. The client can release after approving a milestone or refund eligible pending work. Transactions can be inspected on Sepolia Etherscan.

The browser wallet must be switched to Sepolia and funded with test ETH for the client. Agreement text is never sent on-chain; only its hash is included. A wallet address is fixed to its account after linking, and a project cannot be deleted after a blockchain deal is associated with it. This contract is unaudited and testnet-only. Its on-chain dispute resolution is intentionally not exposed in the app; app disputes do not adjudicate or automatically freeze blockchain deals. Do not deploy this contract to mainnet or use it for real funds.

Run the backend integration test from the repository root with:

```bash
npm --prefix backend test
```

The test uses a uniquely named disposable database on local MongoDB and drops it when complete. To use a different test MongoDB server, set `MONGODB_TEST_URI` to its connection URI; do not point this variable at a production database.

### 2. Frontend

Open a second terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The frontend runs on Vite's local URL, usually `http://localhost:5173`.

## Typical user workflow

1. Register/login as a client or freelancer
2. Create a project and invite the other participant
3. Generate or write an agreement; both participants approve the same version
4. Track deliverables with milestones, evidence, and milestone approvals
5. Use change requests and disputes to document issues
6. Optionally fund a milestone in the simulated INR escrow or the separately configured Sepolia testnet escrow

## Security notes

- Never commit `.env` files or API keys.
- Validate every request on the server.
- Check project membership and role on every protected action.
- Store passwords as secure hashes, never plaintext.
- AI output is a draft for human review, not legal advice or an automatic ruling.
- Demo escrow is not real custody of funds. Review applicable laws before handling real payments.
