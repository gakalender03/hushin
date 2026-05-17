const {
  Connection,
  Keypair,
  clusterApiUrl,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} = require("@solana/web3.js");

const {
  createInitializeMint2Instruction,
  createAssociatedTokenAccountInstruction,
  mintTo,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} = require("@solana/spl-token");

const {
  createCreateMetadataAccountV3Instruction,
} = require("@metaplex-foundation/mpl-token-metadata");

const bs58 = require("bs58");

// ----------------------------
// METADATA - OBES
// ----------------------------
const metadata = {
  name: "OBES",
  symbol: "OBES",
  description:
    "Imprint created with Open Execution System by Netrun Foundation.",
  image:
    "https://placehold.co/400x400/transparent/white/png?text=OBES%201000&font=montserrat",
  attributes: [
    { trait_type: "protocol", value: "netrun" },
    { trait_type: "type", value: "token-mint" },
    { trait_type: "token", value: "8Y7PfYNCmpZ5N2mpgchmJB8F7moHGPS6QMTms6STUqp2" },
    { trait_type: "symbol", value: "OBES" },
    { trait_type: "amount", value: "1000" },
  ],
};

// ----------------------------
// METAPLEX METADATA PROGRAM ID
// ----------------------------
const METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

// ----------------------------
// CONNECTION
// ----------------------------
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// ----------------------------
// WALLET (from env)
// ----------------------------
if (!process.env.SOLANA_PRIVATE_KEY) {
  throw new Error("Missing SOLANA_PRIVATE_KEY env var");
}

const payer = Keypair.fromSecretKey(
  bs58.decode(process.env.SOLANA_PRIVATE_KEY)
);

console.log("Wallet:", payer.publicKey.toBase58());

// ----------------------------
// MAIN SCRIPT – ALL IN ONE TRANSACTION
// ----------------------------
(async () => {
  try {
    // 1. GENERATE MINT KEYPAIR
    const mint = Keypair.generate();
    const mintPubkey = mint.publicKey;

    console.log("Mint pubkey:", mintPubkey.toBase58());

    // 2. DERIVE ASSOCIATED TOKEN ACCOUNT (no TX yet)
    const ata = await getAssociatedTokenAddress(mintPubkey, payer.publicKey);
    console.log("ATA:", ata.toBase58());

    // 3. COMPUTE METADATA PDA
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        METADATA_PROGRAM_ID.toBuffer(),
        mintPubkey.toBuffer(),
      ],
      METADATA_PROGRAM_ID
    );
    console.log("Metadata PDA:", metadataPDA.toBase58());

    // 4. METADATA URI (data URI base64 of your JSON)
    const uri =
      "data:application/json;base64,eyJuYW1lIjoiT0JFUyIsInN5bWJvbCI6Ik9CRVMiLCJkZXNjcmlwdGlvbiI6IkltcHJpbnQgY3JlYXRlZCB3aXRoIE9wZW4gRXhlY3V0aW9uIFN5c3RlbSBieSBOZXRydW4gRm91bmRhdGlvbi4iLCJpbWFnZSI6Imh0dHBzOi8vcGxhY2Vob2xkLmNvLzQwMHg0MDAvdHJhbnNwYXJlbnQvd2hpdGUvcG5nP3RleHQ9T0JFUyUwQTEwMDAmZm9udD1tb250c2VycmF0IiwiYXR0cmlidXRlcyI6W3sidHJhaXRfdHlwZSI6InByb3RvY29sIiwidmFsdWUiOiJuZXRydW4ifSx7InRyYWl0X3R5cGUiOiJ0eXBlIiwidmFsdWUiOiJ0b2tlbi1taW50In0seyJ0cmFpdF90eXBlIjoidG9rZW4iLCJ2YWx1ZSI6IjhZN1BmWU5DbXBaNU4ybXBnY2htSkI4Rjdtb0hHUFM2UU1UbXM2U1RVcXAyIn0seyJ0cmFpdF90eXBlIjoic3ltYm9sIiwidmFsdWUiOiJPQkVTIn0seyJ0cmFpdF90eXBlIjoiYW1vdW50IiwidmFsdWUiOiIxMDAwIn1dfQ==";

    // 5. BUILD ONE TRANSACTION
    const tx = new Transaction();

    // 5.1. Initialize mint (2 is the current mint size)
    tx.add(
      createInitializeMint2Instruction(
        mintPubkey,
        9, // decimals
        payer.publicKey,
        null, // freezeAuthority
        TOKEN_PROGRAM_ID
      )
    );

    // 5.2. CREATE ASSOCIATED TOKEN ACCOUNT FOR PAYER
    tx.add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey, // funding account (payer)
        ata,             // ATA address
        payer.publicKey, // owner (token holder)
        mintPubkey,      // mint
        TOKEN_PROGRAM_ID
      )
    );

    // 5.3. MINT TOKENS TO ATA
    tx.add(
      mintTo(
        TOKEN_PROGRAM_ID,
        mintPubkey,
        ata,
        payer.publicKey, // mint authority
        payer.publicKey, // signing authority
        1000 * 10 ** 9   // 1000 tokens, 9 decimals
      )
    );

    // 5.4. CREATE METADATA ACCOUNT (Metaplex)
    const metadataIx = createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPDA,
        mint: mintPubkey,
        mintAuthority: payer.publicKey,
        payer: payer.publicKey,
        updateAuthority: payer.publicKey,
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            name: metadata.name,
            symbol: metadata.symbol,
            uri,
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null,
          },
          isMutable: true,
          collectionDetails: null,
        },
      }
    );
    tx.add(metadataIx);

    // 6. SIGN AND SEND
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    tx.recentBlockhash = blockhash;
    tx.feePayer = payer.publicKey;

    // sign with payer and mint keypair
    tx.sign(payer, mint);

    const sig = await sendAndConfirmTransaction(connection, tx, [payer, mint], {
      commitment: "confirmed",
    });

    console.log("Mint pubkey:", mintPubkey.toBase58());
    console.log("ATA:", ata.toBase58());
    console.log("Metadata PDA:", metadataPDA.toBase58());
    console.log("One‑TX signature ✅:", sig);
  } catch (err) {
    console.error("ERROR:", err.message || err);
  }
})();
