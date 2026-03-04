# RemitLend

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Frontend: Next.js](https://img.shields.io/badge/Frontend-Next.js-black?logo=next.js)](https://nextjs.org/)
[![Backend: Express](https://img.shields.io/badge/Backend-Express.js-white?logo=express)](https://expressjs.com/)
[![Smart Contracts: Soroban](https://img.shields.io/badge/Smart_Contracts-Soroban-orange)](https://soroban.stellar.org/)
[![Stellar](https://img.shields.io/badge/Stellar-Soroban-purple)](https://stellar.org)

RemitLend treats remittance history as credit history. Migrant workers prove their financial reliability through monthly cross-border transfers, allowing them to receive fair loans without predatory fees. In return, lenders earn transparent yield powered by the Stellar network.

## Overview

Billions of migrant workers send money home regularly, yet lack access to formal credit. RemitLend bridges this gap by converting verifiable remittance patterns into on-chain credit scores, minted as NFTs and used as collateral for decentralized loans.

- **Borrowers** submit remittance history → receive a credit score NFT → use it to access loans
- **Lenders** deposit liquidity into shared pools → earn yield from loan interest
- **All loan terms, collateral, and repayments** are recorded on the Stellar blockchain

## Key Features

### For Borrowers
- **Credit Building**: Convert your existing remittance history into an actionable credit score.
- **Fair Rates**: Access loans with transparent, non-predatory interest rates.
- **Self-Custody**: Maintain full control of your assets using Stellar wallets.

### For Lenders
- **Transparent Yield**: Earn interest by providing liquidity to audited borrowing pools.
- **Risk Assessment**: Make informed decisions based on verifiable, on-chain remittance proofs (Remittance NFTs).

### Technical Highlights
- **NFT-Based Collateral**: Remittance NFTs serve as proof of reliability and loan collateral.
- **Decentralized Lending Pools**: Lenders provide liquidity and earn transparent yields.
- **Transparent & Auditable**: All transactions and loan terms recorded on-chain.

## Project Structure

The repository is organized as a monorepo containing three core packages:

```
TrustAnchor/
├── frontend/          # Next.js web application (UI for borrowers and lenders)
├── backend/           # Node.js/Express API (credit scoring, metadata, validation)
├── contracts/         # Soroban smart contracts (NFT, loan manager, lending pool)
├── docker-compose.yml # Local development orchestration
├── ARCHITECTURE.md    # Detailed system architecture and diagrams
├── CONTRIBUTING.md    # Contribution guidelines
└── LICENSE            # ISC License
```

For a detailed look at how these components interact, see the [Architecture Diagram](ARCHITECTURE.md).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | [Stellar](https://stellar.org) — Soroban Smart Contracts |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend | Node.js 18+, Express.js 5, TypeScript, Zod, Swagger |
| Wallet | [Stellar Wallet Kit](https://github.com/stellar/stellar-wallet-kit) (Freighter) |
| Testing | Jest, Supertest, Rust test framework |
| Containers | Docker, Docker Compose |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [Docker & Docker Compose](https://www.docker.com/) (recommended)
- [Rust & Cargo](https://rustup.rs/) (required for contract development)
- [Soroban CLI](https://soroban.stellar.org/docs/getting-started/setup) (required for contract deployment)
- [Freighter Wallet](https://www.freighter.app/) (recommended for testing)

### Quick Start with Docker

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/remitlend.git
   cd remitlend
   ```

2. **Configure environment:**
   ```bash
   cp backend/.env.example backend/.env
   ```

3. **Start all services:**
   ```bash
   docker compose up --build
   ```

4. **Access the application:**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API: [http://localhost:3001](http://localhost:3001)
   - API Documentation: [http://localhost:3001/api-docs](http://localhost:3001/api-docs)

### Manual Setup

#### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env as needed — defaults work for local development
npm run dev
```

Available scripts: `dev`, `build`, `start`, `test`, `lint`, `format`

#### Frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

Available scripts: `dev`, `build`, `start`, `lint`

#### Smart Contracts

```bash
# Install Rust wasm32 target
rustup target add wasm32-unknown-unknown

# Install Soroban CLI
cargo install --locked soroban-cli

cd contracts

# Build all contracts
cargo build --target wasm32-unknown-unknown --release

# Run tests
cargo test

# Deploy to testnet (example)
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/remittance_nft.wasm \
  --source <YOUR_SECRET_KEY> \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

## Architecture

RemitLend consists of three smart contracts on Stellar Soroban:

```
Remittance NFT ──── stores credit score, locks as collateral
     │
Loan Manager ─────── manages loan lifecycle (request → approve → repay)
     │
Lending Pool ─────── holds lender deposits, distributes yield
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full system diagram, data flow sequences, security model, and entity relationships.

## Contributing

We welcome contributions from developers of all skill levels. See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

**Quick guide:**
1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Make your changes and commit using [Conventional Commits](https://www.conventionalcommits.org/)
4. Push and open a Pull Request

## License

This project is licensed under the [ISC License](LICENSE).
