const {
  Connection,
  Keypair
} = require("@solana/web3.js");

const {
  getOrCreateAssociatedTokenAccount,
  mintTo
} = require("@solana/spl-token");

const bs58 = require("bs58");

const MINT_ADDRESS = "8Y7PfYNCmpZ5N2mpgchmJB8F7moHGPS6QMTms6STUqp2";

(async () => {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // wallet (must be mint authority)
  const secretKey = bs58.decode(process.env.PRIVATE_KEY);
  const payer = Keypair.fromSecretKey(secretKey);

  console.log("Wallet:", payer.publicKey.toBase58());

  const mint = MINT_ADDRESS;

  // recipient = your wallet (change if needed)
  const recipient = payer.publicKey;

  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    recipient
  );

  const amount = 1000 * 10 ** 9;

  await mintTo(
    connection,
    payer,
    mint,
    tokenAccount.address,
    payer.publicKey,
    amount
  );

  console.log("Minted into existing token:", mint);
})();
