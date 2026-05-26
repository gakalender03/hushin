from concurrent.futures import ThreadPoolExecutor
from threading import Lock
from web3 import Web3
import os



# =========================
# CONFIG
# =========================

RPC_URL = 'https://rpctest.dachain.tech'

TARGET_ADDRESS = Web3.to_checksum_address('0x3691A78bE270dB1f3b1a86177A8f23F89A8Cef24')

HEX_DATA = '0x4a5d094b'

AMOUNT_ETH = 1

GAS_LIMIT = 35
GAS_PRICE_GWEI = 100000

MAX_WORKERS = 5
CHAIN_ID = 21894

# =========================
# SETUP
# =========================

PRIVATE_KEYS = os.environ.get('PRIVATE_KEYS', '').splitlines()

w3 = Web3(Web3.HTTPProvider(RPC_URL))

nonce_lock = Lock()
nonce_map = {}

def get_unique_nonce(address):
    with nonce_lock:
        if address not in nonce_map:
            nonce_map[address] = w3.eth.get_transaction_count(address, 'pending')

        nonce = nonce_map[address]
        nonce_map[address] += 1
        return nonce

def send_from_key(pk):
    try:
        pk = pk.strip()

        if not pk or len(pk) < 64:
            return 'Skipped invalid key'

        account = w3.eth.account.from_key(pk)
        nonce = get_unique_nonce(account.address)

        tx = {
            'nonce': nonce,
            'to': TARGET_ADDRESS,
            'value': w3.to_wei(AMOUNT_ETH, 'ether'),
            'gas': GAS_LIMIT,
            'gasPrice': w3.to_wei(GAS_PRICE_GWEI, 'gwei'),
            'data': HEX_DATA,
            'chainId': CHAIN_ID,
        }

        signed = account.sign_transaction(tx)

        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)

        return (
            f'Sent | {account.address[:10]}... '
            f'nonce={nonce} gas={GAS_LIMIT} tx={tx_hash.hex()}'
        )

    except Exception as e:
        return f'Error: {str(e)}'

print('Starting parallel contract transfers...')

valid_keys = [k for k in PRIVATE_KEYS if k.strip()]

print(f'Found {len(valid_keys)} valid keys')

with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
    results = list(executor.map(send_from_key, valid_keys))

print('Results: ')

for result in results:
    print(result)

print('All transactions submitted!')

