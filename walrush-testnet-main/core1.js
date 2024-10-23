import fs from 'fs';
import { ethers } from 'ethers';

// COINENUM definition
export class COINENUM {
  static SUI = "0x2::sui::SUI";
  static WAL = "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef::wal::WAL";
  static STAKENODEOPERATOR = "0xcf4b9402e7f156bc75082bc07581b0829f081ccfc8c444c71df4536ea33d094a";
}

// Load private key from data.txt
const privateKey = fs.readFileSync('data.txt', 'utf8').trim();
const provider = new ethers.providers.JsonRpcProvider('URL_NODE_WALRUS'); // Ganti dengan URL node Walrus Anda
const wallet = new ethers.Wallet(privateKey, provider);

async function stakeWAL() {
  try {
    // Check wallet balance
    const balance = await wallet.getBalance();
    const walBalance = ethers.utils.formatUnits(balance, 18); // Ganti 18 dengan jumlah desimal yang benar untuk WAL

    console.log(`Address: ${wallet.address}`);
    console.log(`WAL Balance: ${walBalance}`);

    // Check if balance is sufficient for staking
    if (parseFloat(walBalance) < 1) {
      console.log("Insufficient balance to stake 1 WAL");
      return;
    }

    // Prepare transaction to stake WAL
    const stakingAmount = ethers.utils.parseUnits('1.0', 18); // Ganti 18 dengan jumlah desimal yang benar untuk WAL
    const tx = {
      to: COINENUM.STAKENODEOPERATOR,
      value: stakingAmount,
    };

    // Send transaction
    const transactionResponse = await wallet.sendTransaction(tx);
    console.log(`Staking WAL... Transaction Hash: ${transactionResponse.hash}`);

    // Wait for transaction to be confirmed
    await transactionResponse.wait();
    console.log("Staking successful!");

  } catch (error) {
    console.error("Error during staking:", error);
  }
}

// Execute staking
stakeWAL();
