const axios = require("axios");
const { ethers } = require("ethers");
const randomUseragent = require("random-useragent");
require("dotenv").config();

// Load RPC + keys
const RPC_URL = process.env.RPC_URL || "";
const PRIVATE_KEYS = (process.env.PRIVATE_KEYS || "")
  .split(/\r?\n|,/)
  .map((k) => k.trim())
  .filter((k) => k.startsWith("0x"));

// Pharos Testnet network
const network = {
  chainId: 688689,
  name: "Pharos Testnet",
  rpcUrl: RPC_URL,
};

// Generate unique headers for every request
function makeHeaders(jwt = null) {
  const ua = randomUseragent.getRandom();
  const randHex = (n) => ethers.hexlify(ethers.randomBytes(n));
  const device = Math.random() > 0.5 ? "Windows" : "Android";

  return {
    accept: "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    authorization: jwt ? `Bearer ${jwt}` : "Bearer null",
    Referer: "https://testnet.pharosnetwork.xyz/",
    Origin: "https://testnet.pharosnetwork.xyz",
    "User-Agent": ua,

    // Stronger fingerprint-like headers
    "sec-ch-ua": `"Not.A/Brand";v="99", "Chromium";v="${Math.floor(
      110 + Math.random() * 10
    )}", "Google Chrome";v="${Math.floor(110 + Math.random() * 10)}"`,
    "sec-ch-ua-mobile": device === "Android" ? "?1" : "?0",
    "sec-ch-ua-platform": `"${device}"`,

    // Unique random identifiers per request
    "x-request-id": randHex(8),
    "x-trace-id": randHex(8),
    "x-client-trace-id": randHex(8),

    // Fetch metadata
    "sec-fetch-site": "same-site",
    "sec-fetch-mode": "cors",
    "sec-fetch-dest": "empty",

    // Randomized connection headers
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  };
}

async function claimFaucet(wallet) {
  try {
    console.log(`\n[ Wallet ] ${wallet.address}`);

    // 1. Sign
    console.log(`[+] Signing login message...`);
    const signature = await wallet.signMessage("pharos");

    // 2. Login
    const loginUrl =
      `https://api.pharosnetwork.xyz/user/login?address=${wallet.address}&signature=${signature}&invite_code=S6NGMzXSCDBxhnwo`;

    console.log(`[+] Logging in...`);
    const loginHeaders = makeHeaders();

    const loginRes = await axios.post(loginUrl, null, { headers: loginHeaders });
    const loginData = loginRes.data;

    if (!loginData.data || !loginData.data.jwt) {
      console.log(`[X] Login failed: ${loginData.msg}`);
      return false;
    }

    const jwt = loginData.data.jwt;
    console.log(`[✓] Login OK — JWT received`);

    // 3. Check faucet status
    const statusUrl = `https://api.pharosnetwork.xyz/faucet/status?address=${wallet.address}`;
    const statusHeaders = makeHeaders(jwt);

    console.log(`[+] Checking faucet status...`);
    const statusRes = await axios.get(statusUrl, { headers: statusHeaders });
    const statusData = statusRes.data;

    if (!statusData.data.is_able_to_faucet) {
      console.log(
        `[!] Not eligible until: ${new Date(
          statusData.data.avaliable_timestamp * 1000
        ).toLocaleString()}`
      );
      return false;
    }

    // 4. Claim faucet
    console.log(`[+] Claiming faucet now...`);
    const claimUrl = `https://api.pharosnetwork.xyz/faucet/daily?address=${wallet.address}`;
    const claimHeaders = makeHeaders(jwt);

    const claimRes = await axios.post(claimUrl, null, { headers: claimHeaders });
    const claimData = claimRes.data;

    if (claimData.code === 0) {
      console.log(`[✓] Faucet claimed → ${wallet.address}`);
      return true;
    }

    console.log(`[X] Claim failed: ${claimData.msg}`);
    return false;
  } catch (err) {
    console.log(`[ERROR] ${err.message}`);
    return false;
  }
}

async function main() {
  if (!PRIVATE_KEYS.length) {
    console.log("No private keys found in .env");
    return;
  }

  for (const key of PRIVATE_KEYS) {
    const provider = new ethers.JsonRpcProvider(network.rpcUrl, {
      chainId: network.chainId,
      name: network.name,
    });

    const wallet = new ethers.Wallet(key, provider);
    await claimFaucet(wallet);
  }

  console.log("\nAll faucets processed.");
}

main();
