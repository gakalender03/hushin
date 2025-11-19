require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const randomUseragent = require('random-useragent');
const axios = require('axios');
const prompt = require('prompt-sync')({ sigint: true });

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
};

const logger = {
  info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  wallet: (msg) => console.log(`${colors.yellow}[➤] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[!] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[+] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
  user: (msg) => console.log(`\n${colors.white}[➤] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log('-------------------------------------------------');
    console.log(' Pharos Testnet Auto Bot - Airdrop Insiders');
    console.log('-------------------------------------------------');
    console.log(`${colors.reset}\n`);
  },
};

// ----------------------
// FIXED GAS HANDLER
// ----------------------
async function buildGasOptions(provider) {
  const feeData = await provider.getFeeData();

  let gas = {};

  if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
    gas.maxFeePerGas = feeData.maxFeePerGas;
    gas.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
  } else {
    gas.gasPrice = feeData.gasPrice || ethers.parseUnits('1', 'gwei');
  }

  return gas;
}
// ----------------------

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEYS = process.env.PRIVATE_KEYS.split('\n')
  .map(k => k.trim())
  .filter(k => k.length > 0 && k.startsWith('0x'));

const networkConfig = {
  name: 'Pharos Testnet',
  chainId: 688688,
  rpcUrl: RPC_URL,
  currencySymbol: 'PHRS',
};

const tokens = {
  USDC: '0xad902cf99c2de2f1ba5ec4d642fd7e49cae9ee37',
  WPHRS: '0x76aaada469d23216be5f7c596fa25f282ff9b364',
  USDT: '0xed59de2d7ad9c043442e381231ee3646fc3c2939',
  POSITION_MANAGER: '0xF8a1D4FF0f9b9Af7CE58E1fc1833688F3BFd6115',
};

const poolAddresses = {
  USDC_WPHRS: '0x0373a059321219745aee4fad8a942cf088be3d0e',
  USDT_WPHRS: '0x70118b6eec45329e0534d849bc3e588bb6752527',
};

const contractAddress = '0x1a4de519154ae51200b0ad7c90f7fac75547888a';

const tokenDecimals = {
  WPHRS: 18,
  USDC: 6,
  USDT: 6,
};

const contractAbi = [
  {
    inputs: [
      { internalType: 'uint256', name: 'collectionAndSelfcalls', type: 'uint256' },
      { internalType: 'bytes[]', name: 'data', type: 'bytes[]' },
    ],
    name: 'multicall',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

const erc20Abi = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function decimals() view returns (uint8)',
  'function deposit() public payable',
  'function withdraw(uint256 wad) public',
];

const positionManagerAbi = [
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'token0', type: 'address' },
          { internalType: 'address', name: 'token1', type: 'address' },
          { internalType: 'uint24', name: 'fee', type: 'uint24' },
          { internalType: 'int24', name: 'tickLower', type: 'int24' },
          { internalType: 'int24', name: 'tickUpper', type: 'int24' },
          { internalType: 'uint256', name: 'amount0Desired', type: 'uint256' },
          { internalType: 'uint256', name: 'amount1Desired', type: 'uint256' },
          { internalType: 'uint256', name: 'amount0Min', type: 'uint256' },
          { internalType: 'uint256', name: 'amount1Min', type: 'uint256' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
        ],
        internalType: 'struct INonfungiblePositionManager.MintParams',
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'mint',
    outputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'uint128', name: 'liquidity', type: 'uint128' },
      { internalType: 'uint256', name: 'amount0', type: 'uint256' },
      { internalType: 'uint256', name: 'amount1', type: 'uint256' },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
];

const pairOptions = [
  { id: 1, from: 'WPHRS', to: 'USDC', amount: 0.00001 },
  { id: 2, from: 'WPHRS', to: 'USDT', amount: 0.00001 },
  { id: 3, from: 'USDC', to: 'WPHRS', amount: 0.00001 },
  { id: 4, from: 'USDT', to: 'WPHRS', amount: 0.00001 },
  { id: 5, from: 'USDC', to: 'USDT', amount: 0.00001 },
  { id: 6, from: 'USDT', to: 'USDC', amount: 0.00001 },
];

