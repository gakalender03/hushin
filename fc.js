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
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuIjoiNmNkZTk1YzMxYTc5MTUxOWY0YTczYWI2NzU1YjM2MzMwZTk2OTQxYmYwNWZjODM4NWMiLCJjIjo4MCwicyI6MzIsImQiOjQsImV4cCI6MTc3ODU2ODI3OTk1NSwiaWF0IjoxNzc4NTY3Mzc5OTU1LCJzayI6IjgxMjQ5NDU3ZjkiLCJlaSI6IjhDMFdWd1dMUnJYVzlXaGVYblp6Y0htN2MwY3AyYjNxS3dkMEtIMXE1XzFrcjJ4TkM4LVdpVVVHWVFWOGNXR2hldkc5WG9vWlBIRUFyVDZUbGJLb19xbU8tRlF2WWR2TlZBcGl5SUU3NTAzVlN0LTJLeWluMFRQbm5Pa1JqOWJxTDZtbk93QW5sUW1VRWFibVRuQ3pRbVJsRFRVSFdDQjQ4c0k0SEcwbC1POGpYZjc0QmRmOGFuZDF2cmZRYzFXZURhdmxoY3ZPRDhxOXRUeU5QcmNIekdwUmtlZlU0THhVZmhPbVJNcWlabjhZRjduYm8yLVJ3VGpTdXh1amJCQkxUV1dTZ0NGVEkyWUxRRHBTZmZqMGZPblVZX0pqZnNkNlFCTF92Yy1hbFduU29lN1V3bkt0c1duWVpfNEgxUSJ9.MMssc64AiLeOUrKrfISYH9o3jWbrjF__3NSldudbF78',
  solutions: [9918,
    2413,
    7789,
    63793,
    11570,
    79450,
    37433,
    39459,
    42172,
    63940,
    1969,
    5324,
    63431,
    45434,
    114499,
    92034,
    24546,
    42232,
    64538,
    22860,
    49261,
    102596,
    94108,
    61109,
    44172,
    14944,
    124149,
    24799,
    123523,
    137600,
    12488,
    79937,
    39071,
    47619,
    61225,
    63590,
    12219,
    55732,
    156028,
    84754,
    21519,
    72592,
    112122,
    18859,
    171234,
    113582,
    23365,
    69679,
    6445,
    44156,
    18669,
    46686,
    23016,
    204055,
    9008,
    199072,
    42385,
    188,
    103286,
    237061,
    135403,
    17156,
    52030,
    29523,
    70519,
    12883,
    170981,
    17494,
    83462,
    40890,
    35429,
    83313,
    109067,
    51028,
    35945,
    17688,
    27910,
    53076,
    198874,
    157644],
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
