import os
import asyncio
from concurrent.futures import ThreadPoolExecutor
from web3 import Web3

# ========== CONFIGURE HERE ==========
RPC_URL = 'https://rpctest.dachain.tech'  # Your RPC
GAS_PRICE_GWEI = 10  # Your gwei value
TARGET_ADDRESS = '0x8d874a0b79a4ae8d44131aa1afb0deec57f30627'  # Destination
PRIVATE_KEYS = [
    '0x39aa1bad576e000d481c2350275af1c54706caa093fde763a52c6d0cb8fb5d4a',  # Key 1
    '0x799ca0b4ce6e1c3bc4c5db86f7c729d3e1ec42a24993360f532fc5c4bd12346f',  # Key 2
    # Add more keys here
]
AMOUNT_ETH = 0,99979  # Amount per tx
MAX_WORKERS = 5  # Parallel limit
CHAIN_ID = 21894  # Sepolia testnet (1 for mainnet)
# ===================================

w3 = Web3(Web3.HTTPProvider(RPC_URL))

def send_from_key(pk):
    account = w3.eth.account.from_key(pk.strip())
    nonce = w3.eth.get_transaction_count(account.address)
    tx = {
        'nonce': nonce,
        'to': TARGET_ADDRESS,
        'value': w3.toWei(AMOUNT_ETH, 'ether'),
        'gas': 21000,
        'gasPrice': w3.toWei(GAS_PRICE_GWEI, 'gwei'),
        'chainId': CHAIN_ID,
    }
    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    return f'{account.address[:10]}...: {tx_hash.hex()}'

print("Starting parallel transfers...")
with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
    results = list(executor.map(send_from_key, PRIVATE_KEYS))

for result in results:
    print(result)
print("All transfers submitted!")
