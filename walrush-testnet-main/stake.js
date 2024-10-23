import fs from 'fs';
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import { COINENUM } from './app/src/core/coin/coin_enum.js';
import logger from "../utils/logger.js";

export default class Core {
  constructor() {
    // Membaca private key dari file 'data.txt'
    const privateKey = fs.readFileSync('data.txt', 'utf8').trim(); // Membaca private key dari file dan menghapus spasi kosong
    this.acc = privateKey; 
    this.client = new SuiClient({ url: getFullnodeUrl("testnet") });
    this.walrusPoolObjectId = "0x37c0e4d7b36a2f64d51bba262a1791f844cfd88f31379f1b7c04244061d43914";
    this.walrusAddress = "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef";
  }

  async stakeWalToOperator() {
    try {
      // Mengambil informasi koin WAL yang dimiliki akun
      const coins = await this.client.getCoins({
        owner: this.address,
        coinType: COINENUM.WAL,
      });
      
      if (!coins.data || coins.data.length === 0) {
        throw new Error("Tidak ada koin WAL yang tersedia untuk staking.");
      }

      const coin = coins.data[0];
      const balance = coin.balance;

      // Cek apakah jumlah WAL sama dengan 1
      const amountWal = Number((balance / MIST_PER_SUI).toFixed(2));
      if (amountWal !== 1) {
        throw new Error(`Jumlah WAL yang dimiliki adalah ${amountWal}. Hanya bisa stake 1 WAL.`);
      }

      const poolObject = await this.client.getObject({
        id: this.walrusPoolObjectId,
        options: {
          showBcs: true,
          showContent: true,
          showDisplay: true,
          showOwner: true,
          showPreviousTransaction: true,
          showStorageRebate: true,
          showType: true,
        },
      });

      // Membuat transaksi untuk staking WAL
      const transaction = new Transaction();
      const sharedPoolObject = transaction.sharedObjectRef({
        objectId: poolObject.data.objectId,
        initialSharedVersion: poolObject.data.owner.Shared.initial_shared_version,
        mutable: true,
      });

      // Menyiapkan koin untuk di-stake
      const coinToStake = await transaction.splitCoins(
        transaction.object(coin.coinObjectId),
        [balance] // Memastikan seluruh koin WAL akan di-stake (1 WAL)
      );

      const stakedCoin = transaction.moveCall({
        target: `${this.walrusAddress}::staking::stake_with_pool`,
        arguments: [
          sharedPoolObject,
          transaction.object(coinToStake),
        ],
      });

      await transaction.transferObjects([stakedCoin], this.address);

      // Eksekusi transaksi
      await this.executeTx(transaction);
    } catch (error) {
      if (error.message && error.message.includes("equivocated")) {
        console.log("Equivocated error: ", error.message);
      } else {
        throw error;
      }
    }
  }

  async executeTx(transaction) {
    try {
      logger.info("Executing Tx ...");
      const result = await this.client.signAndExecuteTransaction({
        signer: this.wallet,
        transaction: transaction,
      });
      console.log(`Tx Executed: ${result.digest}`);
    } catch (error) {
      throw error;
    }
  }
}
