import modal

# Create the Modal app
app = modal.App("pearl-miner")

# Create image from Docker Hub registry for alphaminetech/pearl-miner:v1.6.0
image = (
    modal.Image.from_registry(
        "alphaminetech/pearl-miner:v1.6.0",
        add_python="3.11"
    )
    .env({
        "PEARL_ADDRESS": "prl1p54q4lyahqxeul2ze4xgnnrzydpzethsearazea40emd44334xkdslllftu",
        "PEARL_POOL_HOST": "us2.alphapool.tech",
        "PEARL_POOL_PORT": "5566",
    })
)

@app.function(
    image=image,
    gpu="any",  # Any GPU: T4, L4, A10, A10G, A100, H100, L40S [web:1][web:4]
    timeout=3600,  # 1 hour max runtime
)
def miner():
    """
    Run the Pearl GPU miner.
    
    Equivalent to your docker run command:
    docker run --gpus all \
      -e PEARL_ADDRESS=prl1p54q4lyahqxeul2ze4xgnnrzydpzethsearazea40emd44334xkdslllftu \
      -e PEARL_POOL_HOST=us2.alphapool.tech \
      -e PEARL_POOL_PORT=5566 \
      alphaminetech/pearl-miner:v1.6.0
    """
    import time
    # Keep container running - miner runs via ENTRYPOINT
    while True:
        time.sleep(60)

@app.local_entrypoint()
def main():
    """Local entrypoint to deploy/run the miner."""
    print("=== Pearl Miner on Modal ===")
    print("Pool: us2.alphapool.tech:5566")
    print("GPU: any available")
    miner.remote()
