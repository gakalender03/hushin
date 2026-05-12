const axios = require('axios');

const WALLET =
  '0x021e614b301706DD064C48A3A540a68Dc1542188';

const CAPTCHA_URL =
  'https://cap.dachain.tech/81249457f9/redeem';

const FAUCET_URL =
  'https://faucet.dachain.tech/backend/dispense.php';

const headers = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',

  'Content-Type': 'application/json',
  'Accept': '*/*',
  'Origin': 'https://faucet.dachain.tech',
  'Referer': 'https://faucet.dachain.tech/',
  'DNT': '1',

  // optional browser-like headers
  'sec-ch-ua':
    '"Not-A.Brand";v="99", "Chromium";v="124"',
  'sec-ch-ua-platform': '"Android"',
  'sec-ch-ua-mobile': '?1'
};

async function claimFaucet() {
  try {
    // Step 1 — redeem captcha
    const captchaPayload = {
      instr: {
        i: 'b885cb63b3fa6fe1e1d43b2966c395d0',
        state: {
          fuiwtsv7ukus: 969214,
          q2k0rqcqnnsd: 150737,
          v8e3h3mk6ak0: 456211,
          vm875n9ej6sw: 367950
        },
        ts: 1778564592916
      },

      solutions: [
        // paste full 80-number array here
      ],

      token:
        'JWT_TOKEN_HERE'
    };

    const redeemRes = await axios.post(
      CAPTCHA_URL,
      captchaPayload,
      { headers }
    );

    console.log(
      'Redeem response:',
      redeemRes.data
    );

    if (!redeemRes.data.success) {
      throw new Error(
        'Captcha redeem failed'
      );
    }

    const capToken =
      redeemRes.data.token;

    // Step 2 — claim faucet
    const faucetPayload = {
      address: WALLET,
      'cap-response': capToken
    };

    const faucetRes = await axios.post(
      FAUCET_URL,
      faucetPayload,
      { headers }
    );

    console.log(
      'Faucet response:',
      faucetRes.data
    );

  } catch (err) {
    console.error(
      'Status:',
      err.response?.status
    );

    console.error(
      'Response:',
      err.response?.data
    );

    console.error(
      'Error:',
      err.message
    );
  }
}

claimFaucet();