const lpOptions = [
  { id: 1, token0: 'WPHRS', token1: 'USDC', amount0: 0.0001, amount1: 0.0001, fee: 3000 },
  { id: 2, token0: 'WPHRS', token1: 'USDT', amount0: 0.0001, amount1: 0.0001, fee: 3000 },
];
// ----------------------
// UTIL: Wait for tx receipt with retries
// ----------------------
const waitForTransactionWithRetry = async (provider, txHash, maxRetries = 5, baseDelayMs = 1000) => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (receipt) {
        return receipt;
      }
      logger.warn(`Transaction receipt not found for ${txHash}, retrying (${retries + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, baseDelayMs * Math.pow(2, retries)));
      retries++;
    } catch (error) {
      logger.error(`Error fetching transaction receipt for ${txHash}: ${error.message}`);
      if (error.code === -32008) {
        logger.warn(`RPC error -32008, retrying (${retries + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, baseDelayMs * Math.pow(2, retries)));
        retries++;
      } else {
        throw error;
      }
    }
  }
  throw new Error(`Failed to get transaction receipt for ${txHash} after ${maxRetries} retries`);
};

// ----------------------
// CHECK BALANCE + APPROVAL (uses buildGasOptions)
// ----------------------
const checkBalanceAndApproval = async (wallet, tokenAddress, amount, decimals, spender) => {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, wallet);
    const balance = await tokenContract.balanceOf(wallet.address);
    const required = ethers.parseUnits(amount.toString(), decimals);

    if (balance < required) {
      logger.warn(
        `Skipping: Insufficient ${Object.keys(tokenDecimals).find(key => tokenDecimals[key] === decimals)} balance: ${ethers.formatUnits(balance, decimals)} < ${amount}`
      );
      return false;
    }

    const allowance = await tokenContract.allowance(wallet.address, spender);
    if (allowance < required) {
      logger.step(`Approving ${amount} tokens for ${spender}...`);
      try {
        // estimate gas for approve (keep safe margin)
        let estimatedGas;
        try {
          estimatedGas = await tokenContract.approve.estimateGas(spender, ethers.MaxUint256);
        } catch (err) {
          // fallback to provider.estimateGas if direct estimation fails
          estimatedGas = await wallet.provider.estimateGas({
            to: tokenAddress,
            data: tokenContract.interface.encodeFunctionData('approve', [spender, ethers.MaxUint256]),
          });
        }

        const gasOpts = await buildGasOptions(wallet.provider);
        const txOptions = {
          gasLimit: Math.ceil(Number(estimatedGas) * 1.2),
          ...gasOpts,
        };

        const approveTx = await tokenContract.approve(spender, ethers.MaxUint256, txOptions);
        const receipt = await waitForTransactionWithRetry(wallet.provider, approveTx.hash);
        logger.success('Approval completed');
      } catch (error) {
        logger.error(`Approval failed: ${error.message}`);
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error(`Balance/approval check failed: ${error.message}`);
    return false;
  }
};

// ----------------------
// MULTICALL DATA HELPER
// ----------------------
const getMulticallData = (pair, amount, walletAddress) => {
  try {
    const decimals = tokenDecimals[pair.from];
    const scaledAmount = ethers.parseUnits(amount.toString(), decimals);

    const data = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'address', 'uint256', 'address', 'uint256', 'uint256', 'uint256'],
      [
        tokens[pair.from],
        tokens[pair.to],
        500,
        walletAddress,
        scaledAmount,
        0,
        0,
      ]
    );

    return [ethers.concat(['0x04e45aaf', data])];
  } catch (error) {
    logger.error(`Failed to generate multicall data: ${error.message}`);
    return [];
  }
};

