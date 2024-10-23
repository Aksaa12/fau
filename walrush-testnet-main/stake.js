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
      // Membaca private key dari file 'data.txt'
      const privateKey = fs.readFileSync('data.txt', 'utf8').trim();
      this.keypair = Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(privateKey).secretKey);
      
      // Mendapatkan alamat dari kunci publik dengan toRawBytes dan konversi ke hex
      this.acc = this.keypair.getPublicKey().toRawBytes().reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
      console.log("Alamat yang digunakan:", this.acc); // Tambahkan log untuk melihat alamat
      this.client = new SuiClient({ url: getFullnodeUrl("testnet") });
      this.walrusPoolObjectId = "0x37c0e4d7b36a2f64d51bba262a1791f844cfd88f31379f1b7c04244061d43914";
      this.walrusAddress = "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef";
    } catch (error) {
      console.error("Error initializing Core:", error);
    }
  }

  async stakeWalToOperator() {
    console.log("Memulai proses staking..."); // Logging untuk memulai proses
    try {
        // Mengambil informasi koin WAL yang dimiliki akun
        const coins = await this.client.getCoins({
            owner: this.acc,
            coinType: COINENUM.WAL,
        });

        // Logging semua koin yang didapat
        console.log("Koin yang didapat:", JSON.stringify(coins, null, 2)); // Logging detail koin
        
        // Tambahkan log untuk memeriksa status response
        if (!coins || !coins.data) {
            console.error("Tidak ada data koin yang diterima.");
            return; // Keluar dari fungsi jika tidak ada data
        }

        // Tambahkan log untuk menunjukkan alamat dan jenis koin
        console.log(`Alamat Akun: ${this.acc}`);
        console.log(`Jenis Koin yang dicari: ${COINENUM.WAL}`);

        // Tampilkan jumlah koin WAL yang dimiliki
        const totalWalCoins = coins.data.reduce((total, coin) => total + BigInt(coin.balance), BigInt(0));
        console.log("Jumlah total koin WAL yang dimiliki:", totalWalCoins / BigInt(MIST_PER_SUI)); // Konversi ke SUI

        if (!coins.data || coins.data.length === 0) {
            throw new Error("Tidak ada koin WAL yang tersedia untuk staking.");
        }

        const coin = coins.data[0];
        const balance = BigInt(coin.balance); // Menggunakan BigInt untuk balance

        console.log("Saldo koin:", balance); // Logging saldo

        // Cek apakah jumlah WAL sama dengan 1
        const amountWal = Number((balance / BigInt(MIST_PER_SUI)).toString());
        if (amountWal !== 1) {
            throw new Error(`Jumlah WAL yang dimiliki adalah ${amountWal}. Hanya bisa stake 1 WAL.`);
        }

        console.log("Jumlah WAL sesuai untuk staking."); // Logging jumlah WAL sesuai

        // Sisa kode Anda untuk mendapatkan objek pool dan transaksi...
    } catch (error) {
        console.error("Error staking WAL:", error); // Logging error
    }
}



  async executeTx(transaction) {
    try {
      logger.info("Executing Tx ...");
      const result = await this.client.signAndExecuteTransaction({
        signer: this.keypair, // Gunakan keypair untuk menandatangani
        transaction: transaction,
      });
      console.log(`Tx Executed: ${result.digest}`);
    } catch (error) {
      console.error("Error executing transaction:", error);
      throw error;
    }
  }
}

// Memanggil fungsi stakeWalToOperator
(async () => {
  const core = new Core();
  await core.stakeWalToOperator();
})();
