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
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} = require("@solana/spl-token");

const {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as METADATA_PROGRAM_ID,
} = require("@metaplex-foundation/mpl-token-metadata");

const bs58 = require("bs58");

// ----------------------------
// METADATA
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
// CONNECTION
// ----------------------------
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// ----------------------------
// ✅ BASE58 PRIVATE KEY LOADING
// ----------------------------
if (!process.env.SOLANA_PRIVATE_KEY) {
  throw new Error("Missing SOLANA_PRIVATE_KEY env var");
}

const payer = Keypair.fromSecretKey(
  bs58.decode(process.env.SOLANA_PRIVATE_KEY)
);

console.log("Wallet:", payer.publicKey.toBase58());

// ----------------------------
// MAIN SCRIPT – ALL IN ONE TX
// ----------------------------
(async () => {
  try {
    // 1. CREATE MINT Keypair (known in advance)
    const mint = Keypair.generate();
    const mintPubkey = mint.publicKey;

    console.log("Mint pubkey:", mintPubkey.toBase58());

    // 2. COMPUTE ATA (so we can build the mintTo IX upfront)
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mintPubkey,
      payer.publicKey,
      false // don’t send TX yet, just get the ATA address
    );

    console.log("ATA:", tokenAccount.address.toBase58());

    // 3. METADATA PDA
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mintPubkey.toBuffer()],
      METADATA_PROGRAM_ID
    );

    console.log("Metadata PDA:", metadataPDA.toBase58());

    // 4. METADATA URI (data URI base64 of your JSON)
    const uri =
      "data:application/json;base64,eyJuYW1lIjoiT0JFUyIsInN5bWJvbCI6Ik9CRVMiLCJkZXNjcmlwdGlvbiI6IkltcHJpbnQgY3JlYXRlZCB3aXRoIE9wZW4gRXhlY3V0aW9uIFN5c3RlbSBieSBOZXRydW4gRm91bmRhdGlvbi4iLCJpbWFnZSI6Imh0dHBzOi8vcGxhY2Vob2xkLmNvLzQwMHg0MDAvdHJhbnNwYXJlbnQvd2hpdGUvcG5nP3RleHQ9T0JFUyUwQTEwMDAmZm9udD1tb250c2VycmF0IiwiYXR0cmlidXRlcyI6W3sidHJhaXRfdHlwZSI6InByb3RvY29sIiwidmFsdWUiOiJuZXRydW4ifSx7InRyYWl0X3R5cGUiOiJ0eXBlIiwidmFsdWUiOiJ0b2tlbi1taW50In0seyJ0cmFpdF90eXBlIjoidG9rZW4iLCJ2YWx1ZSI6IjhZN1BmWU5DbXBaNU4ybXBnY2htSkI4Rjdtb0hHUFM2UU1UbXM2U1RVcXAyIn0seyJ0cmFpdF90eXBlIjoic3ltYm9sIiwidmFsdWUiOiJPQkVTIn0seyJ0cmFpdF90eXBlIjoiYW1vdW50IiwidmFsdWUiOiIxMDAwIn1dfQ==";

    // 5. BUILD ALL INSTRUCTIONS (one TX)
    const tx = new Transaction();

    // 5.1. Initialize mint
    // https://docs.solana.com/developing/programming-model/transactions
    const createMintIx = createInitializeMint2Instruction(
      mintPubkey,
      9,           // decimals
      payer.publicKey,
      null,        // freezeAuthority = null
      TOKEN_PROGRAM_ID
    );
    tx.add(createMintIx);

    // 5.2. Mint tokens to ATA
    const mintToIx = mintTo(
      TOKEN_PROGRAM_ID,
      mintPubkey,
      tokenAccount.address,
      payer.publicKey,
      payer,
      1000 * 10 ** 9
    );
    tx.add(mintToIx);

    // 5.3. Create metadata account
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

    // 6. SIGN WITH ALL REQUIRED KEYS
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = payer.publicKey;

    // sign the mint key (for createInitializeMint2)
    tx.sign(payer, mint); // `mint` is the Keypair for the mint account

    // 7. SEND IN ONE TRANSACTION
    const sig = await sendAndConfirmTransaction(connection, tx, [payer, mint], {
      commitment: "confirmed",
    });

    console.log("Mint pubkey:", mintPubkey.toBase58());
    console.log("ATA:", tokenAccount.address.toBase58());
    console.log("Metadata PDA:", metadataPDA.toBase58());
    console.log("TX in one go ✅:", sig);
  } catch (err) {
    console.error("ERROR:", err.message || err);
  }
})();
