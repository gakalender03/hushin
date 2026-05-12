const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const WALLET =
  '0x021e614b301706DD064C48A3A540a68Dc1542188';

const CAPTCHA_URL =
  'https://cap.dachain.tech/81249457f9/redeem';

const FAUCET_URL =
  'https://faucet.dachain.tech/backend/dispense.php';

const FAUCET_HOME =
  'https://faucet.dachain.tech/';

const jar = new CookieJar();

const client = wrapper(
  axios.create({
    jar,
    withCredentials: true,
    timeout: 15000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',

      'Content-Type': 'application/json',
      Accept: '*/*',
      Origin: 'https://faucet.dachain.tech',
      Referer: 'https://faucet.dachain.tech/',
      DNT: '1',

      'sec-ch-ua':
        '"Not-A.Brand";v="99", "Chromium";v="124"',
      'sec-ch-ua-platform': '"Android"',
      'sec-ch-ua-mobile': '?1'
    }
  })
);

function logAxiosError(err) {
  console.error('\n=== ERROR ===');

  if (err.response) {
    console.error('Status:', err.response.status);
    console.error(
      'Response:',
      JSON.stringify(err.response.data, null, 2)
    );
  } else {
    console.error(err.message);
  }
}

async function claimFaucet({
  captchaToken,
  solutions,
  instr
}) {
  try {
    // Establish browser-like session/cookies
    await client.get(FAUCET_HOME);

    if (!captchaToken) {
      throw new Error(
        'Missing captchaToken'
      );
    }

    if (!solutions?.length) {
      throw new Error(
        'Missing solutions array'
      );
    }

    if (!instr) {
      throw new Error(
        'Missing instr object'
      );
    }

    // Step 1 — redeem captcha
    const captchaPayload = {
      instr,
      solutions,
      token: captchaToken
    };

    console.log(
      'Redeeming challenge...'
    );

    const redeemRes = await client.post(
      CAPTCHA_URL,
      captchaPayload
    );

    console.log(
      'Redeem response:',
      redeemRes.data
    );

    if (
      !redeemRes.data?.success ||
      !redeemRes.data?.token
    ) {
      throw new Error(
        'Captcha redeem failed'
      );
    }

    // Step 2 — claim faucet
    const faucetPayload = {
      address: WALLET,
      'cap-response':
        redeemRes.data.token
    };

    console.log(
      'Claiming faucet...'
    );

    const faucetRes = await client.post(
      FAUCET_URL,
      faucetPayload
    );

    console.log(
      'Faucet response:',
      faucetRes.data
    );
  } catch (err) {
    logAxiosError(err);
  }
}

// Example usage
claimFaucet({
  captchaToken:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuIjoiZDRiY2M0YjI3ZDNjMWNlZjhmMDY4MjUwZmE5ZDc5ZjdiNzUyMzQzY2RmZjY0YzdmNjciLCJjIjo4MCwicyI6MzIsImQiOjQsImV4cCI6MTc3ODU2ODgyMjA1NSwiaWF0IjoxNzc4NTY3OTIyMDU1LCJzayI6IjgxMjQ5NDU3ZjkiLCJlaSI6Ik56MVRpME9wS1dlcVdTQ2tWV3luZkRWWjVENC16ckprN0hOakRaQnU1eTZaZkdxNXIyR0EzUFZOQWxtM1Axam1XZWpLd3ZmYVZpTVdFY20zTDFkTWVQdjVNNWljbHoyMHdIeExlMXZ3eW9RUUF1bDNrN2NYb18tTW9Qall4R2EtR003ZFRpWkh1Q2Q1TGJUQmswNXZmQklYeTFxSVNUeEFYcUt1NXdlZWlsdGczaWo4NEw2UHluM2tFWjdMRjJHSVV0c0tHOXJfT1ZpYUF1cjBXTmpRQzB0eVRCRmlWS21nczVoMmFZRVVNMHg4dDhqb1N6OVNGWmRUUDZKcFY5dUc0eGVELTFhbkFQVG5uS0lZQWJQYTl6Y3VFMnllUl9fdHRSNFk0YWJyMTNacGxTSE53WThNQVplMWxWVWh4dyJ9.wXVLXDYTndQoayF8c4-iz3-dBmZiYbkOn9SYIeMcCYc',
  solutions: [36962,
    60698,
    26309,
    8302,
    29205,
    98128,
    35269,
    53357,
    124815,
    65882,
    63154,
    38510,
    35340,
    39378,
    169997,
    3782,
    25373,
    19537,
    36615,
    15834,
    84342,
    147101,
    71938,
    149843,
    41836,
    49997,
    27830,
    77260,
    12200,
    120837,
    127610,
    29673,
    15060,
    13956,
    33972,
    94137,
    12612,
    7982,
    25446,
    52229,
    42185,
    51927,
    138614,
    63985,
    70684,
    64533,
    5216,
    1185,
    107701,
    13154,
    149008,
    150400,
    48235,
    105425,
    88990,
    63818,
    64458,
    70744,
    209,
    41909,
    66977,
    48870,
    38612,
    63956,
    91921,
    49584,
    29964,
    8914,
    56136,
    104876,
    43386,
    16662,
    3708,
    3149,
    43732,
    100712,
    84816,
    29402,
    60252,
    114775],
  instr: {
    i:
      'b885cb63b3fa6fe1e1d43b2966c395d0',
    state: {
      fuiwtsv7ukus: 969214,
      q2k0rqcqnnsd: 150737,
      v8e3h3mk6ak0: 456211,
      vm875n9ej6sw: 367950
    },
    ts: Date.now()
  }
});
