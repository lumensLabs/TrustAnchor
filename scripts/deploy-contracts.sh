#!/bin/bash

# RemitLend Contract Deployment Script
# Deploys and initializes all contracts on Stellar Testnet

set -e

# Configuration
NETWORK="testnet"
RPC_URL="https://soroban-testnet.stellar.org"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
CONTRACTS_DIR="../contracts"
BUILD_DIR="$CONTRACTS_DIR/target/wasm32-unknown-unknown/release"

# Contract WASM files
NFT_WASM="$BUILD_DIR/remittance_nft.wasm"
LOAN_MANAGER_WASM="$BUILD_DIR/loan_manager.wasm"
LENDING_POOL_WASM="$BUILD_DIR/lending_pool.wasm"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if soroban-cli is installed
    if ! command -v soroban &> /dev/null; then
        log_error "soroban-cli is not installed. Please install it first:"
        echo "cargo install --locked soroban-cli"
        exit 1
    fi
    
    # Check if rust is installed
    if ! command -v rustc &> /dev/null; then
        log_error "Rust is not installed. Please install it first:"
        echo "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
        exit 1
    fi
    
    # Check if wasm32 target is installed
    if ! rustup target list --installed | grep -q wasm32-unknown-unknown; then
        log_warning "wasm32-unknown-unknown target not found. Installing..."
        rustup target add wasm32-unknown-unknown
    fi
    
    # Check if contracts are built
    if [[ ! -f "$NFT_WASM" ]] || [[ ! -f "$LOAN_MANAGER_WASM" ]] || [[ ! -f "$LENDING_POOL_WASM" ]]; then
        log_warning "Contract WASM files not found. Building contracts..."
        build_contracts
    fi
    
    log_success "Prerequisites check passed"
}

# Build contracts
build_contracts() {
    log_info "Building contracts..."
    cd "$CONTRACTS_DIR"
    
    # Clean previous builds
    cargo clean
    
    # Build all contracts
    cargo build --target wasm32-unknown-unknown --release
    
    # Verify builds
    if [[ ! -f "$NFT_WASM" ]] || [[ ! -f "$LOAN_MANAGER_WASM" ]] || [[ ! -f "$LENDING_POOL_WASM" ]]; then
        log_error "Failed to build contracts"
        exit 1
    fi
    
    log_success "Contracts built successfully"
}

# Setup Soroban identity
setup_identity() {
    local identity_name=${1:-"deployer"}
    
    log_info "Setting up Soroban identity: $identity_name"
    
    # Check if identity already exists
    if soroban keys address "$identity_name" 2>/dev/null; then
        log_warning "Identity '$identity_name' already exists"
        soroban keys address "$identity_name"
        return
    fi
    
    # Generate new identity
    soroban keys generate --global "$identity_name" --network "$NETWORK"
    
    local address=$(soroban keys address "$identity_name")
    log_success "Created identity '$identity_name' with address: $address"
    
    # Fund the account on testnet
    log_info "Funding account on testnet..."
    if command -v curl &> /dev/null; then
        curl "https://friendbot.stellar.org?addr=$address" || log_warning "Failed to fund account automatically"
    else
        log_warning "curl not found. Please fund the account manually: https://friendbot.stellar.org?addr=$address"
    fi
    
    sleep 2  # Wait for funding to process
}

# Deploy contract
deploy_contract() {
    local wasm_file=$1
    local contract_name=$2
    local identity_name=$3
    
    log_info "Deploying $contract_name contract..."
    
    if [[ ! -f "$wasm_file" ]]; then
        log_error "WASM file not found: $wasm_file"
        return 1
    fi
    
    # Deploy contract
    local contract_id=$(soroban contract deploy \
        --wasm "$wasm_file" \
        --source "$identity_name" \
        --rpc-url "$RPC_URL" \
        --network-passphrase "$NETWORK_PASSPHRASE")
    
    if [[ -z "$contract_id" ]]; then
        log_error "Failed to deploy $contract_name"
        return 1
    fi
    
    log_success "$contract_name deployed: $contract_id"
    echo "$contract_id"
}

