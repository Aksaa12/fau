import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import { COINENUM } from "./coin/coin_enum.js"; // Pastikan jalur sudah benar


import { Config } from "../../config/config.js";

export default class Core {
  constructor(privateKey) {
    this.acc = privateKey;
    this.client = new SuiClient({ url: getFullnodeUrl("testnet") });
    this.walrusAddress =
      "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef";
    this.walrusPoolObjectId =
      "0x37c0e4d7b36a2f64d51bba262a1791f844cfd88f31379f1b7c04244061d43914";
  }

  async getAccountInfo() {
    const decodedPrivateKey = decodeSuiPrivateKey(this.acc);
    this.wallet = Ed25519Keypair.fromSecretKey(decodedPrivateKey.secretKey);
    this.address = this.wallet.getPublicKey().toSuiAddress();
    console.log(`Address: ${this.address}`);
  }

  async getBalance() {
    const balanceInfo = await this.client.getAllBalances({
      owner: this.address,
    });
    const walBalance = balanceInfo.find(
      (b) => b.coinType === COINENUM.WAL
    ).totalBalance;

    console.log(`WAL Balance: ${parseFloat((walBalance / MIST_PER_SUI).toFixed(2))} WAL`);
    return walBalance;
  }

  async stakeWalToOperator() {
    const walBalance = await this.getBalance();
    if (walBalance < 1) {
      console.log("Insufficient WAL balance for staking.");
      return;
    }

    console.log("Staking 1 WAL to Walrus staking node...");
    const transaction = new Transaction();
    const coinToStake = await transaction.splitCoins(transaction.gas, [1 * MIST_PER_SUI]);

    const sharedPoolObject = transaction.sharedObjectRef({
      objectId: this.walrusPoolObjectId,
      initialSharedVersion: 0, // Set this as needed
      mutable: true,
    });

    const stakedCoin = transaction.moveCall({
      target: `${this.walrusAddress}::staking::stake_with_pool`,
      arguments: [
        sharedPoolObject,
        transaction.object(coinToStake),
        this.address,
      ],
    });

    await this.executeTx(transaction);
  }

  async executeTx(transaction) {
    console.log("Executing transaction...");
    const result = await this.client.signAndExecuteTransaction({
      signer: this.wallet,
      transaction: transaction,
    });

    console.log(`Transaction executed: ${result.digest}`);
    await this.getBalance();
  }
}

// Usage example
(async () => {
  const privateKey = "your-private-key"; // Replace with your actual private key
  const core = new Core(privateKey);
  await core.getAccountInfo();
  await core.stakeWalToOperator();
})();
