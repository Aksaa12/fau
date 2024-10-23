import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { requestSuiFromFaucetV0, getFaucetHost } from "@mysten/sui/faucet";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import fs from 'fs';

// Fungsi untuk membaca kunci privat dari file
function loadPrivateKeys() {
  const data = fs.readFileSync('data.txt', 'utf-8');
  return data.split('\n').filter(line => line.trim() !== ''); // Menghapus baris kosong
}

// Memuat kunci privat dari file
const privateKeys = loadPrivateKeys();

async function requestFaucet(privateKey) {
  let address; // Mendefinisikan address di sini
  try {
    // Dekode kunci privat untuk mendapatkan alamat dompet
    const decodedPrivateKey = decodeSuiPrivateKey(privateKey);
    const wallet = Ed25519Keypair.fromSecretKey(decodedPrivateKey.secretKey);
    address = wallet.getPublicKey().toSuiAddress();

    console.log("Meminta 1 SUI untuk alamat:", address);

    // Meminta 1 SUI dari faucet
    const response = await requestSuiFromFaucetV0({
      host: getFaucetHost("testnet"),
      recipient: address,
      amount: 1 * Math.pow(10, 9) // Mengatur jumlah ke 1 SUI (dalam unit terkecil)
    });

    console.log("Respon faucet untuk alamat", address, ":", response);
  } catch (error) {
    console.error("Permintaan faucet gagal untuk alamat", address || "tidak diketahui", ":", error);
    // Jika terjadi kesalahan, kita bisa mencoba untuk menyegarkan permintaan
    setTimeout(() => refreshRequests(), 10000); // Menunggu 10 detik sebelum mencoba kembali
  }
}

// Fungsi untuk meminta SUI untuk semua kunci privat
async function requestForAllKeys() {
  for (const privateKey of privateKeys) {
    await requestFaucet(privateKey);
  }
}

// Fungsi untuk menyegarkan skrip
async function refreshRequests() {
  console.log("Menyegarkan permintaan...");
  await requestForAllKeys();
}

// Set interval untuk meminta SUI setiap 10 detik
setInterval(refreshRequests, 10000);

// Panggilan awal untuk memulai proses segera
refreshRequests();
