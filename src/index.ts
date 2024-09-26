import fetch from "node-fetch"
import {
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
const wallet = await getOrCreateKeypair("Wallet1")

// convert to Umi compatible keypair
const umiKeypair = umi.eddsa.createKeypairFromSecretKey(wallet.secretKey);

// Load the DAS API and MPL Bubblegum plugins into Umi, and set the Umi identity using a keypair,
// which acts as the signer for transactions.
umi.use(keypairIdentity(umiKeypair)).use(mplBubblegum()).use(dasApi());
  
airdropSolIfNeeded(wallet.publicKey);

const maxDepthSizePair: ValidDepthSizePair = {
  maxDepth: 3,
  maxBufferSize: 8,
};

await createAndInitializeTree(wallet, maxDepthSizePair);

// await getOrCreateCollectionNFT(wallet);

// await mintCompressedNftToCollection(
//   wallet,
//   treeAddress,
//   collectionNft,
//   2 ** maxDepthSizePair.maxDepth
// );
 
// Log NFT details to illustrate Read API
// await logNftDetails(treeAddress, 2 ** maxDepthSizePair.maxDepth);

async function getLeafAssetId(treeAddress: UmiPublicKey, index: BN) {
  try {

    const merkleTree = publicKey(treeAddress)

    const { signature } = await mintV1(umi, {
      leafOwner: umiKeypair.publicKey,
      merkleTree: merkleTree,
      metadata: createNftMetadata(umiKeypair.publicKey, index.toNumber()),
    }).sendAndConfirm(umi, { confirm: { commitment: "confirmed" } });

    const leaf: LeafSchema = await parseLeafFromMintV1Transaction(
      umi,
      signature
    );
    // const assetId = findLeafAssetIdPda(umi, { merkleTree, leafIndex: leaf.nonce });
    return leaf.id;
    // return assetId
  } catch (error: any) {
    console.error(
      `An Error occurred while trying to get the leaf Asset ID: error: ${error}`
    );
    throw error;
  }
}

// const receiver = Keypair.generate();
// Transfer first cNFT to random receiver to illustrate transfers
// await transferNft(
//   await getLeafAssetId(publicKey(treeAddress), new BN(0)),
//   wallet,
//   publicKey(receiver.publicKey)
// );
 

async function createAndInitializeTree(
  payer: Keypair,
  maxDepthSizePair: ValidDepthSizePair,
) {

  const merkleTree = generateSigner(umi);

  const builder = await createTree(umi, {
    merkleTree,
    maxDepth: maxDepthSizePair.maxDepth, // Max depth of the tree,
    maxBufferSize: maxDepthSizePair.maxBufferSize, // Max buffer size,
    public: false, // Set to false to restrict minting to the tree creator/delegate
  });

builder.sendAndConfirm(umi);

const merkleTreeAddress = merkleTree.publicKey;

  try {

    const explorerLink = getExplorerLink("transaction",
      merkleTreeAddress,
      "devnet"
    );

    console.log(`Transaction submitted: ${explorerLink}`);

    // console.log("Tree Address:", treeKeypair.publicKey.toBase58());
    console.log("Tree Address:", merkleTreeAddress);

    // return treeKeypair.publicKey;
    return merkleTreeAddress;
  } catch (error: any) {
    console.error("\nFailed to create merkle tree:", error);
    throw error;
  }
}



async function mintCompressedNftToCollection(
  payer: Keypair,
  treeAddress: UmiPublicKey,
  collectionDetails: CollectionDetails,
  amount: number
) {

  for (let i = 0; i < amount; i++) {
    // Compressed NFT Metadata
        const compressedNFTMetadata = createNftMetadata(publicKey(payer.publicKey), i);

        const mintAddress = collectionDetails.mint;

        await mintToCollectionV1(umi, {
          leafOwner: publicKey(payer.publicKey),
          merkleTree: treeAddress,
          collectionMint:collectionDetails.mint,
          metadata: compressedNFTMetadata
        }).sendAndConfirm(umi);

    try {
       const explorerLink = getExplorerLink(
         "transaction",
          mintAddress,
         "devnet"
       );

       console.log(`Transaction submitted: ${explorerLink}`);
       console.log("Address:", mintAddress );
    } catch (err) {
      console.error("\nFailed to mint compressed NFT:", err);
      throw err;
    }
  }
}





async function logNftDetails(treeAddress: UmiPublicKey, nftsMinted: number) {
  if (!process.env.RPC_URL) {
    throw new Error("RPC_URL environment variable is not defined.");
  }
  for (let i = 0; i < nftsMinted; i++) {
    //the Publickey type from metaplex/umi has been converted to base58 by default 
    const assetId = await getLeafAssetId(treeAddress, new BN(i));
    console.log("Asset ID:", assetId);
    // const umi = createUmi(
    //   "https://devnet.helius-rpc.com/?api-key=YOUR-HELIUS-API-KEY"
    // ).use(dasApi());
    const umi = createUmi(
      "https://devnet.helius-rpc.com/?api-key=YOUR-HELIUS-API-KEY"
    ).use(dasApi());

    //we'll make it any for now
  //   const response:any = await fetch(new URL(process.env.RPC_URL), {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({
  //       jsonrpc: "2.0",
  //       id: "my-id",
  //       method: "getAsset",
  //       params: {
  //         id: assetId,
  //       },
  //     }),
  //   });
  //   const { result } = await response.json();
  //   console.log(JSON.stringify(result, null, 2));
  const result = await umi.rpc
  }
}


async function transferNft(
  // connection: Connection,
  assetId: UmiPublicKey,
  sender: Keypair,
  receiver: UmiPublicKey
) {
  if (!process.env.RPC_URL) {
    throw new Error("RPC_URL environment variable is not defined.");
  }
  try {

    //we'll make it any for now
    const assetDataResponse: any = await fetch(process.env.RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "my-id",
        method: "getAsset",
        params: {
          id: assetId,
        },
      }),
    });
    const assetData = (await assetDataResponse.json()).result;

     //we'll make it any for now
    const assetProofResponse:any = await fetch(process.env.RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "my-id",
        method: "getAssetProof",
        params: {
          id: assetId,
        },
      }),
    });
    const assetWithProof = (await assetProofResponse.json()).result;

    const treePublicKey = new PublicKey(assetData.compression.tree);
    
    const leafOwner = publicKey(assetData.ownership.owner);
    const leafDelegate = assetData.ownership.delegate
      ? new PublicKey(assetData.ownership.delegate)
      : leafOwner;

      const transferSignature = (
        await transfer(umi, {
          ...assetWithProof,
          leafOwner: leafOwner,
          newLeafOwner: receiver,
        }).sendAndConfirm(umi, { confirm: { commitment: "confirmed" } })
      ).signature;
//  TO DO
    const transactionSignature = base58.deserialize(transferSignature)
     const explorerLink = getExplorerLink(
       "transaction",
       transactionSignature.toLocaleString(),
       "devnet"
     );

     console.log(`Transaction submitted: ${explorerLink}`);
  } catch (error: any) {
    console.error("\nFailed to transfer nft:", error);
    throw error;
  }
}