# Initialize NFT contract
initialize_nft_contract() {
    local contract_id=$1
    local identity_name=$2
    
    log_info "Initializing NFT contract..."
    
    local admin_address=$(soroban keys address "$identity_name")
    
    soroban contract invoke \
        --id "$contract_id" \
        --source "$identity_name" \
        --rpc-url "$RPC_URL" \
        --network-passphrase "$NETWORK_PASSPHRASE" \
        -- initialize \
        --admin "$admin_address"
    
    log_success "NFT contract initialized"
}

# Initialize Loan Manager contract
initialize_loan_manager_contract() {
    local contract_id=$1
    local nft_contract_id=$2
    local identity_name=$3
    
    log_info "Initializing Loan Manager contract..."
    
    soroban contract invoke \
        --id "$contract_id" \
        --source "$identity_name" \
        --rpc-url "$RPC_URL" \
        --network-passphrase "$NETWORK_PASSPHRASE" \
        -- initialize \
        --nft_contract "$nft_contract_id"
    
    log_success "Loan Manager contract initialized"
}

# Initialize Lending Pool contract
initialize_lending_pool_contract() {
    local contract_id=$1
    local identity_name=$2
    
    log_info "Initializing Lending Pool contract..."
    
    # For now, we'll use a placeholder token address
    # In production, this should be a real token contract address
    local token_address="CDLZFC3SYJYDZT7K67VZ75GJBUN5IK7TCI4EWEYJ5WPE4WCK2WRD"
    
    soroban contract invoke \
        --id "$contract_id" \
        --source "$identity_name" \
        --rpc-url "$RPC_URL" \
        --network-passphrase "$NETWORK_PASSPHRASE" \
        -- initialize \
        --token "$token_address"
    
    log_success "Lending Pool contract initialized"
}

# Setup contract permissions
setup_contract_permissions() {
    local nft_contract_id=$1
    local loan_manager_contract_id=$2
    local identity_name=$3
    
    log_info "Setting up contract permissions..."
    
    # Authorize Loan Manager to mint NFTs
    soroban contract invoke \
        --id "$nft_contract_id" \
        --source "$identity_name" \
        --rpc-url "$RPC_URL" \
        --network-passphrase "$NETWORK_PASSPHRASE" \
        -- authorize_minter \
        --minter "$loan_manager_contract_id"
    
    log_success "Contract permissions configured"
}

# Verify deployment
verify_deployment() {
    local nft_contract_id=$1
    local loan_manager_contract_id=$2
    local lending_pool_contract_id=$3
    
    log_info "Verifying deployment..."
    
    # Check NFT contract
    log_info "Checking NFT contract..."
    soroban contract info --id "$nft_contract_id" --rpc-url "$RPC_URL"
    
    # Check Loan Manager contract
    log_info "Checking Loan Manager contract..."
    soroban contract info --id "$loan_manager_contract_id" --rpc-url "$RPC_URL"
    
    # Check Lending Pool contract
    log_info "Checking Lending Pool contract..."
    soroban contract info --id "$lending_pool_contract_id" --rpc-url "$RPC_URL"
    
    log_success "All contracts verified"
}

# Save deployment info
save_deployment_info() {
    local nft_contract_id=$1
    local loan_manager_contract_id=$2
    local lending_pool_contract_id=$3
    local identity_name=$4
    
    local deployment_file="deployment-$NETWORK-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$deployment_file" << EOF
{
  "network": "$NETWORK",
  "deployer": "$identity_name",
  "deployer_address": "$(soroban keys address "$identity_name")",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "contracts": {
    "remittance_nft": {
      "id": "$nft_contract_id",
      "wasm": "remittance_nft.wasm"
    },
    "loan_manager": {
      "id": "$loan_manager_contract_id", 
      "wasm": "loan_manager.wasm"
    },
    "lending_pool": {
      "id": "$lending_pool_contract_id",
      "wasm": "lending_pool.wasm"
    }
  },
  "rpc_url": "$RPC_URL",
  "network_passphrase": "$NETWORK_PASSPHRASE"
}
EOF
    
    log_success "Deployment info saved to: $deployment_file"
    
    # Also create .env file for easy access
    cat > ".env.$NETWORK" << EOF
# RemitLend Contract Addresses - $NETWORK
NFT_CONTRACT_ID=$nft_contract_id
LOAN_MANAGER_CONTRACT_ID=$loan_manager_contract_id
LENDING_POOL_CONTRACT_ID=$lending_pool_contract_id
RPC_URL=$RPC_URL
NETWORK_PASSPHRASE="$NETWORK_PASSPHRASE"
EOF
    
    log_success "Environment file created: .env.$NETWORK"
}

