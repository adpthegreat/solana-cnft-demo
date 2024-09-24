import fetch from "node-fetch"
import {
  AccountMeta,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js"
import {
  getOrCreateKeypair,
  createNftMetadata,
  CollectionDetails,
  getOrCreateCollectionNFT,
  airdropSolIfNeeded,
} from "./utils"
import {
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  ValidDepthSizePair,
  createAllocTreeIx,
  SPL_NOOP_PROGRAM_ID,
  ConcurrentMerkleTreeAccount,
} from "@solana/spl-account-compression"
import {
  PROGRAM_ID as BUBBLEGUM_PROGRAM_ID,
  createCreateTreeInstruction,
  createMintToCollectionV1Instruction,
  createTransferInstruction,
  getLeafAssetId,
} from "@metaplex-foundation/mpl-bubblegum"
import { PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata"
// import { BN } from "@coral-xyz/anchor"
import dotenv from "dotenv"
dotenv.config()

async function main() {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed")
  const wallet = await getOrCreateKeypair("Wallet1")
  airdropSolIfNeeded(wallet.publicKey)
}

// Demo Code Here

main()
