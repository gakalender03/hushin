const {
  Connection,
  Keypair,
  clusterApiUrl,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} = require("@solana/web3.js");

const {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} = require("@solana/spl-token");

const {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID,
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
// ✅ FIXED: BASE58 PRIVATE KEY LOADING
// ----------------------------
if (!process.env.SOLANA_PRIVATE_KEY) {
  throw new Error("Missing SOLANA_PRIVATE_KEY env var");
}

const payer = Keypair.fromSecretKey(
  bs58.decode(process.env.SOLANA_PRIVATE_KEY)
);

console.log("Wallet:", payer.publicKey.toBase58());

// ----------------------------
// MAIN SCRIPT
// ----------------------------
(async () => {
  try {
    // 1. CREATE MINT
    const mint = await createMint(
      connection,
      payer,
      payer.publicKey,
      null, // freezeAuthority
      9     // decimals
    );

    console.log("Mint:", mint.toBase58());

    // 2. CREATE TOKEN ACCOUNT (ATA)
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      payer.publicKey
    );

    console.log("ATA:", tokenAccount.address.toBase58());

    // 3. MINT TOKENS (1000, 9 decimals => 1000 * 10^9)
    await mintTo(
      connection,
      payer,
      mint,
      tokenAccount.address,
      payer,
      1000 * 10 ** 9
    );

    console.log("Minted tokens");

    // 4. METADATA URI (data URI base64 of your JSON)
    const uri =
      "data:application/json;base64,eyJuYW1lIjoiT0JFUyIsInN5bWJvbCI6Ik9CRVMiLCJkZXNjcmlwdGlvbiI6IkltcHJpbnQgY3JlYXRlZCB3aXRoIE9wZW4gRXhlY3V0aW9uIFN5c3RlbSBieSBOZXRydW4gRm91bmRhdGlvbi4iLCJpbWFnZSI6Imh0dHBzOi8vcGxhY2Vob2xkLmNvLzQwMHg0MDAvdHJhbnNwYXJlbnQvd2hpdGUvcG5nP3RleHQ9T0JFUyUwQTEwMDAmZm9udD1tb250c2VycmF0IiwiYXR0cmlidXRlcyI6W3sidHJhaXRfdHlwZSI6InByb3RvY29sIiwidmFsdWUiOiJuZXRydW4ifSx7InRyYWl0X3R5cGUiOiJ0eXBlIiwidmFsdWUiOiJ0b2tlbi1taW50In0seyJ0cmFpdF90eXBlIjoidG9rZW4iLCJ2YWx1ZSI6IjhZN1BmWU5DbXBaNU4ybXBnY2htSkI4Rjdtb0hHUFM2UU1UbXM2U1RVcXAyIn0seyJ0cmFpdF90eXBlIjoic3ltYm9sIiwidmFsdWUiOiJPQkVTIn0seyJ0cmFpdF90eXBlIjoiYW1vdW50IiwidmFsdWUiOiIxMDAwIn1dfQ==";

    // 5. METADATA PDA
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), PROGRAM_ID.toBuffer(), mint.toBuffer()],
      PROGRAM_ID
    );
    console.log("Metadata PDA:", metadataPDA.toBase58());

    // 6. CREATE METADATA TX
    const ix = createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPDA,
        mint: mint,
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

    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [payer]);

    console.log("Metadata TX:", sig);
    console.log("DONE ✅");
  } catch (err) {
    console.error("ERROR:", err.message || err);
  }
})();
