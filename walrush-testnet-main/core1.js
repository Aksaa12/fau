import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import { Transaction } from "@mysten/sui/transactions";
import { Config } from "../../config/config.js";
import { COINENUM } from "./coin/coin_enum.js";

export default class Core {
  constructor(privateKey) {
    this.acc = privateKey;
    this.client = new SuiClient({ url: getFullnodeUrl("testnet") });
    this.walrusAddress = "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef";
    this.walrusPoolObjectId = "0x37c0e4d7b36a2f64d51bba262a1791f844cfd88f31379f1b7c04244061d43914";
  }

  async getAccountInfo() {
    const decodedPrivateKey = decodeSuiPrivateKey(this.acc);
    this.wallet = Ed25519Keypair.fromSecretKey(decodedPrivateKey.secretKey);
    this.address = this.wallet.getPublicKey().toSuiAddress();
  }

  async mergeCoin() {
    const coins = await this.client.getCoins({
      owner: this.address,
      coinType: COINENUM.WAL,
    });
    if (!coins.data || coins.data.length < 2) {
      return;
    }
    const transaction = new Transaction();
    const primaryCoin = coins.data[0].coinObjectId;
    const coinsToMerge = coins.data.slice(1).map((coin) => coin.coinObjectId);
    await transaction.mergeCoins(
      transaction.object(primaryCoin),
      coinsToMerge.map((coinId) => transaction.object(coinId))
    );
    await this.executeTx(transaction);
  }

  async stakeWalToOperator() {
    try {
      await this.mergeCoin();
      const coins = await this.client.getCoins({
        owner: this.address,
        coinType: COINENUM.WAL,
      });

      if (!coins.data || coins.data.length === 0) {
        return;
      }

      const coin = coins.data[0];
      const amountToStake = 1 * MIST_PER_SUI;

      const poolObject = await this.client.getObject({
        id: this.walrusPoolObjectId,
        options: {
          showBcs: true,
          showContent: true,
          showOwner: true,
        },
      });

      const transaction = new Transaction();
      const sharedPoolObject = transaction.sharedObjectRef({
        objectId: poolObject.data.objectId,
        initialSharedVersion: poolObject.data.owner.Shared.initial_shared_version,
        mutable: true,
      });

      const coinToStake = await transaction.splitCoins(
        transaction.object(coin.coinObjectId),
        [amountToStake]
      );

      const stakedCoin = transaction.moveCall({
        target: `${this.walrusAddress}::staking::stake_with_pool`,
        arguments: [
          sharedPoolObject,
          transaction.object(coinToStake),
        ],
      });

      await transaction.transferObjects([stakedCoin], this.address);
      await this.executeTx(transaction);
    } catch (error) {
      throw error;
    }
  }

  async executeTx(transaction) {
    const result = await this.client.signAndExecuteTransaction({
      signer: this.wallet,
      transaction: transaction,
    });
    await this.getBalance();
  }

  async getBalance() {
    this.balance = await this.client.getAllBalances({
      owner: this.address,
    });
    this.balance = this.balance.map((balance) => {
      balance.totalBalance = parseFloat(
        (Number(balance.totalBalance) / Number(MIST_PER_SUI)).toFixed(2)
      );
      return balance;
    });
  }
}
