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
    process.env.CAPTCHA_TOKEN,
  solutions: [],
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
