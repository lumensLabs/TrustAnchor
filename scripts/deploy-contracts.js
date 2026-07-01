#!/usr/bin/env node

/**
 * RemitLend Contract Deployment Script
 * Node.js script to deploy and initialize all contracts on Stellar Testnet
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const readline = require('readline');

// Configuration
const CONFIG = {
  testnet: {
    rpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
    friendbotUrl: 'https://friendbot.stellar.org',
  },
  mainnet: {
    rpcUrl: 'https://soroban.stellar.org',
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    friendbotUrl: null,
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Logging functions
const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
};

/**
 * Execute a command and return the output
 */
function execCommand(command, options = {}) {
  try {
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
    return result ? result.trim() : '';
  } catch (error) {
    if (options.silent) {
      throw error;
    }
    log.error(`Command failed: ${command}`);
    if (error.message) {
      log.error(error.message);
    }
    process.exit(1);
  }
}

/**
 * Check if a command exists
 */
function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check prerequisites
 */
function checkPrerequisites() {
  log.info('Checking prerequisites...');

  // Check soroban-cli
  if (!commandExists('soroban')) {
    log.error('soroban-cli is not installed. Please install it first:');
    log.info('cargo install --locked soroban-cli');
    process.exit(1);
  }

  // Check rust
  if (!commandExists('rustc')) {
    log.error('Rust is not installed. Please install it first:');
    log.info('curl --proto \'=\'https\'\' --tlsv1.2 -sSf https://sh.rustup.rs | sh');
    process.exit(1);
  }

  // Check wasm32 target
  const rustTargets = execCommand('rustup target list --installed', { silent: true });
  if (!rustTargets.includes('wasm32-unknown-unknown')) {
    log.warning('wasm32-unknown-unknown target not found. Installing...');
    execCommand('rustup target add wasm32-unknown-unknown');
  }

  log.success('Prerequisites check passed');
}

/**
 * Build contracts
 */
function buildContracts() {
  log.info('Building contracts...');
  
  const contractsDir = path.resolve(__dirname, '../contracts');
  process.chdir(contractsDir);

  // Clean previous builds
  execCommand('cargo clean');

  // Build all contracts
  execCommand('cargo build --target wasm32-unknown-unknown --release');

  // Verify builds
  const buildDir = path.join(contractsDir, 'target/wasm32-unknown-unknown/release');
  const requiredFiles = ['remittance_nft.wasm', 'loan_manager.wasm', 'lending_pool.wasm'];
  
  for (const file of requiredFiles) {
    const filePath = path.join(buildDir, file);
    if (!fs.existsSync(filePath)) {
      log.error(`Failed to build contracts: ${file} not found`);
      process.exit(1);
    }
  }

  log.success('Contracts built successfully');
  return buildDir;
}

/**
 * Setup Soroban identity
 */
function setupIdentity(identityName = 'deployer') {
  log.info(`Setting up Soroban identity: ${identityName}`);

  // Check if identity already exists
  try {
    const address = execCommand(`soroban keys address ${identityName}`, { silent: true });
    log.warning(`Identity '${identityName}' already exists: ${address}`);
    return address;
  } catch {
    // Identity doesn't exist, create it
  }

  // Generate new identity
  execCommand(`soroban keys generate --global ${identityName} --network testnet`);
  
  const address = execCommand(`soroban keys address ${identityName}`, { silent: true });
  log.success(`Created identity '${identityName}' with address: ${address}`);

  // Fund the account on testnet
  log.info('Funding account on testnet...');
  try {
    execCommand(`curl "${CONFIG.testnet.friendbotUrl}?addr=${address}"`, { silent: true });
    log.success('Account funded successfully');
  } catch (error) {
    log.warning('Failed to fund account automatically');
    log.info(`Please fund manually: ${CONFIG.testnet.friendbotUrl}?addr=${address}`);
  }

  // Wait for funding to process
  log.info('Waiting for funding to process...');
  setTimeout(() => {}, 2000);

  return address;
}

/**
 * Deploy contract
 */
function deployContract(wasmFile, contractName, identityName, network) {
  log.info(`Deploying ${contractName} contract...`);

  if (!fs.existsSync(wasmFile)) {
    log.error(`WASM file not found: ${wasmFile}`);
    throw new Error(`WASM file not found: ${wasmFile}`);
  }

  const config = CONFIG[network];
  
  const contractId = execCommand(
    `soroban contract deploy --wasm "${wasmFile}" --source "${identityName}" --rpc-url "${config.rpcUrl}" --network-passphrase "${config.networkPassphrase}"`,
    { silent: true }
  );

  if (!contractId) {
    log.error(`Failed to deploy ${contractName}`);
    throw new Error(`Failed to deploy ${contractName}`);
  }

  log.success(`${contractName} deployed: ${contractId}`);
  return contractId.trim();
}

/**
 * Initialize NFT contract
 */
