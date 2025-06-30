require('dotenv').config();
const { ethers } = require('ethers');
const randomUseragent = require('random-useragent');
const axios = require('axios');

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
};

const logger = {
  info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.yellow}[➤] ${msg}${colors.reset}`),
};

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEYS = process.env.PRIVATE_KEYS.split('\n')
  .map(k => k.trim())
  .filter(k => k.length > 0 && k.startsWith('0x'));

const performCheckIn = async (wallet) => {
  try {
    logger.step(`Performing daily check-in for wallet: ${wallet.address}`);

    const message = "pharos";
    const signature = await wallet.signMessage(message);
    logger.step(`Signed message: ${signature}`);

    const loginUrl = `https://api.pharosnetwork.xyz/user/login?address=${wallet.address}&signature=${signature}&invite_code=S6NGMzXSCDBxhnwo`;
    const headers = {
      accept: "application/json, text/plain, */*",
      authorization: "Bearer null",
      "User-Agent": randomUseragent.getRandom(),
      Referer: "https://testnet.pharosnetwork.xyz/",
    };

    const loginResponse = await axios.post(loginUrl, {}, { headers });
    const loginData = loginResponse.data;

    if (loginData.code !== 0 || !loginData.data.jwt) {
      logger.error(`Login failed: ${loginData.msg || 'Unknown error'}`);
      return;
    }

    const jwt = loginData.data.jwt;
    logger.info(`Login successful, JWT: ${jwt}`);

    const checkInUrl = `https://api.pharosnetwork.xyz/sign/in?address=${wallet.address}`;
    const checkInHeaders = { ...headers, authorization: `Bearer ${jwt}` };

    const checkInResponse = await axios.post(checkInUrl, {}, { headers: checkInHeaders });
    const checkInData = checkInResponse.data;

    if (checkInData.code === 0) {
      logger.info(`Check-in successful for ${wallet.address}`);
    } else {
      logger.error(`Check-in failed: ${checkInData.msg || 'Unknown error'}`);
    }
  } catch (error) {
    logger.error(`Check-in error for ${wallet.address}: ${error.message}`);
  }
};

const main = async () => {
  if (!PRIVATE_KEYS.length) {
    logger.error('No private keys found in .env');
    return;
  }

  for (const pk of PRIVATE_KEYS) {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(pk, provider);
    await performCheckIn(wallet);
  }
};

main();
