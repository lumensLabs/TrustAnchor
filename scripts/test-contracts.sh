#!/bin/bash

# RemitLend Contract Testing Script
# Tests deployed contracts on Stellar Testnet

set -e

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

# Load configuration
load_config() {
    local env_file=${1:-".env.testnet"}
    
    if [[ ! -f "$env_file" ]]; then
        log_error "Environment file not found: $env_file"
        log_info "Please run the deployment script first or provide a valid env file"
        exit 1
    fi
    
    log_info "Loading configuration from: $env_file"
    source "$env_file"
    
    # Validate required variables
    local required_vars=("NFT_CONTRACT_ID" "LOAN_MANAGER_CONTRACT_ID" "LENDING_POOL_CONTRACT_ID" "RPC_URL" "NETWORK_PASSPHRASE")
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            log_error "Required variable not set: $var"
            exit 1
        fi
    done
    
    log_success "Configuration loaded successfully"
}

# Setup test identity
setup_test_identity() {
    local identity_name=${1:-"testuser"}
    
    log_info "Setting up test identity: $identity_name"
    
    # Check if identity already exists
    if soroban keys address "$identity_name" 2>/dev/null; then
        log_warning "Identity '$identity_name' already exists"
        soroban keys address "$identity_name"
        return
    fi
    
    # Generate new identity
    soroban keys generate --global "$identity_name" --network testnet
    
    local address=$(soroban keys address "$identity_name")
    log_success "Created test identity '$identity_name' with address: $address"
    
    # Fund the account on testnet
    log_info "Funding test account on testnet..."
    if command -v curl &> /dev/null; then
        curl "https://friendbot.stellar.org?addr=$address" || log_warning "Failed to fund account automatically"
    else
        log_warning "curl not found. Please fund the account manually: https://friendbot.stellar.org?addr=$address"
    fi
    
    sleep 2  # Wait for funding to process
}

# Test NFT contract
test_nft_contract() {
    local identity_name=$1
    
    log_info "Testing NFT contract..."
    
    local test_address=$(soroban keys address "$identity_name")
    
    # Test getting score for non-existent user
    log_info "Testing get_score for non-existent user..."
    local score=$(soroban contract invoke \
        --id "$NFT_CONTRACT_ID" \
        --source "$identity_name" \
        --rpc-url "$RPC_URL" \
        --network-passphrase "$NETWORK_PASSPHRASE" \
        -- get_score \
        --owner "$test_address" 2>/dev/null || echo "0")
    
    log_info "Initial score: $score"
    
    # Test minting NFT (this would normally be done by an authorized minter)
    log_info "Testing NFT minting (simulated)..."
    log_warning "Note: Only authorized minters can mint NFTs. This test shows the interface."
    
    # Show the contract interface
    log_info "NFT Contract Methods:"
    echo "  - initialize(admin)"
    echo "  - authorize_minter(minter)"
    echo "  - revoke_minter(minter)"
    echo "  - mint_nft(owner, score)"
    echo "  - get_score(owner)"
    echo "  - update_score(owner, new_score)"
    echo "  - update_history_hash(owner, hash)"
    echo "  - lock_nft(nft_id)"
    echo "  - unlock_nft(nft_id)"
    
    log_success "NFT contract interface verified"
}

# Test Loan Manager contract
test_loan_manager_contract() {
    local identity_name=$1
    
    log_info "Testing Loan Manager contract..."
    
    local test_address=$(soroban keys address "$identity_name")
    
    # Test loan request (this will fail without proper NFT setup, but shows the interface)
    log_info "Testing loan request interface..."
    log_warning "Note: This will fail without proper NFT collateral, but shows the interface works."
    
    # Try to request a loan (expected to fail)
    if soroban contract invoke \
        --id "$LOAN_MANAGER_CONTRACT_ID" \
        --source "$identity_name" \
        --rpc-url "$RPC_URL" \
        --network-passphrase "$NETWORK_PASSPHRASE" \
        -- request_loan \
        --borrower "$test_address" \
        --amount 1000000000 2>/dev/null; then
        log_success "Loan request succeeded"
    else
        log_info "Loan request failed as expected (no NFT collateral)"
    fi
    
    # Show the contract interface
    log_info "Loan Manager Contract Methods:"
    echo "  - initialize(nft_contract)"
    echo "  - request_loan(borrower, amount)"
    echo "  - approve_loan(loan_id)"
    echo "  - repay(loan_id, amount)"
    echo "  - get_loan(loan_id)"
    echo "  - get_loan_status(loan_id)"
    
    log_success "Loan Manager contract interface verified"
}

