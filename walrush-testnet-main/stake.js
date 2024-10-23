import Core from './core1.js'; // Import the Core class

// Memanggil fungsi stakeWalToOperator
(async () => {
  const core = new Core();
  await core.stakeWalToOperator();
})();