// ----------------------
// PERFORM SWAP (multicall) - uses buildGasOptions
// ----------------------
const performSwap = async (wallet, provider, index, jwt) => {
  try {
    const pair = pairOptions[Math.floor(Math.random() * pairOptions.length)];
    const amount = pair.amount;
    logger.step(
      `Preparing swap ${index + 1}: ${pair.from} -> ${pair.to} (${amount} ${pair.from})`
    );

    const decimals = tokenDecimals[pair.from];
    const tokenContract = new ethers.Contract(tokens[pair.from], erc20Abi, provider);
    const balance = await tokenContract.balanceOf(wallet.address);
    const required = ethers.parseUnits(amount.toString(), decimals);

    if (balance < required) {
      logger.warn(
        `Skipping swap ${index + 1}: Insufficient ${pair.from} balance: ${ethers.formatUnits(
          balance,
          decimals
        )} < ${amount}`
      );
      return;
    }

    if (!(await checkBalanceAndApproval(wallet, tokens[pair.from], amount, decimals, contractAddress))) {
      return;
    }

    const contract = new ethers.Contract(contractAddress, contractAbi, wallet);
    const multicallData = getMulticallData(pair, amount, wallet.address);

    if (!multicallData || multicallData.length === 0 || multicallData.some(data => !data || data === '0x')) {
      logger.error(`Invalid or empty multicall data for ${pair.from} -> ${pair.to}`);
      return;
    }

    const deadline = Math.floor(Date.now() / 1000) + 300;
    let estimatedGas;
    try {
      estimatedGas = await contract.multicall.estimateGas(deadline, multicallData, { from: wallet.address });
    } catch (error) {
      logger.error(`Gas estimation failed for swap ${index + 1}: ${error.message}`);
      // try a generic estimate fallback
      const encoded = contract.interface.encodeFunctionData('multicall', [deadline, multicallData]);
      estimatedGas = await provider.estimateGas({ to: contractAddress, data: encoded, from: wallet.address });
    }

    const gasOpts = await buildGasOptions(provider);
    const txOptions = {
      gasLimit: Math.ceil(Number(estimatedGas) * 1.2),
      ...gasOpts,
    };

    const tx = await contract.multicall(deadline, multicallData, txOptions);

    logger.loading(`Swap transaction ${index + 1} sent, waiting for confirmation...`);
    const receipt = await waitForTransactionWithRetry(provider, tx.hash);
    logger.success(`Swap ${index + 1} completed: ${receipt.hash}`);
    logger.step(`Explorer: https://testnet.pharosscan.xyz/tx/${receipt.hash}`);

    await verifyTask(wallet, jwt, receipt.hash);
  } catch (error) {
    logger.error(`Swap ${index + 1} failed: ${error.message}`);
    if (error.transaction) {
      logger.error(`Transaction details: ${JSON.stringify(error.transaction, null, 2)}`);
    }
    if (error.receipt) {
      logger.error(`Receipt: ${JSON.stringify(error.receipt, null, 2)}`);
    }
  }
};

// ----------------------
// TRANSFER PHRS - uses buildGasOptions
// ----------------------
const transferPHRS = async (wallet, provider, index, jwt) => {
  try {
    const amount = 0.000001;
    const randomWallet = ethers.Wallet.createRandom();
    const toAddress = randomWallet.address;
    logger.step(`Preparing PHRS transfer ${index + 1}: ${amount} PHRS to ${toAddress}`);

    const balance = await provider.getBalance(wallet.address);
    const required = ethers.parseEther(amount.toString());

    if (balance < required) {
      logger.warn(`Skipping transfer ${index + 1}: Insufficient PHRS balance: ${ethers.formatEther(balance)} < ${amount}`);
      return;
    }

    const gasOpts = await buildGasOptions(provider);
    const txOptions = {
      to: toAddress,
      value: required,
      gasLimit: 21000,
      ...gasOpts,
    };

    const tx = await wallet.sendTransaction(txOptions);

    logger.loading(`Transfer transaction ${index + 1} sent, waiting for confirmation...`);
    const receipt = await waitForTransactionWithRetry(provider, tx.hash);
    logger.success(`Transfer ${index + 1} completed: ${receipt.hash}`);
    logger.step(`Explorer: https://testnet.pharosscan.xyz/tx/${receipt.hash}`);

    await verifyTask(wallet, jwt, receipt.hash);
  } catch (error) {
    logger.error(`Transfer ${index + 1} failed: ${error.message}`);
    if (error.transaction) {
      logger.error(`Transaction details: ${JSON.stringify(error.transaction, null, 2)}`);
    }
    if (error.receipt) {
      logger.error(`Receipt: ${JSON.stringify(error.receipt, null, 2)}`);
    }
  }
};

