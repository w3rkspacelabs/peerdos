import { browser } from '$app/environment';
import {
    connect,
    disconnect,
    getPublicClient,
    getWalletClient,
    type ConnectErrorType,
    type DisconnectErrorType
} from '@wagmi/core'
import { Wallet } from 'ethers';
import { useSignMessage } from 'wagmi'
import { keccak256, hexToBytes } from 'viem'

// Dynamically import WC only on the client side
import { http, createConfig } from '@wagmi/core'
import { mainnet, sepolia } from '@wagmi/core/chains'
import { formatUnits, type InvalidAddressErrorType, type ReadContractErrorType } from 'viem'

import { generatePrivateKey, sign } from 'viem/accounts'


export const generatePK = generatePrivateKey;
export const generateSecret = generatePrivateKey;

// Only create the config in browser environment
let wagmiConfig: ReturnType<typeof createConfig> | undefined;
let metaMaskConnector: any;

// Only import and initialize in browser environment
if (browser) {
    // Dynamically import metaMask connector to prevent SSR issues
    import('@wagmi/connectors').then(connectors => {
        metaMaskConnector = connectors.metaMask;

        // Create config after imports are loaded
        wagmiConfig = createConfig({
            chains: [mainnet, sepolia],
            connectors: [metaMaskConnector()],
            transports: {
                [mainnet.id]: http(),
                [sepolia.id]: http(),
            },
        });
    }).catch(error => {
        console.error('Failed to load wallet connectors:', error);
    });
}
// let formattedUSDTBalance = $state(MESSAGES.PLACEHOLDER_BALANCE)
// let isBtnDisabled = $state(false)

export async function connectWallet() {
    if (!browser || !wagmiConfig || !metaMaskConnector) {
        console.log('Wallet connection skipped (not in browser or wallet not initialized)');
        return;
    }

    try {
        // const { accounts: wallet } = 
        return connect(wagmiConfig, { connector: metaMaskConnector() })
        // let account = wallet[0]
        // if (account) {
        //     console.log({ account })
        // }
        // isBtnDisabled = false
    } catch (e: any) {
        const error = e as ConnectErrorType | InvalidAddressErrorType
        if (error.name === 'InvalidAddressError') {
            return
        }
        console.error(e)
    }
}

export async function disconnectWallet() {
    if (!browser || !wagmiConfig || !metaMaskConnector) {
        console.log('Wallet connection skipped (not in browser or wallet not initialized)');
        return;
    }
    return disconnect(wagmiConfig)
}

const ENCRYPTION_SEED = 'PEERDOS-ENCRYPTION-SEED'
const LS_SECRETS_KEY = 'PEERDOS-ENCRYPTION-SEED'
const LS_WALLETS_KEY = 'PEERDOS-WALLETS'
let encryptedPayload: { iv: number[]; data: number[] } | null = null
let signature: `0x${string}` | null = null

const getKey = async (signature: `0x${string}`): Promise<CryptoKey> => {
    const rawKey = hexToBytes(keccak256(signature))
    return crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export const getSignature = async () => {
    if (!browser || !wagmiConfig || !metaMaskConnector) {
        console.log('Wallet connection skipped (not in browser or wallet not initialized)');
        return;
    }
    const walletClient = await getWalletClient(wagmiConfig)
    if (!walletClient) throw new Error('Wallet not connected')
    return walletClient.signMessage({ message: ENCRYPTION_SEED })
}

export const encryptAndSaveSecret = async (secret: string, account: string) => {
    const signature = await getSignature();
    if (!signature) return;
    const key = await getKey(signature)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const data = new TextEncoder().encode(secret)

    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)

    encryptedPayload = {
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(cipher)),
    }


    let lsValue = localStorage.getItem(LS_SECRETS_KEY) || JSON.stringify({})
    console.log({ cipher, key, encryptedPayload, lsValue });
    let secrets = JSON.parse(lsValue);
    if (!secrets[account]) {
        secrets[account] = encryptedPayload;
    }
    localStorage.setItem(LS_SECRETS_KEY, JSON.stringify(secrets));
    return encryptedPayload;
}

export const getSavedSecrets = async () => {
    const secrets = JSON.parse(localStorage.getItem(LS_SECRETS_KEY) || "{}");
    return secrets;
}

export const decryptSecret = async (encryptedJSON: any) => {
    const signature = await getSignature();
    // const encryptedPayload = JSON.parse(localStorage.getItem('encryptedPayload') || '{}');
    // const encryptedJSON = JSON.parse(encryptedJSON || '{}');
    if (!encryptedJSON || !signature) return

    const key = await getKey(signature)
    const plainBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(encryptedJSON.iv) },
        key,
        new Uint8Array(encryptedJSON.data)
    )
    const text = new TextDecoder().decode(plainBuffer)
    return text;
    // console.log({ key, plainBuffer, text })
}

export async function saveWallet(pk: string, password: string, account: string) {
    console.log({ pk, password })
    const wallet = new Wallet(pk);
    const encrypted = await wallet.encrypt(password);
    // save encrypted to local storage key "PEERDOS-WALLETS" and value {<account>: <wallet-list>}
    let lsValue = localStorage.getItem(LS_WALLETS_KEY) || JSON.stringify({})
    let wallets = JSON.parse(lsValue);
    if (!wallets[account]) {
        wallets[account] = [];
    }
    wallets[account].push(encrypted)
    localStorage.setItem(LS_WALLETS_KEY, JSON.stringify(wallets));
    return encrypted;
}

export async function getWallets() {
    const wallets = JSON.parse(localStorage.getItem(LS_WALLETS_KEY) || "{}");
    return wallets;
}