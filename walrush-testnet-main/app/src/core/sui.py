from sui_sdk import Client, Transaction, TransactionArgument, SignatureScheme
from sui_sdk.wallet import Wallet

# Ganti dengan private key Anda
private_key = "suiprivkey1qql5mpg03ns03tsn7lax22tt3nupfewtl459vsxakhzkhx72c48qcuk3svp"

# Alamat Node Staking Walrus
stakenode_operator = "0xcf4b9402e7f156bc75082bc07581b0829f081ccfc8c444c71df4536ea33d094a"

# Alamat WAL yang digunakan untuk staking
wal_address = "0x9f992cc2430a1f442ca7a5ca7638169f5d5c00e0ebc3977a65e9ac6e497fe5ef::wal::WAL"

# Object ID Walrus Pool untuk staking
walrus_pool_object_id = "0x37c0e4d7b36a2f64d51bba262a1791f844cfd88f31379f1b7c04244061d43914"

# Alamat RPC dan testnet SUI
rpc_url = "https://testnet.suivision.xyz/"

# Inisialisasi klien untuk berinteraksi dengan jaringan SUI
client = Client(rpc_url)

# Buat wallet dari private key
wallet = Wallet(private_key)
public_key = wallet.get_public_key()

# Siapkan transaksi staking
transaction = Transaction(
    sender=public_key,
    module="wal",
    function="stake",
    arguments=[
        TransactionArgument(stakenode_operator),
        TransactionArgument(wal_address),
        TransactionArgument(walrus_pool_object_id),
    ],
    gas_budget=10000,  # Budget gas untuk transaksi
    signature_scheme=SignatureScheme.SUI  # Gunakan signature scheme untuk SUI
)

# Tanda tangani transaksi
signed_transaction = wallet.sign_transaction(transaction)

# Kirim transaksi ke jaringan SUI
response = client.submit_transaction(signed_transaction)

# Periksa hasil transaksi
if response["status"] == "success":
    print("Transaksi staking berhasil!")
else:
    print(f"Terjadi kesalahan: {response['error']}")