// ----------------------
// WRAP PHRS -> WPHRS - uses buildGasOptions
// ----------------------
const wrapPHRS = async (wallet, provider, index, jwt) => {
  try {
    const minAmount = 0.000001;
    const maxAmount = 0.000005;
    const amount = minAmount + Math.random() * (maxAmount - minAmount);
    const amountWei = ethers.parseEther(amount.toFixed(6).toString());
    logger.step(`Preparing wrap PHRS ${index + 1}: ${amount.toFixed(6)} PHRS to WPHRS`);

    const balance = await provider.getBalance(wallet.address);
    if (balance < amountWei) {
      logger.warn(`Skipping wrap ${index + 1}: Insufficient PHRS balance: ${ethers.formatEther(balance)} < ${amount.toFixed(6)}`);
      return;
    }

    const wphrsContract = new ethers.Contract(tokens.WPHRS, erc20Abi, wallet);
    let estimatedGas;
    try {
      estimatedGas = await wphrsContract.deposit.estimateGas({ value: amountWei });
    } catch (error) {
      logger.error(`Gas estimation failed for wrap ${index + 1}: ${error.message}`);
      // fallback to provider estimate
      const encoded = wphrsContract.interface.encodeFunctionData('deposit', []);
      estimatedGas = await provider.estimateGas({ to: tokens.WPHRS, data: encoded, from: wallet.address, value: amountWei });
    }

    const gasOpts = await buildGasOptions(provider);
    const txOptions = {
      value: amountWei,
      gasLimit: Math.ceil(Number(estimatedGas) * 1.2),
      ...gasOpts,
    };

    const tx = await wphrsContract.deposit(txOptions);

    logger.loading(`Wrap transaction ${index + 1} sent, waiting for confirmation...`);
    const receipt = await waitForTransactionWithRetry(provider, tx.hash);
    logger.success(`Wrap ${index + 1} completed: ${receipt.hash}`);
    logger.step(`Explorer: https://testnet.pharosscan.xyz/tx/${receipt.hash}`);

    await verifyTask(wallet, jwt, receipt.hash);
  } catch (error) {
    logger.error(`Wrap ${index + 1} failed: ${error.message}`);
    if (error.transaction) {
      logger.error(`Transaction details: ${JSON.stringify(error.transaction, null, 2)}`);
    }
    if (error.receipt) {
      logger.error(`Receipt: ${JSON.stringify(error.receipt, null, 2)}`);
    }
  }
};

// ----------------------
// ADD LIQUIDITY (positionManager.mint) - uses buildGasOptions
// ----------------------
const addLiquidity = async (wallet, provider, index, jwt) => {
  try {
    const pair = lpOptions[Math.floor(Math.random() * lpOptions.length)];
    const amount0 = pair.amount0;
    const amount1 = pair.amount1;
    logger.step(
      `Preparing Liquidity Add ${index + 1}: ${pair.token0}/${pair.token1} (${amount0} ${pair.token0}, ${amount1} ${pair.token1})`
    );

    const decimals0 = tokenDecimals[pair.token0];
    const amount0Wei = ethers.parseUnits(amount0.toString(), decimals0);
    if (!(await checkBalanceAndApproval(wallet, tokens[pair.token0], amount0, decimals0, tokens.POSITION_MANAGER))) {
      return;
    }

    const decimals1 = tokenDecimals[pair.token1];
    const amount1Wei = ethers.parseUnits(amount1.toString(), decimals1);
    if (!(await checkBalanceAndApproval(wallet, tokens[pair.token1], amount1, decimals1, tokens.POSITION_MANAGER))) {
      return;
    }

    const positionManager = new ethers.Contract(tokens.POSITION_MANAGER, positionManagerAbi, wallet);

    const deadline = Math.floor(Date.now() / 1000) + 600;
    const tickLower = -60000;
    const tickUpper = 60000;

    const mintParams = {
      token0: tokens[pair.token0],
      token1: tokens[pair.token1],
      fee: pair.fee,
      tickLower,
      tickUpper,
      amount0Desired: amount0Wei,
      amount1Desired: amount1Wei,
      amount0Min: 0,
      amount1Min: 0,
      recipient: wallet.address,
      deadline,
    };

    let estimatedGas;
    try {
      estimatedGas = await positionManager.mint.estimateGas(mintParams, { from: wallet.address });
    } catch (error) {
      logger.error(`Gas estimation failed for LP ${index + 1}: ${error.message}`);
      // fallback encode + provider estimate
      const encoded = positionManager.interface.encodeFunctionData('mint', [mintParams]);
      estimatedGas = await provider.estimateGas({ to: tokens.POSITION_MANAGER, data: encoded, from: wallet.address, value: 0 });
    }

    const gasOpts = await buildGasOptions(provider);
    const txOptions = {
      gasLimit: Math.ceil(Number(estimatedGas) * 1.2),
      ...gasOpts,
    };

    const tx = await positionManager.mint(mintParams, txOptions);

    logger.loading(`Liquidity Add ${index + 1} sent, waiting for confirmation...`);
    const receipt = await waitForTransactionWithRetry(provider, tx.hash);
    logger.success(`Liquidity Add ${index + 1} completed: ${receipt.hash}`);
    logger.step(`Explorer: https://testnet.pharosscan.xyz/tx/${receipt.hash}`);

    await verifyTask(wallet, jwt, receipt.hash);
  } catch (error) {
    logger.error(`Liquidity Add ${index + 1} failed: ${error.message}`);
    if (error.transaction) {
      logger.error(`Transaction details: ${JSON.stringify(error.transaction, null, 2)}`);
    }
    if (error.receipt) {
      logger.error(`Receipt: ${JSON.stringify(error.receipt, null, 2)}`);
    }
  }
};

