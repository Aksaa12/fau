import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import {
  FaucetRateLimitError,
  getFaucetHost,
  requestSuiFromFaucetV0,
} from "@mysten/sui/faucet";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Helper } from "../utils/helper.js"; // Sesuaikan path ini dengan lokasi Helper Anda

class SuiFaucetRequester {
  constructor(privateKey) {
    this.privateKey = privateKey;
    this.client = new SuiClient({ url: getFullnodeUrl("testnet") });
  }

  async getAccountInfo() {
    try {
      const decodedPrivateKey = decodeSuiPrivateKey(this.privateKey);
      this.wallet = Ed25519Keypair.fromSecretKey(decodedPrivateKey.secretKey);
      this.address = this.wallet.getPublicKey().toSuiAddress();
      console.log(`Address: ${this.address}`);
    } catch (error) {
      console.error("Error getting account info:", error);
    }
  }

  async requestFaucet() {
    try {
      console.log("Requesting Sui Faucet...");
      await requestSuiFromFaucetV0({
        host: getFaucetHost("testnet"),
        recipient: this.address,
      });
      console.log("Sui Faucet Requested Successfully!");
    } catch (error) {
      if (error instanceof FaucetRateLimitError) {
        console.error("Rate limit exceeded:", error.message);
      } else {
        console.error("Faucet request failed:", error);
      }
    }
  }

  async run() {
    await this.getAccountInfo();
    await this.requestFaucet();
  }
}

// Gantilah dengan private key Anda
const PRIVATE_KEY = "suiprivkey1qql5mpg03ns03tsn7lax22tt3nupfewtl459vsxakhzkhx72c48qcuk3svp"; 

const faucetRequester = new SuiFaucetRequester(PRIVATE_KEY);
faucetRequester.run();
