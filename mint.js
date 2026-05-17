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
} = require("@solana/spl-token");

const {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID,
} = require("@metaplex-foundation/mpl-token-metadata");

const bs58 = require("bs58");

// METADATA (same as yours)
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
// WALLET
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

    // 2. DERIVE ATA (not create it ahead of time)
    const { getAssociatedTokenAddress } = require("@solana/spl-token");

// derive the ATA (no TX yet)
const ata = await getAssociatedTokenAddress(
  mintPubkey,
  payer.publicKey
);
    console.log("ATA:", ata.toBase58());

    // 3. METADATA PDA
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), PROGRAM_ID.toBuffer(), mintPubkey.toBuffer()],
      PROGRAM_ID
    );

    console.log("Metadata PDA:", metadataPDA.toBase58());

    // 4. METADATA URI
    const uri =
      "data:application/json;base64,eyJuYW1lIjoiT0JFUyIsInN5bWJvbCI6Ik9CRVMiLCJkZXNjcmlwdGlvbiI6IkltcHJpbnQgY3JlYXRlZCB3aXRoIE9wZW4gRXhlY3V0aW9uIFN5c3RlbSBieSBOZXRydW4gRm91bmRhdGlvbi4iLCJpbWFnZSI6Imh0dHBzOi8vcGxhY2Vob2xkLmNvLzQwMHg0MDAvdHHJwmentIiwiYXR0cmlidXRlcyI6W3sidHJhaXRfdHlwZSI6InByb3RvY29sIiwidmFsdWUiOiJuZXRydW4ifSx7InRyYWl0X3R5cGUiOiJ0eXBlIiwidmFsdWUiOiJ0b2tlbi1taW50In0seyJ0cmFpdF90eXBlIjoidG9rZW4iLCJ2YWx1ZSI6IjhZN1BmWU5DbXBaNU4ybXBnY2htSkI4Rjdtb0hHUFM2UU1UbXM2U1RVcXAyIn0seyJ0cmFpdF90eXBlIjoic3ltYm9sIiwidmFsdWUiOiJPQkVTIn0seyJ0cmFpdF90eXBlIjoiYW1vdW50IiwidmFsdWUiOiIxMDAwIn1dfQ==";

    // 5. BUILD ONE TRANSACTION
    const tx = new Transaction();

    // 5.1. Initialize mint
    tx.add(
      createInitializeMint2Instruction(
        mintPubkey,
        9,
        payer.publicKey,
        null,
        TOKEN_PROGRAM_ID
      )
    );

    // 5.2. CREATE ASSOCIATED TOKEN ACCOUNT FOR PAYER (same TX)
    tx.add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        ata,
        payer.publicKey,
        mintPubkey,
        TOKEN_PROGRAM_ID
      )
    );

    // 5.3. Mint tokens to ATA
    tx.add(
      mintTo(
        TOKEN_PROGRAM_ID,
        mintPubkey,
        ata,
        payer.publicKey,
        payer.publicKey,
        1000 * 10 ** 9
      )
    );

    // 5.4. Create metadata account
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

    // 6. SIGN + SEND
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = payer.publicKey;
    tx.sign(payer, mint);

    const sig = await sendAndConfirmTransaction(connection, tx, [payer, mint], {
      commitment: "confirmed",
    });

    console.log("Mint pubkey:", mintPubkey.toBase58());
    console.log("ATA:", ata.toBase58());
    console.log("Metadata PDA:", metadataPDA.toBase58());
    console.log("One-TX ✅", sig);
  } catch (err) {
    console.error("ERROR:", err.message || err);
  }
})();
