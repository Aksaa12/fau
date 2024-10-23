export default class Core {
  constructor() {
    try {
      // Membaca private key dari file 'data.txt'
      const privateKey = fs.readFileSync('data.txt', 'utf8').trim();
      this.keypair = Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(privateKey).secretKey);
      
      // Mendapatkan alamat dari kunci publik
      this.acc = this.keypair.getPublicKey().toRawBytes().reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
      console.log("Alamat yang digunakan:", this.acc);
      this.client = new SuiClient({ url: getFullnodeUrl("testnet") });
      this.walrusPoolObjectId = "0x37c0e4d7b36a2f64d51bba262a1791f844cfd88f31379f1b7c04244061d43914";
      this.walrusAddress = "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef";
    } catch (error) {
      console.error("Error initializing Core:", error);
    }
  }

  async getAccountInfo() {
    try {
      const accountInfo = await this.client.getAccount(this.acc);
      console.log("Account Info:", accountInfo);
      return accountInfo;
    } catch (error) {
      console.error("Error getting account info:", error);
      throw error;
    }
  }

  async stakeWalToOperator() {
    try {
        await this.getAccountInfo(); // Ambil info akun
        await this.mergeCoin(); // Pastikan fungsi mergeCoin ada
        await Helper.delay(1000, this.acc, "Try To Stake Wal to Operator", this);
        
        const coins = await this.client.getCoins({
            owner: this.acc, // Ganti 'this.address' menjadi 'this.acc'
            coinType: COINENUM.WAL,
        });

        if (!coins.data || coins.data.length === 0) {
            console.log("No WAL coins available to stake.");
            return;
        }

        const coin = coins.data[0]; // Ambil koin pertama
        const balance = coin.balance;

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
            [balance]
        );

        const stakedCoin = transaction.moveCall({
            target: `${this.walrusAddress}::staking::stake_with_pool`,
            arguments: [
                sharedPoolObject,
                transaction.object(coinToStake),
                transaction.object(operatorObject.data.objectId),
            ],
        });

        await transaction.transferObjects([stakedCoin], this.acc); // Ganti 'this.address' menjadi 'this.acc'
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
        signer: this.keypair,
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
