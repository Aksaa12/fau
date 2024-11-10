import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import fs from 'fs';

console.log("Memulai eksekusi core1.js");

class COINENUM {
  static SUI = "0x2::sui::SUI";
  static WAL = "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef::wal::WAL";

  static RPC = {
    NETWORK: "testnet",
    EXPLORER: "https://testnet.suivision.xyz/",
  };

  static STAKENODEOPERATOR =
    "0x70bc82baec578437bf2f61ce024c2b6da46038ddbcb95dbfc72a2151103a8097"; // Node operator address
}

export default class Core {
  constructor() {
    this.loadPrivateKey();
    console.log("Private key loaded:", this.acc);

    this.txCount = 0;
    this.client = new SuiClient({ url: getFullnodeUrl(COINENUM.RPC.NETWORK) });
    this.walrusAddress = "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef";
    this.walrusPoolObjectId =
      "0x37c0e4d7b36a2f64d51bba262a1791f844cfd88f31379f1b7c04244061d43914"; // Pool object ID

    this.stakeWalToOperator()
      .then(() => {
        console.log("Staking completed.");
      })
      .catch((err) => {
        console.error("Staking failed:", err);
      });
  }

  loadPrivateKey() {
    try {
      const data = fs.readFileSync("data.txt", "utf8");
      this.acc = data.trim();
      const decodedPrivateKey = decodeSuiPrivateKey(this.acc);
      this.wallet = Ed25519Keypair.fromSecretKey(decodedPrivateKey.secretKey);
      this.address = this.wallet.getPublicKey().toSuiAddress();
    } catch (error) {
      console.error("Failed to load private key: ", error);
    }
  }

  async getBalance(showLogs = false) {
    try {
      const balance = await this.client.getAllBalances({
        owner: this.address,
      });
      return balance.map((b) => {
        b.totalBalance = parseFloat((Number(b.totalBalance) / Number(MIST_PER_SUI)).toFixed(2));
        return b;
      });
    } catch (error) {
      console.error("Error getting balance:", error);
      throw error;
    }
  }

  async stakeWalToOperator() {
    console.log("Memulai staking...");
    try {
      // Step 1: Get coins of type WAL from the wallet
      const coins = await this.client.getCoins({
        owner: this.address,
        coinType: COINENUM.WAL,
      });
      console.log("Coins found:", coins);

      if (coins.data.length < 1) {
        throw new Error("No WAL coins available to stake.");
      }

      // Step 2: Select the first WAL coin
      const coin = coins.data[0];
      const amountToStake = 1; // Amount to stake (1 WAL coin)

      // Step 3: Create a transaction
      const transaction = new Transaction();
      
      // Split the coin into stakeable amount (amount is in MIST, multiply by MIST_PER_SUI)
      const coinToStake = await transaction.splitCoins(
        transaction.object(coin.coinObjectId),
        [BigInt(amountToStake) * BigInt(MIST_PER_SUI)]
      );

      // Step 4: Move call for staking the WAL coin to the node operator's pool
      const stakedCoin = transaction.moveCall({
        target: `${this.walrusAddress}::staking::stake_with_pool`,
        arguments: [
          transaction.object(this.walrusPoolObjectId), // Pool Object ID
          transaction.object(coinToStake),             // Coin to stake
          BigInt(amountToStake),                       // Amount of WAL coin to stake
        ],
      });

      // Step 5: Transfer the staked coin back to the address (not necessary for staking directly, but keeps consistency)
      await transaction.transferObjects([stakedCoin], this.address);

      // Step 6: Execute the transaction on the blockchain
      await this.executeTx(transaction);
    } catch (error) {
      console.error("Error staking WAL:", error);
      throw error;
    }
  }

  async executeTx(transaction) {
    try {
      const result = await this.client.signAndExecuteTransaction({
        signer: this.wallet,
        transaction: transaction,
      });
      console.log(`Tx Executed: ${result.digest}`);
      await this.getBalance();
    } catch (error) {
      console.error("Error executing transaction:", error);
      throw error;
    }
  }
}

const core = new Core();
