# RemitLend Contract Deployment Scripts

This directory contains automation scripts for deploying and testing the RemitLend smart contracts on Stellar networks.

## Overview

The RemitLend platform consists of three smart contracts:

1. **Remittance NFT** - Stores credit scores and remittance history as NFTs
2. **Loan Manager** - Manages the complete loan lifecycle
3. **Lending Pool** - Handles liquidity deposits and withdrawals

## Prerequisites

Before running the deployment scripts, ensure you have:

- [Rust Toolchain](https://www.rust-lang.org/tools/install) (latest stable)
- [Soroban CLI](https://soroban.stellar.org/docs/getting-started/setup)
- [Node.js](https://nodejs.org/) (v16 or higher) - for Node.js scripts
- [Bash](https://www.gnu.org/software/bash/) - for shell scripts

### Installation

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add wasm32 target
rustup target add wasm32-unknown-unknown

# Install Soroban CLI
cargo install --locked soroban-cli

# Install Node.js dependencies (if using Node.js scripts)
npm install
```

## Quick Start

### Using Bash Scripts (Recommended)

```bash
# Make scripts executable
chmod +x *.sh

# Deploy to testnet
./deploy-contracts.sh deploy

# Test the deployment
./test-contracts.sh
```

### Using Node.js Scripts

```bash
# Deploy to testnet
npm run deploy

# Test the deployment
npm run test
```

## Script Details

### deploy-contracts.sh

The main deployment script that handles the complete deployment process.

**Features:**
- Builds all contracts
- Sets up Soroban identity
- Deploys all three contracts
- Initializes contracts with proper parameters
- Sets up contract permissions
- Verifies deployment
- Saves deployment information

**Usage:**
```bash
./deploy-contracts.sh [OPTIONS] [COMMAND]

Commands:
  deploy              Deploy all contracts (default)
  build               Build contracts only
  verify              Verify existing deployment
  help                Show this help message

Options:
  -i, --identity NAME     Use specific identity name (default: deployer)
  -n, --network NAME      Use specific network (default: testnet)
  --skip-build            Skip contract building
```

**Examples:**
```bash
# Deploy with default settings
./deploy-contracts.sh deploy

# Deploy with custom identity
./deploy-contracts.sh deploy -i mydeployer

# Deploy to mainnet (requires real funds)
./deploy-contracts.sh deploy -n mainnet

# Build contracts only
./deploy-contracts.sh build
```

### deploy-contracts.js

Node.js version of the deployment script with the same functionality as the bash version.

**Usage:**
```bash
node deploy-contracts.js [OPTIONS] [COMMAND]

# Or using npm scripts
npm run deploy
npm run deploy:mainnet
npm run build
```

### test-contracts.sh

Script to test deployed contracts and verify their functionality.

**Features:**
- Loads deployment configuration
- Sets up test identity
- Tests each contract interface
- Verifies contract integration
- Provides test results summary

**Usage:**
```bash
./test-contracts.sh [OPTIONS]

Options:
  -i, --identity NAME     Use specific test identity name (default: testuser)
  -e, --env FILE          Use specific environment file (default: .env.testnet)
  -h, --help              Show this help message
```

**Examples:**
```bash
# Test with default settings
./test-contracts.sh

# Test with custom identity
./test-contracts.sh -i mytestuser

# Test mainnet deployment
./test-contracts.sh -e .env.mainnet
```

## Deployment Process

### 1. Contract Building

The scripts first build all contracts using Cargo:

```bash
cargo build --target wasm32-unknown-unknown --release
```

This produces three WASM files:
- `remittance_nft.wasm`
- `loan_manager.wasm`
- `lending_pool.wasm`

### 2. Identity Setup

A Soroban identity is created for deployment:

```bash
soroban keys generate --global deployer --network testnet
```

The identity is automatically funded on testnet using Friendbot.

### 3. Contract Deployment

Each contract is deployed sequentially:

```bash
soroban contract deploy --wasm contract.wasm --source deployer --rpc-url https://soroban-testnet.stellar.org
```

### 4. Contract Initialization

Contracts are initialized with proper parameters:

- **NFT Contract**: Initialized with deployer as admin
- **Loan Manager**: Initialized with NFT contract address
- **Lending Pool**: Initialized with token contract address

### 5. Permission Setup

The Loan Manager is authorized to mint NFTs:

```bash
soroban contract invoke --id NFT_CONTRACT --authorize_minter --minter LOAN_MANAGER_CONTRACT
```

### 6. Verification

All contracts are verified to be properly deployed and accessible.

## Output Files

### Deployment Files

After successful deployment, the scripts generate:

1. **deployment-{network}-{timestamp}.json** - Complete deployment information
2. **.env.{network}** - Environment variables for easy access

**Example .env.testnet:**
```bash
# RemitLend Contract Addresses - TESTNET
NFT_CONTRACT_ID=CA3D5KRYA6OQFTVQAYZ5XD2TUXG6W5Z3P2Q4X7Y8Z9A1B2C3D4E5F6G7H8I9J0K
LOAN_MANAGER_CONTRACT_ID=AB1C2D3E4F5G6H7I8J9K0L1M2N3O4P5Q6R7S8T9U0V1W2X3Y4Z5A6B7C8D9E0F
LENDING_POOL_CONTRACT_ID=BC2D3E4F5G6H7I8J9K0L1M2N3O4P5Q6R7S8T9U0V1W2X3Y4Z5A6B7C8D9E0F1G
RPC_URL=https://soroban-testnet.stellar.org
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
```

### Using Environment Variables

Load the environment variables in your shell:

```bash
source .env.testnet

# Use in your application
echo $NFT_CONTRACT_ID
```

Or in Node.js:

```javascript
require('dotenv').config({ path: '.env.testnet' });
console.log(process.env.NFT_CONTRACT_ID);
```

## Contract Interfaces

### Remittance NFT Contract

**Key Methods:**
- `initialize(admin)` - Initialize contract with admin
- `authorize_minter(minter)` - Authorize address to mint NFTs
- `mint_nft(owner, score)` - Mint new NFT with credit score
- `get_score(owner)` - Get credit score for address
- `update_score(owner, new_score)` - Update credit score
- `lock_nft(nft_id)` - Lock NFT as collateral
- `unlock_nft(nft_id)` - Unlock NFT after loan repayment

### Loan Manager Contract

**Key Methods:**
- `initialize(nft_contract)` - Initialize with NFT contract address
- `request_loan(borrower, amount)` - Request a new loan
- `approve_loan(loan_id)` - Approve a pending loan
- `repay(loan_id, amount)` - Repay loan amount
- `get_loan(loan_id)` - Get loan details
- `get_loan_status(loan_id)` - Get loan status

### Lending Pool Contract

**Key Methods:**
- `initialize(token)` - Initialize with token contract address
- `deposit(provider, amount)` - Deposit funds into pool
- `withdraw(provider, amount)` - Withdraw funds from pool
- `get_deposit(provider)` - Get deposit balance
- `get_available_liquidity()` - Get available liquidity
- `allocate_funds(loan_id, amount)` - Allocate funds for loan
- `return_funds(loan_id, amount)` - Return funds from repayment

## Testing

The test script verifies that:

1. All contracts are deployed and accessible
2. Contract interfaces are working correctly
3. Contracts can interact with each other
4. Proper error handling is in place

### Running Tests

```bash
# Test testnet deployment
./test-contracts.sh

# Test mainnet deployment
./test-contracts.sh -e .env.mainnet

# Test with custom identity
./test-contracts.sh -i mytestuser
```

## Network Configuration

### Testnet

- **RPC URL**: https://soroban-testnet.stellar.org
- **Network Passphrase**: "Test SDF Network ; September 2015"
- **Friendbot**: https://friendbot.stellar.org

### Mainnet

- **RPC URL**: https://soroban.stellar.org
- **Network Passphrase**: "Public Global Stellar Network ; September 2015"
- **Friendbot**: Not available (requires real funds)

## Security Considerations

1. **Mainnet Deployment**: Always test on testnet first
2. **Key Management**: Store private keys securely
3. **Access Control**: Verify contract permissions after deployment
4. **Fund Management**: Ensure sufficient funds for deployment
5. **Code Review**: Review contract code before mainnet deployment

## Troubleshooting

### Common Issues

1. **Build Failures**:
   ```bash
   cargo clean
   cargo build --target wasm32-unknown-unknown --release
   ```

2. **Identity Issues**:
   ```bash
   soroban keys address deployer
   ```

3. **Network Issues**:
   ```bash
   curl https://soroban-testnet.stellar.org
   ```

4. **Funding Issues**:
   ```bash
   curl "https://friendbot.stellar.org?addr=<ADDRESS>"
   ```

### Getting Help

- Check the [Soroban Documentation](https://soroban.stellar.org/docs)
- Review the [Stellar Documentation](https://developers.stellar.org)
- Open an issue in the repository

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC License - See LICENSE file for details.