// ----------------------
// USER API HELPERS: getUserInfo, verifyTask
// (these use axios; unchanged except for robust error handling)
// ----------------------
const getUserInfo = async (wallet, jwt) => {
  try {
    logger.user(`Fetching user info for wallet: ${wallet.address}`);
    const profileUrl = `https://api.pharosnetwork.xyz/user/profile?address=${wallet.address}`;
    const headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.8",
      authorization: `Bearer ${jwt}`,
      "User-Agent": randomUseragent.getRandom(),
      Referer: "https://testnet.pharosnetwork.xyz/",
    };

    const axiosConfig = {
      method: 'get',
      url: profileUrl,
      headers,
    };

    logger.loading('Fetching user profile...');
    const response = await axios(axiosConfig);
    const data = response.data;

    if (data.code !== 0 || !data.data.user_info) {
      logger.error(`Failed to fetch user info: ${data.msg || 'Unknown error'}`);
      return;
    }

    const userInfo = data.data.user_info;
    logger.info(`User ID: ${userInfo.ID}`);
    logger.info(`Task Points: ${userInfo.TaskPoints}`);
    logger.info(`Total Points: ${userInfo.TotalPoints}`);
  } catch (error) {
    logger.error(`Failed to fetch user info: ${error.message}`);
  }
};

