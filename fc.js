const axios = require('axios');

const FAUCET_URL = 'https://faucet.dachain.tech/backend/dispense.php';

// Replace these with the actual parameters from the form
const data = {
    address: '0x1F2Dd12Ad23622Dc2aE6d135d3cC48D70f4e4F9b',
    // any other parameters the form sends, e.g., token, captcha
};

const headers = {
    'User-Agent': 'Mozilla/5.0 (Node.js script)',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Referer': 'https://faucet.dachain.tech/', // sometimes required
};

async function claimFaucet() {
    try {
        // Convert object to URL-encoded string
        const params = new URLSearchParams(data).toString();

        const response = await axios.post(FAUCET_URL, params, { headers });
        console.log('Response:', response.data);
    } catch (err) {
        console.error('Error:', err.response ? err.response.data : err.message);
    }
}

claimFaucet();
