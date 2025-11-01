import requests

API_KEY = "TEST_API_KEY:a5849c0988bc1a6b17b26a548a34a801:4d810da9a784d621f0e1ac2132968bdd"
WALLET_ADDRESS = "0xCCF035E57bfac855d7976386741927D3119Ed4d2"
FAUCET_URL = "https://api.circle.com/v1/faucet/drips"

def claim_usdc():
    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "address": WALLET_ADDRESS,
        "blockchain": "ARC-TESTNET",
        "usdc": True
    }
    response = requests.post(FAUCET_URL, json=data, headers=headers)
    if response.status_code == 200:
        print("Successfully claimed 10 USDC on Arc Testnet")
        print(response.json())
    else:
        print(f"Failed to claim USDC: {response.status_code} {response.text}")

if __name__ == "__main__":
    claim_usdc()
