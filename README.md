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
