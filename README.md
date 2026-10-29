# FairWork AI

FairWork AI helps freelancers and clients agree on clear deliverables, track milestones, document evidence, and manage disputes fairly.

## Architecture

- `frontend/`: React + Vite view layer
- `backend/`: Express MVC API, Mongoose models, controllers, routes, middleware, and services
- `blockchain/`: optional Solidity/Hardhat testnet escrow module
- MongoDB stores application data
- AI service turns project briefs into draft agreements and flags possible scope changes
- Demo escrow is simulated by default; no real money is held

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
- Milestone evidence submissions with protected downloads for project participants; files are limited to 10 MB and PDF, TXT, PNG, JPG, or WEBP
- Project change requests that the other participant can accept or reject; accepted budget and deadline proposals update the project
- Milestone disputes that move from open to under review before either participant can resolve or close them

Send project API requests with `Authorization: Bearer <token>`. Users can access only their own projects; only the project's creator can delete it.
Agreement approval becomes final only after both project roles approve. Milestones store amounts as whole-number paise; freelancers can advance delivery and clients can approve submitted work or request changes.
Project creators can invite a registered account using `POST /api/projects/:projectId/invitations` with `{ "email": "..." }`. Recipients can list invitations at `GET /api/projects/invitations/pending`, then accept or decline using `POST /api/projects/invitations/:invitationId/accept` or `/decline`. Only the invited account can respond; acceptance assigns the counterpart role on the project.

Freelancers assigned to a project can submit delivery notes or evidence files for milestones in progress. Clients can review and request changes or approve submitted work. Unresolved disputes prevent milestone status changes. Deleting a project also removes its related agreements, invitations, milestones, issue records, evidence records, and uploaded files.

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

## MVP workflow to implement

1. Register/login with secure authentication
2. Create a project and invite the other party
3. Generate an AI-assisted agreement draft
4. Both parties approve the same agreement version
5. Submit milestone evidence and request approval
6. Open a dispute or propose a change order
7. Track simulated escrow balance and transaction history

## Security notes

- Never commit `.env` files or API keys.
- Validate every request on the server.
- Check project membership and role on every protected action.
- Store passwords as secure hashes, never plaintext.
- AI output is a draft for human review, not legal advice or an automatic ruling.
- Demo escrow is not real custody of funds. Review applicable laws before handling real payments.
