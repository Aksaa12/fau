const axios = require('axios');
const crypto = require('crypto');

// Ganti dengan private key Anda
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
    // 1. Ambil public key dari private key (menggunakan lib crypto atau lib spesifik SUI jika ada)
    const publicKey = getPublicKeyFromPrivateKey(privateKey);

    // 2. Siapkan transaksi untuk staking
    const transaction = {
      sender: publicKey,
      module: "wal",
      function: "stake",
      arguments: [
        stakenodeOperator,
        walAddress,
        walrusPoolObjectId,
      ],
      gasBudget: 10000,  // Budget gas untuk transaksi
    };

    // 3. Tanda tangani transaksi (menggunakan private key)
    const signedTransaction = signTransaction(transaction, privateKey);

    // 4. Kirim transaksi ke RPC SUI untuk dieksekusi
    const response = await axios.post(rpcUrl, {
      jsonrpc: "2.0",
      method: "sui_sendTransaction",
      params: [signedTransaction],
      id: 1,
    });

    // 5. Verifikasi status transaksi
    if (response.data.result.status === "success") {
      console.log("Transaksi staking berhasil!");
    } else {
      console.log(`Terjadi kesalahan: ${response.data.result.error}`);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Fungsi untuk mendapatkan public key dari private key
function getPublicKeyFromPrivateKey(privateKey) {
  // Untuk contoh ini, kita hanya menggunakan algoritma crypto standar untuk menghasilkan public key
  // Anda perlu menggunakan pustaka yang sesuai dengan SUI untuk konversi private key -> public key
  const publicKey = crypto.createECDH('secp256k1');
  publicKey.setPrivateKey(Buffer.from(privateKey, 'hex'));
  return publicKey.getPublicKey('hex');
}

// Fungsi untuk menandatangani transaksi
function signTransaction(transaction, privateKey) {
  // Pseudocode untuk menandatangani transaksi
  // Anda perlu menggunakan pustaka SUI atau pustaka yang relevan untuk menandatangani transaksi
  // Misalnya, menggunakan elliptic curve signing, atau menggunakan SDK SUI yang sesuai.
  const sign = crypto.createSign('SHA256');
  sign.update(JSON.stringify(transaction));
  const signature = sign.sign(privateKey, 'hex');

  return {
    ...transaction,
    signature,
  };
}

// Eksekusi staking
stakeWal();
