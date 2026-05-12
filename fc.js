const axios = require('axios');

const WALLET =
  '0x021e614b301706DD064C48A3A540a68Dc1542188';

const CAPTCHA_URL =
  'https://cap.dachain.tech/81249457f9/redeem';

const FAUCET_URL =
  'https://faucet.dachain.tech/backend/dispense.php';

const browserHeaders = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  Accept: '*/*',
  Origin: 'https://faucet.dachain.tech',
  Referer: 'https://faucet.dachain.tech/'
};

async function claimFaucet() {
  try {
    // redeem captcha
    const redeemRes = await axios.post(
      CAPTCHA_URL,
      {
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
          // full array
        ],
        token: 'JWT_TOKEN'
      },
      {
        headers: {
          ...browserHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

    const capToken =
      redeemRes.data.token;

    console.log(
      'Captcha token:',
      capToken
    );

    // faucet request
    const form =
      new URLSearchParams();

    form.append(
      'address',
      WALLET
    );

    form.append(
      'cap-response',
      capToken
    );

    const faucetRes =
      await axios.post(
        FAUCET_URL,
        form.toString(),
        {
          headers: {
            ...browserHeaders,
            'Content-Type':
              'application/x-www-form-urlencoded'
          }
        }
      );

    console.log(
      faucetRes.data
    );

  } catch (err) {
    console.log(
      err.response?.data ||
      err.message
    );
  }
}

claimFaucet();
