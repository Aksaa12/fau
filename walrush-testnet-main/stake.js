async stakeWalToOperator() {
    console.log("Memulai proses staking..."); // Menambahkan log
    try {
        // Mengambil informasi koin WAL yang dimiliki akun
        const coins = await this.client.getCoins({
            owner: this.acc,
            coinType: COINENUM.WAL,
        });

        console.log("Koin yang didapat:", coins); // Menambahkan log untuk melihat hasil koin

        if (!coins.data || coins.data.length === 0) {
            throw new Error("Tidak ada koin WAL yang tersedia untuk staking.");
        }

        const coin = coins.data[0];
        const balance = coin.balance;

        console.log("Saldo koin:", balance); // Menambahkan log untuk saldo koin

        // Cek apakah jumlah WAL sama dengan 1
        const amountWal = Number((balance / MIST_PER_SUI).toFixed(2));
        if (amountWal !== 1) {
            throw new Error(`Jumlah WAL yang dimiliki adalah ${amountWal}. Hanya bisa stake 1 WAL.`);
        }

        console.log("Jumlah WAL sesuai untuk staking."); // Log jika jumlah WAL sesuai

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

        console.log("Object pool didapat:", poolObject); // Log untuk objek pool

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

        console.log("Koin untuk di-stake telah disiapkan."); // Log setelah koin disiapkan

        const stakedCoin = transaction.moveCall({
            target: `${this.walrusAddress}::staking::stake_with_pool`,
            arguments: [
                sharedPoolObject,
                transaction.object(coinToStake),
            ],
        });

        await transaction.transferObjects([stakedCoin], this.acc);

        console.log("Koin telah ditransfer untuk staking."); // Log setelah transfer koin

        // Eksekusi transaksi
        await this.executeTx(transaction);
    } catch (error) {
        if (error.message && error.message.includes("equivocated")) {
            console.log("Equivocated error: ", error.message);
        } else {
            console.log("Error staking WAL:", error); // Log error
        }
    }
}