# Main deployment function
deploy_all() {
    local identity_name=${1:-"deployer"}
    
    log_info "Starting RemitLend contract deployment to $NETWORK..."
    
    # Check prerequisites
    check_prerequisites
    
    # Setup identity
    setup_identity "$identity_name"
    
    # Deploy contracts
    log_info "Deploying all contracts..."
    
    local nft_contract_id=$(deploy_contract "$NFT_WASM" "Remittance NFT" "$identity_name")
    local loan_manager_contract_id=$(deploy_contract "$LOAN_MANAGER_WASM" "Loan Manager" "$identity_name")
    local lending_pool_contract_id=$(deploy_contract "$LENDING_POOL_WASM" "Lending Pool" "$identity_name")
    
    # Initialize contracts
    log_info "Initializing contracts..."
    
    initialize_nft_contract "$nft_contract_id" "$identity_name"
    initialize_loan_manager_contract "$loan_manager_contract_id" "$nft_contract_id" "$identity_name"
    initialize_lending_pool_contract "$lending_pool_contract_id" "$identity_name"
    
    # Setup permissions
    setup_contract_permissions "$nft_contract_id" "$loan_manager_contract_id" "$identity_name"
    
    # Verify deployment
    verify_deployment "$nft_contract_id" "$loan_manager_contract_id" "$lending_pool_contract_id"
    
    # Save deployment info
    save_deployment_info "$nft_contract_id" "$loan_manager_contract_id" "$lending_pool_contract_id" "$identity_name"
    
    log_success "Deployment completed successfully!"
    echo
    echo "Contract Addresses:"
    echo "  NFT Contract:        $nft_contract_id"
    echo "  Loan Manager:        $loan_manager_contract_id"
    echo "  Lending Pool:        $lending_pool_contract_id"
    echo
    echo "Next steps:"
    echo "1. Load the environment: source .env.$NETWORK"
    echo "2. Update your backend configuration with these contract addresses"
    echo "3. Test the contracts using the test scripts"
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS] [COMMAND]"
    echo
    echo "Commands:"
    echo "  deploy              Deploy all contracts (default)"
    echo "  build               Build contracts only"
    echo "  verify              Verify existing deployment"
    echo "  help                Show this help message"
    echo
    echo "Options:"
    echo "  -i, --identity NAME     Use specific identity name (default: deployer)"
    echo "  -n, --network NAME      Use specific network (default: testnet)"
    echo "  --skip-build            Skip contract building"
    echo
    echo "Examples:"
    echo "  $0 deploy                    # Deploy with default settings"
    echo "  $0 deploy -i mydeployer       # Deploy with custom identity"
    echo "  $0 build                     # Build contracts only"
}

# Parse command line arguments
IDENTITY_NAME="deployer"
SKIP_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--identity)
            IDENTITY_NAME="$2"
            shift 2
            ;;
        -n|--network)
            NETWORK="$2"
            if [[ "$NETWORK" == "mainnet" ]]; then
                RPC_URL="https://soroban.stellar.org"
                NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
            fi
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        deploy|build|verify|help)
            COMMAND="$1"
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Execute command
case ${COMMAND:-deploy} in
    deploy)
        if [[ "$SKIP_BUILD" != true ]]; then
            build_contracts
        fi
        deploy_all "$IDENTITY_NAME"
        ;;
    build)
        build_contracts
        ;;
    verify)
        log_error "Verify command not implemented yet"
        exit 1
        ;;
    help)
        show_usage
        ;;
    *)
        log_error "Unknown command: ${COMMAND:-deploy}"
        show_usage
        exit 1
        ;;
esac
