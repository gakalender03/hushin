require('dotenv').config();
const { ethers } = require('ethers');
const crypto = require('crypto');
const axios = require('axios');

// === Logger ===
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  white: '\x1b[37m',
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
  chainId: 688689,
  rpcUrl: RPC_URL,
};

// === Human Header Generator ===

const UA_LIST = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
];

const REFERRERS = [
  "https://google.com/",
  "https://youtube.com/",
  "https://twitter.com/",
  "https://testnet.pharosnetwork.xyz/",
  "https://facebook.com/",
];

const LANGS = [
  "en-US,en;q=0.9",
  "en-GB,en;q=0.9",
  "fr-FR,fr;q=0.8,en;q=0.6",
  "es-ES,es;q=0.9,en;q=0.7",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateFakeJWT() {
  const base64url = (buf) => buf.toString("base64url").replace(/=/g, "");
  
  const header = base64url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = base64url(crypto.randomBytes(24));
  const signature = base64url(crypto.randomBytes(32));

  return `${header}.${payload}.${signature}`;
}

function generateHeaders(authToken = null) {
  const ua = pick(UA_LIST);

  return {
    "User-Agent": ua,
    accept: "application/json, text/plain, */*",
    "accept-language": pick(LANGS),
    "accept-encoding": "gzip, deflate, br",
   // referer: pick(REFERRERS),
    connection: "keep-alive",
    "sec-fetch-site": "same-origin",
    "sec-fetch-mode": "navigate",
    "sec-fetch-dest": "document",
    "sec-fetch-user": "?1",
    authorization: authToken ? `Bearer ${authToken}` : `Bearer ${generateFakeJWT()}`
  };
}

// === Functions ===

const performCheckIn = async (wallet) => {
  try {
    logger.step(`Performing check-in for wallet: ${wallet.address}`);

    const message = "pharos";
    const signature = await wallet.signMessage(message);

    const loginUrl =
      `https://api.pharosnetwork.xyz/user/login?address=${wallet.address}&signature=${signature}&invite_code=S6NGMzXSCDBxhnwo`;

    const headers = generateHeaders(); // Human perfect headers

    logger.loading("Sending login request...");
    const loginResponse = await axios.post(loginUrl, null, { headers });
    const loginData = loginResponse.data;

    if (loginData.code !== 0 || !loginData.data.jwt) {
      logger.error(`Login failed: ${loginData.msg || "Unknown error"}`);
      return null;
    }

    const jwt = loginData.data.jwt;
    logger.success(`Login successful`);

    // CHECK-IN
    const checkInUrl = `https://api.pharosnetwork.xyz/sign/in?address=${wallet.address}`;
    const checkHeaders = generateHeaders(jwt);

    logger.loading("Sending check-in request...");
    const checkInResponse = await axios.post(checkInUrl, null, { headers: checkHeaders });
    const checkInData = checkInResponse.data;

    if (checkInData.code === 0) {
      logger.success(`Check-in successful`);
    } else {
      logger.warn(`Check-in failed: ${checkInData.msg}`);
    }

    return jwt;

  } catch (err) {
    logger.error(`Check-in failed: ${err.response?.data?.msg || err.message}`);
    return null;
  }
};

const getUserInfo = async (wallet, jwt) => {
  try {
    logger.step(`Fetching user info for wallet: ${wallet.address}`);

    const url = `https://api.pharosnetwork.xyz/user/profile?address=${wallet.address}`;
    const headers = generateHeaders(jwt);

    const res = await axios.get(url, { headers });
    const data = res.data;

    if (data.code === 0) {
      const u = data.data.user_info;
      logger.info(`User ID: ${u.ID}`);
      logger.info(`Task Points: ${u.TaskPoints}`);
      logger.info(`Total Points: ${u.TotalPoints}`);
    } else {
      logger.error(`Failed to fetch profile: ${data.msg}`);
    }
  } catch (err) {
    logger.error(`Profile error: ${err.response?.data?.msg || err.message}`);
  }
};

// === Main Runner ===

const main = async () => {
  for (const pk of PRIVATE_KEYS) {
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    const wallet = new ethers.Wallet(pk, provider);

    logger.wallet(`Using wallet: ${wallet.address}`);

    const jwt = await performCheckIn(wallet);
    if (jwt) await getUserInfo(wallet, jwt);

    await new Promise((r) => setTimeout(r, 1000));
  }
};

main().catch((e) => logger.error(`Fatal: ${e.message}`));
