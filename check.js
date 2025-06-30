require('dotenv').config();
const { ethers } = require('ethers');
const randomUseragent = require('random-useragent');
const axios = require('axios');

// === Logger ===
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
  step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[!] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[+] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  wallet: (msg) => console.log(`${colors.yellow}[➤] ${msg}${colors.reset}`),
};

// === Config ===
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEYS = process.env.PRIVATE_KEYS.split('\n')
  .map(k => k.trim())
  .filter(k => k.startsWith('0x'));

const networkConfig = {
  name: 'Pharos Testnet',
  chainId: 688688,
  rpcUrl: RPC_URL,
};

// === Functions ===

const performCheckIn = async (wallet) => {
  try {
    logger.step(`Performing daily check-in for wallet: ${wallet.address}`);

    const message = "pharos";
    const signature = await wallet.signMessage(message);
    logger.step(`Signed message: ${signature}`);

    const userAgent = randomUseragent.getRandom();
    const loginUrl = `https://api.pharosnetwork.xyz/user/login?address=${wallet.address}&signature=${signature}&invite_code=S6NGMzXSCDBxhnwo`;

    const headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.8",
      authorization: "Bearer null",
      "User-Agent": userAgent,
      Referer: "https://testnet.pharosnetwork.xyz/",
    };

    logger.loading('Sending login request...');
    const loginResponse = await axios.post(loginUrl, null, { headers });
    const loginData = loginResponse.data;

    if (loginData.code !== 0 || !loginData.data.jwt) {
      logger.error(`Login failed: ${loginData.msg || 'Unknown error'}`);
      return null;
    }

    const jwt = loginData.data.jwt;
    logger.success(`Login successful, JWT: ${jwt}`);

    const checkInUrl = `https://api.pharosnetwork.xyz/sign/in?address=${wallet.address}`;
    headers.authorization = `Bearer ${jwt}`;
    headers["User-Agent"] = randomUseragent.getRandom(); // Unique for check-in

    logger.loading('Sending check-in request...');
    const checkInResponse = await axios.post(checkInUrl, null, { headers });
    const checkInData = checkInResponse.data;

    if (checkInData.code === 0) {
      logger.success(`Check-in successful for ${wallet.address}`);
      return jwt;
    } else {
      logger.warn(`Check-in failed: ${checkInData.msg || 'Already checked in?'}`);
      return jwt;
    }
  } catch (error) {
    logger.error(`Check-in failed for ${wallet.address}: ${error.response?.data?.msg || error.message}`);
    return null;
  }
};

const getUserInfo = async (wallet, jwt) => {
  try {
    const userAgent = randomUseragent.getRandom();
    logger.step(`Fetching user info for wallet: ${wallet.address}`);
    const profileUrl = `https://api.pharosnetwork.xyz/user/profile?address=${wallet.address}`;
    
    const headers = {
      accept: "application/json, text/plain, */*",
      authorization: `Bearer ${jwt}`,
      "User-Agent": userAgent,
      Referer: "https://testnet.pharosnetwork.xyz/",
    };

    logger.loading('Sending profile request...');
    const response = await axios.get(profileUrl, { headers });
    const data = response.data;

    if (data.code === 0 && data.data.user_info) {
      const user = data.data.user_info;
      logger.info(`User ID: ${user.ID}`);
      logger.info(`Task Points: ${user.TaskPoints}`);
      logger.info(`Total Points: ${user.TotalPoints}`);
    } else {
      logger.error(`Failed to fetch user info: ${data.msg || 'Unknown error'}`);
    }
  } catch (error) {
    logger.error(`Failed to get user info: ${error.response?.data?.msg || error.message}`);
  }
};

// === Main Runner ===

const main = async () => {
  for (const pk of PRIVATE_KEYS) {
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl, {
      chainId: networkConfig.chainId,
      name: networkConfig.name,
    });
    const wallet = new ethers.Wallet(pk, provider);

    logger.wallet(`Using wallet: ${wallet.address}`);
    const jwt = await performCheckIn(wallet);
    if (jwt) {
      await getUserInfo(wallet, jwt);
    }
  }
};

main().catch(e => logger.error(`Fatal: ${e.message}`));