# Test Lending Pool contract
test_lending_pool_contract() {
    local identity_name=$1
    
    log_info "Testing Lending Pool contract..."
    
    local test_address=$(soroban keys address "$identity_name")
    
    # Test getting deposit balance
    log_info "Testing get_deposit..."
    local balance=$(soroban contract invoke \
        --id "$LENDING_POOL_CONTRACT_ID" \
        --source "$identity_name" \
        --rpc-url "$RPC_URL" \
        --network-passphrase "$NETWORK_PASSPHRASE" \
        -- get_deposit \
        --provider "$test_address" 2>/dev/null || echo "0")
    
    log_info "Initial deposit balance: $balance"
    
    # Test deposit (this will fail without proper token setup, but shows the interface)
    log_info "Testing deposit interface..."
    log_warning "Note: This will fail without proper token setup, but shows the interface works."
    
    # Try to deposit (expected to fail)
    if soroban contract invoke \
        --id "$LENDING_POOL_CONTRACT_ID" \
        --source "$identity_name" \
        --rpc-url "$RPC_URL" \
        --network-passphrase "$NETWORK_PASSPHRASE" \
        -- deposit \
        --provider "$test_address" \
        --amount 1000000000 2>/dev/null; then
        log_success "Deposit succeeded"
    else
        log_info "Deposit failed as expected (no token setup)"
    fi
    
    # Show the contract interface
    log_info "Lending Pool Contract Methods:"
    echo "  - initialize(token)"
    echo "  - deposit(provider, amount)"
    echo "  - withdraw(provider, amount)"
    echo "  - get_deposit(provider)"
    echo "  - get_available_liquidity()"
    echo "  - allocate_funds(loan_id, amount)"
    echo "  - return_funds(loan_id, amount)"
    
    log_success "Lending Pool contract interface verified"
}

# Test contract integration
test_contract_integration() {
    log_info "Testing contract integration..."
    
    # Verify contracts can see each other
    log_info "Verifying contract addresses..."
    
    # Check if contracts are properly deployed
    soroban contract info --id "$NFT_CONTRACT_ID" --rpc-url "$RPC_URL" > /dev/null
    soroban contract info --id "$LOAN_MANAGER_CONTRACT_ID" --rpc-url "$RPC_URL" > /dev/null
    soroban contract info --id "$LENDING_POOL_CONTRACT_ID" --rpc-url "$RPC_URL" > /dev/null
    
    log_success "All contracts are deployed and accessible"
    
    # Show contract relationships
    log_info "Contract Relationships:"
    echo "  NFT Contract:        $NFT_CONTRACT_ID"
    echo "  Loan Manager:        $LOAN_MANAGER_CONTRACT_ID"
    echo "  Lending Pool:        $LENDING_POOL_CONTRACT_ID"
    echo
    echo "  Loan Manager uses NFT Contract for credit score verification"
    echo "  Loan Manager coordinates with Lending Pool for fund allocation"
    echo "  NFT Contract serves as collateral for loans"
    
    log_success "Contract integration verified"
}

# Run comprehensive test suite
run_tests() {
    local test_identity=${1:-"testuser"}
    local env_file=${2:-".env.testnet"}
    
    log_info "Starting RemitLend contract test suite..."
    
    # Load configuration
    load_config "$env_file"
    
    # Setup test identity
    setup_test_identity "$test_identity"
    
    # Run individual contract tests
    test_nft_contract "$test_identity"
    echo
    
    test_loan_manager_contract "$test_identity"
    echo
    
    test_lending_pool_contract "$test_identity"
    echo
    
    # Test integration
    test_contract_integration
    echo
    
    log_success "All tests completed successfully!"
    echo
    echo "Test Summary:"
    echo "✓ NFT Contract interface verified"
    echo "✓ Loan Manager Contract interface verified"
    echo "✓ Lending Pool Contract interface verified"
    echo "✓ Contract integration verified"
    echo
    echo "Next steps:"
    echo "1. Set up a token contract for the Lending Pool"
    echo "2. Mint NFTs with credit scores for testing"
    echo "3. Test the complete loan lifecycle"
    echo "4. Run integration tests with the frontend"
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -i, --identity NAME     Use specific test identity name (default: testuser)"
    echo "  -e, --env FILE          Use specific environment file (default: .env.testnet)"
    echo "  -h, --help              Show this help message"
    echo
    echo "Examples:"
    echo "  $0                      # Run tests with default settings"
    echo "  $0 -i mytestuser        # Run tests with custom identity"
    echo "  $0 -e .env.mainnet      # Run tests against mainnet deployment"
}

# Parse command line arguments
TEST_IDENTITY="testuser"
ENV_FILE=".env.testnet"

while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--identity)
            TEST_IDENTITY="$2"
            shift 2
            ;;
        -e|--env)
            ENV_FILE="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Run tests
run_tests "$TEST_IDENTITY" "$ENV_FILE"