function initializeNFTContract(contractId, identityName, network) {
  log.info('Initializing NFT contract...');

  const config = CONFIG[network];
  const adminAddress = execCommand(`soroban keys address ${identityName}`, { silent: true });

  execCommand(
    `soroban contract invoke --id "${contractId}" --source "${identityName}" --rpc-url "${config.rpcUrl}" --network-passphrase "${config.networkPassphrase}" -- initialize --admin "${adminAddress}"`
  );

  log.success('NFT contract initialized');
}

/**
 * Initialize Loan Manager contract
 */
function initializeLoanManagerContract(contractId, nftContractId, identityName, network) {
  log.info('Initializing Loan Manager contract...');

  const config = CONFIG[network];

  execCommand(
    `soroban contract invoke --id "${contractId}" --source "${identityName}" --rpc-url "${config.rpcUrl}" --network-passphrase "${config.networkPassphrase}" -- initialize --nft_contract "${nftContractId}"`
  );

  log.success('Loan Manager contract initialized');
}

/**
 * Initialize Lending Pool contract
 */
function initializeLendingPoolContract(contractId, identityName, network) {
  log.info('Initializing Lending Pool contract...');

  const config = CONFIG[network];
  
  // For now, we'll use a placeholder token address
  // In production, this should be a real token contract address
  const tokenAddress = 'CDLZFC3SYJYDZT7K67VZ75GJBUN5IK7TCI4EWEYJ5WPE4WCK2WRD';

  execCommand(
    `soroban contract invoke --id "${contractId}" --source "${identityName}" --rpc-url "${config.rpcUrl}" --network-passphrase "${config.networkPassphrase}" -- initialize --token "${tokenAddress}"`
  );

  log.success('Lending Pool contract initialized');
}

/**
 * Setup contract permissions
 */
function setupContractPermissions(nftContractId, loanManagerContractId, identityName, network) {
  log.info('Setting up contract permissions...');

  const config = CONFIG[network];

  // Authorize Loan Manager to mint NFTs
  execCommand(
    `soroban contract invoke --id "${nftContractId}" --source "${identityName}" --rpc-url "${config.rpcUrl}" --network-passphrase "${config.networkPassphrase}" -- authorize_minter --minter "${loanManagerContractId}"`
  );

  log.success('Contract permissions configured');
}

/**
 * Verify deployment
 */
function verifyDeployment(nftContractId, loanManagerContractId, lendingPoolContractId, network) {
  log.info('Verifying deployment...');

  const config = CONFIG[network];

  // Check NFT contract
  log.info('Checking NFT contract...');
  execCommand(`soroban contract info --id "${nftContractId}" --rpc-url "${config.rpcUrl}"`);

  // Check Loan Manager contract
  log.info('Checking Loan Manager contract...');
  execCommand(`soroban contract info --id "${loanManagerContractId}" --rpc-url "${config.rpcUrl}"`);

  // Check Lending Pool contract
  log.info('Checking Lending Pool contract...');
  execCommand(`soroban contract info --id "${lendingPoolContractId}" --rpc-url "${config.rpcUrl}"`);

  log.success('All contracts verified');
}

/**
 * Save deployment information
 */
