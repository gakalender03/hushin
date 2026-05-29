"""
Akoya Pearl Miner on Modal.com — Serverless H100 Mining
Deploy: modal deploy akoya_modal.py
Run:    modal run akoya_modal.py

Perbaikan:
- os.execv() → subprocess.run() (Modal tidak support process replacement)
- Timeout valid (max 24 jam)
- Image registry privat dengan auth
- Fallback GPU jika H100 tidak tersedia
"""

import modal
import subprocess
import os

app = modal.App("akoya-pearl-miner")

WALLET = "prl1p54q4lyahqxeul2ze4xgnnrzydpzethsearazea40emd44334xkdslllftu"
WORKER = "modal-h100"
GPU = "H100"
TIMEOUT = 86400  # 24 jam (max yang diizinkan Modal)

# Tambahkan secret untuk auth registry privat (jika diperlukan)
# Buat secret dulu: modal secret create akoya-registry REGISTRY_USER=xxx REGISTRY_PASS=yyy
akoya_image = (
    modal.Image.from_registry(
        "registry.akoyapool.com/akoya-miner:latest",
        add_python="3.11",
        # username/password untuk registry privat (opsional, hapus jika public)
        # username="your-registry-user",
        # password=modal.Secret.from_name("akoya-registry"),
    )
    .dockerfile_commands([
        "ENTRYPOINT []",
        "CMD []",
    ])
    .run_commands(
        # Pastikan binary akoya-miner ada dan executable
        "chmod +x /app/akoya-miner",
    )
)

# Secret untuk environment variables mining (jangan hardcode wallet di production!)
miner_secrets = [
    modal.Secret.from_dict({
        "AKOYA_POOL_WALLET": WALLET,
        "AKOYA_POOL_WORKER": WORKER,
    })
]

@app.function(
    gpu=GPU,
    image=akoya_image,
    timeout=TIMEOUT,
    secrets=miner_secrets,
    allow_concurrent_inputs=1,
    container_idle_timeout=300,
)
def mine():
    """
    Mine blocks menggunakan Akoya Pearl Miner.
    Perbaikan: Tidak menggunakan os.execv(), ganti dengan subprocess.run()
    """
    # Set environment variables dari secret
    os.environ["AKOYA_POOL_WALLET"] = os.environ["AKOYA_POOL_WALLET"]
    os.environ["AKOYA_POOL_WORKER"] = os.environ["AKOYA_POOL_WORKER"]
    os.environ["AKOYA_POOL_HOST"] = "pool-v2.akoyapool.com"
    os.environ["AKOYA_POOL_PORT"] = "443"
    os.environ["AKOYA_POOL_USE_TLS"] = "1"
    os.environ["AKOYA_GPU_INDICES"] = "all"
    os.environ["AKOYA_METRICS_PORT"] = "9100"
    os.environ["AKOYA_PEARL_GEMM_LIB"] = "/app/lib/libpearl_gemm_capi.so"
    os.environ["AKOYA_PEARL_MINING_LIB"] = "/app/lib/libpearl_mining_capi.so"

    # GPU kernel selection
    try:
        cc_result = subprocess.run(
            ["nvidia-smi", "--query-gpu=compute_cap", "--format=csv,noheader"],
            capture_output=True,
            text=True,
            check=True,
        )
        cc = cc_result.stdout.strip().split("
")[0]
        major, minor = cc.split(".")
        print(f"[Modal] GPU compute: {major}.{minor}")
    except subprocess.CalledProcessError as e:
        print(f"[Modal] Warning: nvidia-smi failed: {e}")
        major, minor = "12", "0"  # Fallback default

    lib_dir = "/app/lib"
    target = f"{lib_dir}/libpearl_gemm_capi.so"
    
    # Pilih kernel berdasarkan architecture
    if int(major) == 12:
        src = "blackwell"
    elif int(major) == 9:
        src = "h100"
    elif int(major) == 8 and int(minor) == 9:
        src = "ada"
    else:
        src = "portable"

    lib_file = f"{lib_dir}/libpearl_gemm_capi_{src}.so"
    
    # Safe symlink replacement
    if os.path.lexists(target):
        os.unlink(target)
    if os.path.exists(lib_file):
        os.symlink(lib_file, target)
        print(f"[Modal] Kernel: {src}")
    else:
        print(f"[Modal] Warning: {lib_file} not found, using default")

    # Buat directory untuk miner
    os.makedirs("/var/lib/akoya-miner", exist_ok=True)

    # PERBAIKAN UTAMA: subprocess.run() alih-alih os.execv()
    # Modal tidak support process replacement, jadi kita jalankan sebagai subprocess
    print(f"[Modal] Starting akoya-miner with args: mine-blocks")
    
    result = subprocess.run(
        ["/app/akoya-miner", "mine-blocks"],
        env=os.environ,
        check=False,  # Jangan raise exception jika exit non-zero
    )
    
    print(f"[Modal] akoya-miner exited with code: {result.returncode}")
    return result.returncode

@app.local_entrypoint()
def main():
    """
    Entry point untuk menjalankan mining.
    Gunakan .remote() untuk deploy ke cloud Modal.
    """
    print("[Modal] Starting Akoya Pearl Miner...")
    exit_code = mine.remote()
    print(f"[Modal] Mining finished with exit code: {exit_code}")
    
    # Jika mining butuh run terus (infinite loop), gunakan loop
    # if exit_code != 0:
    #     print("[Modal] Retrying mining...")
    #     main()
