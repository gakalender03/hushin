const {
  Connection,
  Keypair,
} = require("@solana/web3.js");

const {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo
} = require("@solana/spl-token");

const bs58 = require("bs58");

(async () => {
  const connection = new Connection(process.env.SOLANA_RPC, "confirmed");

  // ✅ BASE58 PRIVATE KEY SUPPORT
 
  const secretKey = bs58.decode(process.env.PRIVATE_KEY);
  const payer = Keypair.fromSecretKey(secretKey);

  console.log("Wallet:", payer.publicKey.toBase58());

  // 1. create mint
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey,
    null,
    9
  );

  console.log("Mint created:", mint.toBase58());

  // 2. token account
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  // 3. mint tokens
  const amount = 1000 * 10 ** 9;

  await mintTo(
    connection,
    payer,
    mint,
    tokenAccount.address,
    payer.publicKey,
    amount
  );

  console.log("Minted 1000 OBES-style tokens");
})();
