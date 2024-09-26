import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";
import * as fs from "fs";
import {
  MetadataArgs,
  TokenProgramVersion,
  TokenStandard,
  UseMethod,
} from "@metaplex-foundation/mpl-bubblegum";
import { PublicKey as UmiPublicKey } from "@metaplex-foundation/umi-public-keys";
import { some } from "@metaplex-foundation/umi-options";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createNft,
  fetchMetadataFromSeeds,
  findMasterEditionPda,
  findMetadataPda,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { uris } from "./uri";
import {
  getKeypairFromEnvironment,
  addKeypairToEnvFile,
  airdropIfRequired,
} from "@solana-developers/helpers";
import {
  generateSigner,
  keypairIdentity,
  percentAmount,
  publicKey,
} from "@metaplex-foundation/umi";

export async function getOrCreateKeypair(walletName: string): Promise<Keypair> {
  let keypair: Keypair;

  // Try to load the keypair from the environment variable
  try {
    keypair = getKeypairFromEnvironment(walletName); // throws error if keypair is invalid or does not exist
    console.log(`${walletName} PublicKey: ${keypair.publicKey.toBase58()}`);
  } catch (error) {
    // If keypair doesn't exist in .env, generate a new keypair and store it
    console.log(`Writing ${walletName} keypair to .env file...`);

    // Generate a new keypair
    keypair = Keypair.generate();

    // Save keypair to .env file using helper function
    await addKeypairToEnvFile(keypair, walletName);

    console.log(`${walletName} PublicKey: ${keypair.publicKey.toBase58()}`);
  }

  return keypair;
}

export async function airdropSolIfNeeded(publicKey: PublicKey) {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  try {
    const newBalance = await airdropIfRequired(
      connection,
      publicKey,
      2 * LAMPORTS_PER_SOL, // Airdrop 2 SOL if needed
      1 * LAMPORTS_PER_SOL // Only airdrop if the balance is below 1 SOL
    );

    console.log("New balance is", newBalance / LAMPORTS_PER_SOL);
  } catch (error) {
    console.log("Airdrop Unsuccessful, likely rate-limited. Try again later.");
  }
}

export function createNftMetadata(creator: UmiPublicKey, index: number) {
  if (index > uris.length) {
    throw new Error("Index is out of range");
  }

  const uri = uris[index];

  // Compressed NFT Metadata
  const compressedNFTMetadata: MetadataArgs = {
    name: "CNFT",
    symbol: "CNFT",
    uri: uri,
    creators: [{ address: creator, verified: false, share: 100 }],
    editionNonce: some(0),
    uses: some({
      useMethod: UseMethod.Single,
      remaining: BigInt(5), // 5 uses remaining
      total: BigInt(5), // Total of 5 uses originally
    }),
    collection: some({
      verified: true,
      key: creator,
    }),
    primarySaleHappened: false,
    sellerFeeBasisPoints: 0,
    isMutable: false,
    tokenProgramVersion: TokenProgramVersion.Original,
    tokenStandard: some(TokenStandard.NonFungible),
  };

  return compressedNFTMetadata;
}

export type CollectionDetails = {
  mint: UmiPublicKey;
  metadata: UmiPublicKey;
  masterEditionAccount: UmiPublicKey;
};

//Loads a collection NFT from the .env file. If the collection NFT doesn't exist,
// it creates a new one using a random URI from a predefined list, then appends
// the mint address to .env
export async function getOrCreateCollectionNFT(
  payer: Keypair
): Promise<CollectionDetails> {
  // Retrieve the collection NFT mint address from the .env file if it exists
  const envCollectionNftAddress = process.env["COLLECTION_NFT"];

  // Initialize the Umi instance with the Solana devnet cluster as the target network
  const umi = createUmi(clusterApiUrl("devnet"));

  // convert to Umi compatible keypair
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(payer.secretKey);

  // load the MPL metadata program plugin and assign a signer to our umi instance
  umi.use(keypairIdentity(umiKeypair)).use(mplTokenMetadata());

  const collectionMint = generateSigner(umi);

  // Function to fetch addresses for an existing collection NFT
  const fetchCollectionAddresses = async (
    collectionNftAddress: UmiPublicKey
  ) => {
    //fetch meta data address
    // Derive the Metadata PDA (Program Derived Address) for the given mint address (collectionNftAddress).
    // The metadata account stores the onchain data for the NFT, such as name, symbol, URI, etc.
    // This address is deterministically generated using the mint address and the Token Metadata program ID.
    // The resulting PDA is needed to fetch or interact with the NFT's metadata.
    const metadataAddress = findMetadataPda(umi, {
      mint: collectionNftAddress,
    })[0];

    //fetch masterEdition Address
    // Derive the MasterEdition PDA (Program Derived Address) for the given mint address (collectionNftAddress).
    // The MasterEdition account manages the NFT's supply and editioning information (if the NFT supports editions).
    // This PDA is deterministically generated using the mint address and the Token Metadata program ID.
    // The resulting address is necessary to fetch or interact with the NFT's MasterEdition data.

    const masterEditionAddress = findMasterEditionPda(umi, {
      mint: collectionNftAddress,
    })[0];

    return { metadataAddress, masterEditionAddress };
  };

  if (envCollectionNftAddress) {
    // The address of the mint account
    const collectionNftAddress = publicKey(envCollectionNftAddress);

    // fetchMetadataFromSeeds get mint address
    const collectionNft = await fetchMetadataFromSeeds(umi, {
      mint: collectionNftAddress,
    });

    const { metadataAddress, masterEditionAddress } =
      await fetchCollectionAddresses(collectionNftAddress);

    // if (collectionNft.name !== "nft") {
    //   throw new Error("Invalid collection NFT");
    // }
    // if (collectionNft.model !== "nft") {
    //   throw new Error("Invalid collection NFT");
    // }

    return {
      mint: collectionNft.mint,
      metadata: metadataAddress,
      masterEditionAccount: masterEditionAddress,
    };
  }

  // Select a random URI from uris
  const randomUri = uris[Math.floor(Math.random() * uris.length)];

  await createNft(umi, {
    mint: collectionMint,
    name: "Collection NFT",
    uri: randomUri,
    authority: umi.identity,
    updateAuthority: umi.identity.publicKey,
    sellerFeeBasisPoints: percentAmount(0),
    symbol: "Collection",
    isMutable: true,
    isCollection: true,
  }).sendAndConfirm(umi, { send: { commitment: "finalized" } });

  const collectionNftAddress = collectionMint.publicKey;

  // fetchMetadataFromSeeds get mint address
  const collectionNft = await fetchMetadataFromSeeds(umi, {
    mint: collectionNftAddress,
  });

  const { metadataAddress, masterEditionAddress } =
    await fetchCollectionAddresses(collectionNftAddress);

  // public keys in umi are now directly represented in base58
  fs.appendFileSync(".env", `\n${"COLLECTION_NFT"}=${collectionNft.mint})}`);

  return {
    mint: collectionNft.mint,
    metadata: metadataAddress,
    masterEditionAccount: masterEditionAddress,
  };
}

// 4 fns

