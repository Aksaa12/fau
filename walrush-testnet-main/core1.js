import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import fs from 'fs';
import { COINENUM } from "./app/src/core/coin/coin_enum.js"; // Sesuaikan jalur sesuai kebutuhan
import logger from "./app/src/utils/logger.js"; // Pastikan jalur ini sesuai
import { Helper } from "./app/src/utils/helper.js"; // Menggunakan kurung kurawal

console.log("Memulai eksekusi core1.js");

// Kelas Core
export default class Core {
  constructor() {
    this.loadPrivateKey();
    console.log("Private key loaded:", this.acc); // Log untuk memastikan kunci privat dimuat

    this.client = new SuiClient({ url: getFullnodeUrl("testnet") });
    this.walrusAddress = "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef";
    this.walrusPoolObjectId = "0x37c0e4d7b36a2f64d51bba262a1791f844cfd88f31379f1b7c04244061d43914";

    // Panggil metode staking
    this.stakeWalToOperator()
      .then(() => {
        console.log("Staking completed.");
      })
      .catch(err => {
        console.error("Staking failed:", err);
      });
  }

  loadPrivateKey() {
    try {
      const data = fs.readFileSync('data.txt', 'utf8');
      this.acc = data.trim();
      const decodedPrivateKey = decodeSuiPrivateKey(this.acc);
      this.wallet = Ed25519Keypair.fromSecretKey(decodedPrivateKey.secretKey);
      this.address = this.wallet.getPublicKey().toSuiAddress();
    } catch (error) {
      console.error("Failed to load private key: ", error);
    }
  }

  async stakeWalToOperator() {
    console.log("Memulai staking..."); // Log untuk memulai staking
    try {
      await Helper.delay(1000, this.acc, "Try To Stake WAL to Operator", this);
      const coins = await this.client.getCoins({
        owner: this.address,
        coinType: COINENUM.WAL,
      });

      console.log("Coins found:", coins); // Log untuk menunjukkan koin yang ditemukan
      if (coins.data.length < 1) {
        throw new Error("No WAL coins available to stake.");
      }

      const coin = coins.data[0]; // Dapatkan koin WAL pertama
      const amountToStake = 1; // Hanya staking 1 WAL

      const poolObject = await this.client.getObject({
        id: this.walrusPoolObjectId,
        options: {
          showBcs: true,
          showContent: true,
          showOwner: true,
          showPreviousTransaction: true,
          showStorageRebate: true,
          showType: true,
        },
      });

      const transaction = new Transaction();
      const coinToStake = await transaction.splitCoins(
        transaction.object(coin.coinObjectId),
        [amountToStake * MIST_PER_SUI] // Konversi ke MIST untuk staking
      );

      const stakedCoin = transaction.moveCall({
        target: `${this.walrusAddress}::staking::stake_with_pool`,
        arguments: [
          transaction.object(poolObject.data.objectId),
          transaction.object(coinToStake),
        ],
      });

      await transaction.transferObjects([stakedCoin], this.address);
      await this.executeTx(transaction);
    } catch (error) {
      console.error("Error staking WAL:", error);
      throw error;
    }
  }

  async executeTx(transaction) {
    try {
      await Helper.delay(1000, this.acc, "Executing Tx ...", this);
      logger.info(await transaction.toJSON());
      const result = await this.client.signAndExecuteTransaction({
        signer: this.wallet,
        transaction: transaction,
      });
      await Helper.delay(
        3000,
        this.acc,
        `Tx Executed : ${result.digest}`,
        this
      );
    } catch (error) {
      console.error("Error executing transaction:", error);
      throw error;
    }
  }
}

// Buat instance dari kelas Core
const core = new Core();