function saveDeploymentInfo(contracts, identityName, network) {
  const timestamp = new Date().toISOString();
  const deploymentFile = `deployment-${network}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
  
  const deploymentData = {
    network,
    deployer: identityName,
    deployerAddress: execCommand(`soroban keys address ${identityName}`, { silent: true }),
    timestamp,
    contracts,
    rpcUrl: CONFIG[network].rpcUrl,
    networkPassphrase: CONFIG[network].networkPassphrase,
  };

  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
  log.success(`Deployment info saved to: ${deploymentFile}`);

  // Create .env file for easy access
  const envFile = `.env.${network}`;
  const envContent = `# RemitLend Contract Addresses - ${network.toUpperCase()}
NFT_CONTRACT_ID=${contracts.remittance_nft.id}
LOAN_MANAGER_CONTRACT_ID=${contracts.loan_manager.id}
LENDING_POOL_CONTRACT_ID=${contracts.lending_pool.id}
RPC_URL=${CONFIG[network].rpcUrl}
NETWORK_PASSPHRASE="${CONFIG[network].networkPassphrase}"
`;

  fs.writeFileSync(envFile, envContent);
  log.success(`Environment file created: ${envFile}`);

  return { deploymentFile, envFile };
}

/**
 * Main deployment function
 */
async function deployAll(options = {}) {
  const { identityName = 'deployer', network = 'testnet', skipBuild = false } = options;

  log.info(`Starting RemitLend contract deployment to ${network}...`);

  // Check prerequisites
  checkPrerequisites();

  // Build contracts if needed
  let buildDir;
  if (!skipBuild) {
    buildDir = buildContracts();
  } else {
    buildDir = path.resolve(__dirname, '../contracts/target/wasm32-unknown-unknown/release');
  }

  // Setup identity
  const deployerAddress = setupIdentity(identityName);

  // Deploy contracts
  log.info('Deploying all contracts...');

  const contracts = {
    remittance_nft: {
      id: deployContract(
        path.join(buildDir, 'remittance_nft.wasm'),
        'Remittance NFT',
        identityName,
        network
      ),
      wasm: 'remittance_nft.wasm',
    },
    loan_manager: {
      id: deployContract(
        path.join(buildDir, 'loan_manager.wasm'),
        'Loan Manager',
        identityName,
        network
      ),
      wasm: 'loan_manager.wasm',
    },
    lending_pool: {
      id: deployContract(
        path.join(buildDir, 'lending_pool.wasm'),
        'Lending Pool',
        identityName,
        network
      ),
      wasm: 'lending_pool.wasm',
    },
  };

  // Initialize contracts
  log.info('Initializing contracts...');

  initializeNFTContract(contracts.remittance_nft.id, identityName, network);
  initializeLoanManagerContract(contracts.loan_manager.id, contracts.remittance_nft.id, identityName, network);
  initializeLendingPoolContract(contracts.lending_pool.id, identityName, network);

  // Setup permissions
  setupContractPermissions(contracts.remittance_nft.id, contracts.loan_manager.id, identityName, network);

  // Verify deployment
  verifyDeployment(contracts.remittance_nft.id, contracts.loan_manager.id, contracts.lending_pool.id, network);

  // Save deployment info
  const { deploymentFile, envFile } = saveDeploymentInfo(contracts, identityName, network);

  log.success('Deployment completed successfully!');
  console.log();
  console.log('Contract Addresses:');
  console.log(`  NFT Contract:        ${contracts.remittance_nft.id}`);
  console.log(`  Loan Manager:        ${contracts.loan_manager.id}`);
  console.log(`  Lending Pool:        ${contracts.lending_pool.id}`);
  console.log();
  console.log('Next steps:');
  console.log(`1. Load the environment: source ${envFile}`);
  console.log('2. Update your backend configuration with these contract addresses');
  console.log('3. Test the contracts using the test scripts');

  return { contracts, deploymentFile, envFile };
}

/**
 * Show usage information
 */
function showUsage() {
  console.log('Usage: node deploy-contracts.js [OPTIONS] [COMMAND]');
  console.log();
  console.log('Commands:');
  console.log('  deploy              Deploy all contracts (default)');
  console.log('  build               Build contracts only');
  console.log('  help                Show this help message');
  console.log();
  console.log('Options:');
  console.log('  -i, --identity NAME     Use specific identity name (default: deployer)');
  console.log('  -n, --network NAME      Use specific network (default: testnet)');
  console.log('  --skip-build            Skip contract building');
  console.log('  --yes                   Skip confirmation prompts');
  console.log();
  console.log('Examples:');
  console.log('  node deploy-contracts.js deploy                    # Deploy with default settings');
  console.log('  node deploy-contracts.js deploy -i mydeployer       # Deploy with custom identity');
  console.log('  node deploy-contracts.js build                     # Build contracts only');
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    identityName: 'deployer',
    network: 'testnet',
    skipBuild: false,
    yes: false,
    command: 'deploy',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '-i':
      case '--identity':
        options.identityName = args[++i];
        break;
      case '-n':
      case '--network':
        options.network = args[++i];
        if (!CONFIG[options.network]) {
          log.error(`Unsupported network: ${options.network}`);
          process.exit(1);
        }
        break;
      case '--skip-build':
        options.skipBuild = true;
        break;
      case '--yes':
        options.yes = true;
        break;
      case 'deploy':
      case 'build':
      case 'help':
        options.command = arg;
        break;
      default:
        log.error(`Unknown option: ${arg}`);
        showUsage();
        process.exit(1);
    }
  }

  return options;
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();

  switch (options.command) {
    case 'deploy':
      if (!options.yes && options.network === 'mainnet') {
        log.warning('You are about to deploy to MAINNET. This will cost real funds.');
        log.warning('Are you sure you want to continue? (y/N)');
        
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise(resolve => {
          rl.question('', resolve);
        });
        rl.close();
        
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          log.info('Deployment cancelled');
          process.exit(0);
        }
      }
      
      await deployAll(options);
      break;
      
    case 'build':
      buildContracts();
      break;
      
    case 'help':
      showUsage();
      break;
      
    default:
      log.error(`Unknown command: ${options.command}`);
      showUsage();
      process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error(`Unhandled rejection at ${promise}: ${reason}`);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  deployAll,
  buildContracts,
  checkPrerequisites,
  setupIdentity,
  deployContract,
  initializeNFTContract,
  initializeLoanManagerContract,
  initializeLendingPoolContract,
  setupContractPermissions,
  verifyDeployment,
  saveDeploymentInfo,
};