const verifyTask = async (wallet, jwt, txHash) => {
  try {
    logger.step(`Verifying task ID 103 for transaction: ${txHash}`);
    const verifyUrl = `https://api.pharosnetwork.xyz/task/verify?address=${wallet.address}&task_id=103&tx_hash=${txHash}`;
    const headers = {
      accept: "application/json, text/plain, */*",
      authorization: `Bearer ${jwt}`,
      "User-Agent": randomUseragent.getRandom(),
      Referer: "https://testnet.pharosnetwork.xyz/",
    };

    const axiosConfig = {
      method: 'post',
      url: verifyUrl,
      headers,
    };

    logger.loading('Sending task verification request...');
    const response = await axios(axiosConfig);
    const data = response.data;

    if (data.code === 0 && data.data.verified) {
      logger.success(`Task ID 103 verified successfully for ${txHash}`);
      return true;
    } else {
      logger.warn(`Task verification failed: ${data.msg || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    logger.error(`Task verification failed for ${txHash}: ${error.message}`);
    return false;
  }
};
// ----------------------
// FAUCET
// ----------------------
const claimFaucet = async (wallet, jwt) => {
  try {
    logger.step(`Requesting faucet for wallet: ${wallet.address}`);

    const faucetUrl = `https://api.pharosnetwork.xyz/faucet/claim?address=${wallet.address}`;
    const headers = {
      accept: "application/json, text/plain, */*",
      authorization: `Bearer ${jwt}`,
      "User-Agent": randomUseragent.getRandom(),
      Referer: "https://testnet.pharosnetwork.xyz/",
    };

    const axiosConfig = {
      method: 'post',
      url: faucetUrl,
      headers,
    };

    logger.loading(`Sending faucet request...`);
    const response = await axios(axiosConfig);
    const data = response.data;

    if (data.code === 0 && data.data.status === "success") {
      logger.success(`Faucet claim successful.`);
      logger.step(`TX: https://testnet.pharosnetwork.xyz/tx/${data.data.tx_hash}`);
    } else {
      logger.warn(`Faucet claim not available: ${data.msg || 'Unknown reason'}`);
    }
  } catch (error) {
    logger.error(`Faucet request failed: ${error.message}`);
  }
};

// ----------------------
// DAILY CHECK-IN
// ----------------------
const doDailyCheckIn = async (wallet, jwt) => {
  try {
    logger.step(`Performing daily check-in for wallet: ${wallet.address}`);

    const checkInUrl = `https://api.pharosnetwork.xyz/task/checkin?address=${wallet.address}`;
    const headers = {
      accept: "application/json, text/plain, */*",
      authorization: `Bearer ${jwt}`,
      "User-Agent": randomUseragent.getRandom(),
      Referer: "https://testnet.pharosnetwork.xyz/",
    };

    const axiosConfig = {
      method: 'post',
      url: checkInUrl,
      headers,
    };

    logger.loading(`Sending daily check-in request...`);
    const response = await axios(axiosConfig);
    const data = response.data;

    if (data.code === 0 && data.data.checked_in) {
      logger.success(`Daily check-in completed.`);
    } else {
      logger.warn(`Daily check-in failed: ${data.msg || 'Unknown reason'}`);
    }
  } catch (error) {
    logger.error(`Daily check-in failed: ${error.message}`);
  }
};

// ----------------------
// COUNTDOWN
// ----------------------
const countdownTimer = async (seconds) => {
  const colorsList = ['\x1b[35m', '\x1b[36m'];
  for (let i = seconds; i >= 1; i--) {
    const color = colorsList[Math.floor(Math.random() * colorsList.length)];
    process.stdout.write(`\r${color}⏳ Next wallet in ${i} seconds...${colors.reset}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('');
};

// ----------------------
// MAIN ACTION LOOP
// ----------------------
const runActions = async (wallet, provider, jwt) => {
  const actions = [
    async (index) => await performSwap(wallet, provider, index, jwt),
    async (index) => await transferPHRS(wallet, provider, index, jwt),
    async (index) => await wrapPHRS(wallet, provider, index, jwt),
    async (index) => await addLiquidity(wallet, provider, index, jwt),
  ];

  for (let i = 0; i < actions.length; i++) {
    try {
      await actions[i](i);

      const delay = (2 + Math.floor(Math.random() * 60)) * 1000;
      logger.step(`Waiting ${delay / 1000} seconds before next action...`);
      await new Promise(r => setTimeout(r, delay));
    } catch (e) {
      logger.error(`Action ${i + 1} failed: ${e.message}`);
      continue;
    }
  }
};

// ----------------------
// GET JWT FOR USER
// ----------------------
const getJwtForAddress = async (wallet) => {
  try {
    const url = `https://api.pharosnetwork.xyz/get_jwt?address=${wallet.address}`;

    const headers = {
      accept: "application/json, text/plain, */*",
      "User-Agent": randomUseragent.getRandom(),
      Referer: "https://testnet.pharosnetwork.xyz/",
    };

    logger.loading("Requesting JWT token...");
    const response = await axios.get(url, { headers });

    if (response.data.code === 0 && response.data.data.jwt) {
      logger.success("JWT obtained.");
      return response.data.data.jwt;
    } else {
      logger.error(`Failed to retrieve JWT: ${response.data.msg || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    logger.error(`JWT error: ${error.message}`);
    return null;
  }
};

// ----------------------
// MAIN EXECUTION
// ----------------------
const main = async () => {
  logger.banner();

  logger.user(`Loaded ${PRIVATE_KEYS.length} wallets.`);
  logger.user(`RPC Endpoint: ${RPC_URL}`);
  console.log("");

  for (let index = 0; index < PRIVATE_KEYS.length; index++) {
    const privateKey = PRIVATE_KEYS[index];
    logger.wallet(`Using wallet ${index + 1}/${PRIVATE_KEYS.length}`);

    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const wallet = new ethers.Wallet(privateKey, provider);
      logger.info(`Wallet address: ${wallet.address}`);

      // JWT
      const jwt = await getJwtForAddress(wallet);
      if (!jwt) {
        logger.error("Skipping wallet: JWT retrieval failed.");
        continue;
      }

      // Run profile + check-in
      await getUserInfo(wallet, jwt);
      await doDailyCheckIn(wallet, jwt);

      // Faucet
      const walletBalance = await provider.getBalance(wallet.address);
      if (walletBalance < ethers.parseEther("0.0001")) {
        logger.warn("Low PHRS balance, attempting faucet...");
        await claimFaucet(wallet, jwt);
      }

      // Run all 4 actions (swap, transfer, wrap, LP)
      await runActions(wallet, provider, jwt);

      // Cooldown before next wallet
      if (index < PRIVATE_KEYS.length - 1) {
        const cooldownSeconds = 60 + Math.floor(Math.random() * 60);
        logger.step(`Cooldown: ${cooldownSeconds} seconds before next wallet.`);
        await countdownTimer(cooldownSeconds);
      }

    } catch (error) {
      logger.error(`Wallet ${index + 1} failed: ${error.message}`);
      continue;
    }
  }

  logger.success("All wallets completed.");
};

// Start bot
main();

