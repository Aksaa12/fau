import fs from 'fs';
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import { COINENUM } from './app/src/core/coin/coin_enum.js';
import logger from './app/src/utils/logger.js';

export default class Core {
  constructor() {
    try {
      // Reading private key from 'data.txt'
      const privateKey = fs.readFileSync('data.txt', 'utf8').trim();
      this.keypair = Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(privateKey).secretKey);
      
      // Get the public key address in hex format
      this.acc = this.keypair.getPublicKey().toRawBytes().reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
      console.log("Alamat yang digunakan:", this.acc); // Log the address
      this.client = new SuiClient({ url: getFullnodeUrl("testnet") });
      this.walrusPoolObjectId = "0x37c0e4d7b36a2f64d51bba262a1791f844cfd88f31379f1b7c04244061d43914";
      this.walrusAddress = "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef";
      this.address = null; // Initialize address variable
      console.log("Core initialized successfully.");
    } catch (error) {
      console.error("Error initializing Core:", error);
    }
  }

async getAccountInfo() {
    try {
      // Attempt to get coins for the account
      const coins = await this.client.getCoins({ owner: this.acc });
      console.log("Coins retrieved:", coins); // Log the coins

      if (coins.data.length === 0) {
        throw new Error("No coins available for the account.");
      }

      // Set the address to the owner of the first coin
      this.address = coins.data[0]?.owner || null; 
      if (!this.address) {
        throw new Error("No address found for the account.");
      }
      console.log("Account info retrieved:", this.address);
    } catch (error) {
      console.error("Error getting account info:", error);
      throw error; // Rethrow the error for handling in the calling method
    }
}

  async stakeWalToOperator() {
    try {
      console.log("Staking WAL to operator...");
      await this.getAccountInfo(); // Get account info
      await this.mergeCoin(); // Ensure mergeCoin function exists
      await Helper.delay(1000, this.acc, "Try To Stake Wal to Operator", this);
      
      const coins = await this.client.getCoins({
          owner: this.acc,
          coinType: COINENUM.WAL,
      });
      console.log("Coins available for staking:", coins.data); // Log all available coins

      if (!coins.data || coins.data.length === 0) {
          console.log("No WAL coins available to stake.");
          return;
      }

      const coin = coins.data[0]; // Get the first coin
      const balance = coin.balance;

      // Logic for getting pool and operator object
      const poolObject = await this.client.getObject({
          id: this.walrusPoolObjectId,
          options: { /*...*/ },
      });
      const operatorObject = await this.client.getObject({
          id: Config.STAKENODEOPERATOR,
          options: { /*...*/ },
      });

      const transaction = new Transaction();
      const sharedPoolObject = transaction.sharedObjectRef({
          objectId: poolObject.data.objectId,
          initialSharedVersion: poolObject.data.owner.Shared.initial_shared_version,
          mutable: true,
      });

      const coinToStake = await transaction.splitCoins(
          transaction.object(coin.coinObjectId),
          [balance] // Split coins according to balance
      );

      const stakedCoin = transaction.moveCall({
          target: `${this.walrusAddress}::staking::stake_with_pool`,
          arguments: [
              sharedPoolObject,
              transaction.object(coinToStake),
              transaction.object(operatorObject.data.objectId),
          ],
      });

      await transaction.transferObjects([stakedCoin], this.address);
      await this.executeTx(transaction);
    } catch (error) {
      console.error("Error in staking WAL to operator:", error);
      if (error.message && error.message.includes("equivocated")) {
          await Helper.delay(1000, this.acc, error.message, this);
      }
      throw error;
    }
  }

  async executeTx(transaction) {
    try {
      logger.info("Executing Tx ...");
      const result = await this.client.signAndExecuteTransaction({
        signer: this.keypair, // Use keypair to sign
        transaction: transaction,
      });
      console.log(`Tx Executed: ${result.digest}`);
    } catch (error) {
      console.error("Error executing transaction:", error);
      throw error;
    }
  }
}

// Calling the stakeWalToOperator function
(async () => {
  const core = new Core();
  await core.stakeWalToOperator();
})();
