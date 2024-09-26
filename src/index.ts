
 import { Connection,
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
  ValidDepthSizePair,
} from "@solana/spl-account-compression"
import {
  LeafSchema,
  mintV1,
  transfer,
  getAssetWithProof,
  createTree,
  mintToCollectionV1,
  parseLeafFromMintV1Transaction,
  fetchMerkleTree,
  TokenStandard,
  mplBubblegum,
  findLeafAssetIdPda,
} from "@metaplex-foundation/mpl-bubblegum";
import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";
// import { BN } from "@coral-xyz/anchor"
import dotenv from "dotenv"
import { BN } from "@coral-xyz/anchor"
import { getExplorerLink } from "@solana-developers/helpers"
import { generateSigner, keypairIdentity, publicKey } from "@metaplex-foundation/umi"
import { PublicKey as UmiPublicKey } from "@metaplex-foundation/umi-public-keys";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { base58 } from "@metaplex-foundation/umi/serializers";


dotenv.config()

const umi = createUmi(clusterApiUrl("devnet"));

//get keypair from .env file or create a new one
const wallet = await getOrCreateKeypair("Wallet1");

// convert to Umi compatible keypair
const umiKeypair = umi.eddsa.createKeypairFromSecretKey(wallet.secretKey);

// Load the DAS API and MPL Bubblegum plugins into Umi, and set the Umi identity using a keypair,
// which acts as the signer for transactions.
umi.use(keypairIdentity(umiKeypair)).use(mplBubblegum()).use(dasApi());

airdropSolIfNeeded(wallet.publicKey);


// Demo Code Here

