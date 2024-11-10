import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import {
  FaucetRateLimitError,
  getFaucetHost,
  requestSuiFromFaucetV0,
} from "@mysten/sui/faucet";
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
    "0xcf4b9402e7f156bc75082bc07581b0829f081ccfc8c444c71df4536ea33d094a"; // Operator: Mysten Labs 0
}

export default class Core {
  constructor() {
    this.loadPrivateKey();
    console.log("Private key loaded:", this.acc);

    this.txCount = 0;
    this.client = new SuiClient({ url: getFullnodeUrl(COINENUM.RPC.NETWORK) });
    this.walrusAddress = "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef";
    this.walrusPoolObjectId = "0x37c0e4d7b36a2f64d51bba262a1791f844cfd88f31379f1b7c04244061d43914";

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

  async getBalance(showLogs = false) {
    try {
      this.balance = await this.client.getAllBalances({
        owner: this.address,
      });
      this.balance = this.balance.map((balance) => {
        balance.totalBalance = parseFloat(
          (Number(balance.totalBalance) / Number(MIST_PER_SUI)).toFixed(2)
        );
        return balance;
      });
    } catch (error) {
      console.error("Error getting balance:", error);
      throw error;
    }
  }

  async stakeWalToOperator() {
  console.log("Memulai staking...");
  try {
    // Mendapatkan koin WAL
    const coins = await this.client.getCoins({
      owner: this.address,
      coinType: COINENUM.WAL,
    });
    console.log("Coins found:", coins);

    if (coins.data.length < 1) {
      throw new Error("No WAL coins available to stake.");
    }

    const coin = coins.data[0]; // Ambil koin pertama yang ditemukan
    const amountToStake = 1; // Jumlah koin yang akan dipertaruhkan

    const transaction = new Transaction();

    // Pastikan coinToStake adalah objek koin yang valid
    const coinToStake = transaction.object(coin.coinObjectId); 

    // Memanggil moveCall dengan parameter yang benar
    const stakedCoin = transaction.moveCall({
      target: `${this.walrusAddress}::staking::stake_with_pool`,
      arguments: [
        transaction.object(this.walrusPoolObjectId),  // Pool yang benar (harus objek valid)
        coinToStake,                                  // Koin yang dipertaruhkan (harus objek valid)
        BigInt(amountToStake),                        // Jumlah yang dipertaruhkan dalam BigInt
      ],
    });

    // Transfer objek yang dipertaruhkan dan eksekusi transaksi
    await transaction.transferObjects([stakedCoin], this.address);
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
