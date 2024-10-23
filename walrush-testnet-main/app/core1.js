import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { COINENUM } from "./coin/coin_enum.js";
import logger from "../utils/logger.js";
import { Helper } from "../utils/helper.js"; // Asumsi Helper sudah ada untuk delay

export default class Staking {
  constructor(privateKey) {
    this.acc = privateKey;
    this.client = new SuiClient({ url: getFullnodeUrl("testnet") });
    this.walrusAddress = "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef"; // Node walrus staking
    this.wallet = null;
    this.address = null;
  }

  async initialize() {
    const decodedPrivateKey = decodeSuiPrivateKey(this.acc);
    this.wallet = Ed25519Keypair.fromSecretKey(decodedPrivateKey.secretKey);
    this.address = this.wallet.getPublicKey().toSuiAddress();
  }

  async getBalance() {
    const balanceData = await this.client.getCoins({
      owner: this.address,
      coinType: COINENUM.WAL,
    });
    return balanceData.data.length > 0 ? balanceData.data[0].balance : 0;
  }

  async stakeWal() {
    try {
      await this.initialize();
      const balance = await this.getBalance();
      
      console.log(`Alamat Wallet: ${this.address}`);
      console.log(`Saldo WAL: ${balance} WAL`);

      if (balance < 1) {
        console.log("Saldo WAL tidak cukup untuk staking.");
        return;
      }

      await Helper.delay(1000, this.acc, "Memulai proses staking...", this);

      const transaction = new Transaction();
      const coinToStake = await transaction.splitCoins(transaction.gas, [1]); // Staking 1 WAL

      const stakedCoin = transaction.moveCall({
        target: `${this.walrusAddress}::staking::stake_with_pool`, // Ganti dengan target yang sesuai
        arguments: [this.address, transaction.object(coinToStake)],
      });

      await this.executeTx(transaction);
    } catch (error) {
      console.error("Terjadi kesalahan saat staking:", error);
    }
  }

  async executeTx(transaction) {
    try {
      console.log("Menjalankan transaksi...");
      logger.info(await transaction.toJSON());
      
      const result = await this.client.signAndExecuteTransaction({
        signer: this.wallet,
        transaction: transaction,
      });

      console.log(`Status Transaksi: ${result.status}`);
      console.log(`Hash Transaksi: ${result.digest}`);
      await Helper.delay(2000, this.acc, "Transaksi selesai.", this);
    } catch (error) {
      console.error("Gagal menjalankan transaksi:", error);
    }
  }
}

// Untuk menjalankan staking
const privateKey = 'suiprivkey1qql5mpg03ns03tsn7lax22tt3nupfewtl459vsxakhzkhx72c48qcuk3svp'; // Ganti dengan private key Anda
const staking = new Staking(privateKey);
staking.stakeWal();
