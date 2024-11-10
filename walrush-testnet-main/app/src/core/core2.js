import { Connection, Keypair, TransactionBlock } from '@mysten/sui.js';
import axios from 'axios';

// Ganti dengan private key Anda (SUI private key)
const privateKey = "suiprivkey1qql5mpg03ns03tsn7lax22tt3nupfewtl459vsxakhzkhx72c48qcuk3svp";

// Alamat Node Staking Walrus
const stakenodeOperator = "0xcf4b9402e7f156bc75082bc07581b0829f081ccfc8c444c71df4536ea33d094a";

// Alamat WAL yang digunakan untuk staking
const walAddress = "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef::wal::WAL";

// Object ID Walrus Pool untuk staking
const walrusPoolObjectId = "0x37c0e4d7b36a2f64d51bba262a1791f844cfd88f31379f1b7c04244061d43914";

// Alamat RPC dan testnet SUI
const rpcUrl = "https://testnet.suivision.xyz/";

async function stakeWal() {
  try {
    // 1. Inisialisasi koneksi ke SUI Testnet
    const connection = new Connection({ fullnode: rpcUrl });

    // 2. Inisialisasi Keypair dari private key Anda
    const keypair = Keypair.fromSecretKey(Buffer.from(privateKey, 'hex'));

    // 3. Siapkan transaksi untuk staking
    const transaction = new TransactionBlock();
    transaction.moveCall({
      target: `${walAddress}::wal::stake`,
      arguments: [stakenodeOperator, walrusPoolObjectId],
      gasBudget: 10000, // Budget gas untuk transaksi
    });

    // 4. Tandatangani transaksi dengan private key Anda
    const signedTransaction = await keypair.signTransactionBlock(transaction);

    // 5. Kirim transaksi ke RPC SUI untuk dieksekusi
    const response = await axios.post(rpcUrl, {
      jsonrpc: "2.0",
      method: "sui_sendTransaction",
      params: [signedTransaction],
      id: 1,
    });

    // 6. Verifikasi status transaksi
    if (response.data.result.status === "success") {
      console.log("Transaksi staking berhasil!");
    } else {
      console.log(`Terjadi kesalahan: ${response.data.result.error}`);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Eksekusi staking
stakeWal();
