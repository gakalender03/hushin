from circle.web3 import configurations, utils

# Initialize client with your Circle API key (if required)
api_key = "TEST_API_KEY:a5849c0988bc1a6b17b26a548a34a801:4d810da9a784d621f0e1ac2132968bdd"  # Circle may require an API key for programmatic requests
client = utils.init_configurations_client(api_key=api_key)
api_instance = configurations.FaucetApi(client)

# Prepare faucet request dictionary
faucet_request = configurations.FaucetRequest.from_dict({
    "address": "0xCCF035E57bfac855d7976386741927D3119Ed4d2",
    "blockchain": "ARC_TESTNET",  # Blockchain identifier for Arc testnet
    "native": False,              # USDC is not the native token but stablecoin requested
    "usdc": True,                # Request USDC
    "eurc": False                # Don’t request EURC
})

# Send faucet request
response = api_instance.request_testnet_tokens(faucet_request=faucet_request)
print(response)
