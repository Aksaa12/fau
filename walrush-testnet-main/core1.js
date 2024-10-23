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
import { Config } from "./app/config/config.js"; // Sesuaikan jalur sesuai kebutuhan
import { COINENUM } from "./app/src/core/coin/coin_enum.js"; // Jalur ini sesuai dengan struktur direktori Anda
 // Sesuaikan jalur sesuai kebutuhan

import logger from "../utils/logger.js";
import Helper from "../utils/helper.js"; // Adjust this import if necessary

export default class Core {
  constructor() {
    this.loadPrivateKey();
    this.txCount = 0;
    this.client = new SuiClient({ url: getFullnodeUrl("testnet") });
    this.walrusAddress = "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef";
    this.walrusPoolObjectId = "0x37c0e4d7b36a2f64d51bba262a1791f844cfd88f31379f1b7c04244061d43914";
  }

  loadPrivateKey() {
    try {
      const data = fs.readFileSync('data.txt', 'utf8');
      this.acc = data.trim(); // Load the private key from data.txt
      const decodedPrivateKey = decodeSuiPrivateKey(this.acc);
      this.wallet = Ed25519Keypair.fromSecretKey(decodedPrivateKey.secretKey);
      this.address = this.wallet.getPublicKey().toSuiAddress();
    } catch (error) {
      console.error("Failed to load private key: ", error);
    }
  }

  async getBalance(showLogs = false) {
    try {
      if (showLogs) {
        await Helper.delay(500, this.acc, "Getting Account Balance...", this);
      }
      this.balance = await this.client.getAllBalances({
        owner: this.address,
      });
      this.balance = this.balance.map((balance) => {
        balance.totalBalance = parseFloat(
          (Number(balance.totalBalance) / Number(MIST_PER_SUI)).toFixed(2)
        );
        return balance;
      });
      if (showLogs) {
        await Helper.delay(
          1000,
          this.acc,
          "Successfully Get Account Balance",
          this
        );
      }
    } catch (error) {
      throw error;
    }
  }

  async stakeWalToOperator() {
    try {
      await Helper.delay(1000, this.acc, "Try To Stake WAL to Operator", this);
      const coins = await this.client.getCoins({
        owner: this.address,
        coinType: COINENUM.WAL,
      });
      if (coins.data.length < 1) {
        throw new Error("No WAL coins available to stake.");
      }

      const coin = coins.data[0]; // Get the first WAL coin
      const amountToStake = 1; // Only stake 1 WAL

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
        [amountToStake * MIST_PER_SUI] // Convert to MIST for staking
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
      await this.getBalance();
    } catch (error) {
      throw error;
    }
  }
}
