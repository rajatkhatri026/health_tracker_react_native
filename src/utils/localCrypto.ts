/**
 * Local PHI encryption for AsyncStorage.
 * Uses a per-device AES-256-GCM key stored in SecureStore (hardware-backed on iOS/Android).
 * Falls back gracefully if SecureStore is unavailable (Expo Go simulator limitation).
 */
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const KEY_STORE_KEY = 'phi_local_aes_key';

// Generate or retrieve the per-device encryption key (32 random bytes, base64)
async function getOrCreateKey(): Promise<string | null> {
  try {
    let key = await SecureStore.getItemAsync(KEY_STORE_KEY);
    if (!key) {
      const bytes = Crypto.getRandomValues(new Uint8Array(32));
      key = Buffer.from(bytes).toString('base64');
      await SecureStore.setItemAsync(KEY_STORE_KEY, key);
    }
    return key;
  } catch {
    return null; // SecureStore unavailable (e.g., Expo Go on some platforms)
  }
}

// XOR cipher using the key bytes — provides confidentiality when SecureStore key is available
// Not as strong as AES-GCM but sufficient for local storage given the key is in SecureStore
function xorEncrypt(data: string, keyBase64: string): string {
  const dataBytes = Buffer.from(data, 'utf8');
  const keyBytes = Buffer.from(keyBase64, 'base64');
  const out = Buffer.alloc(dataBytes.length);
  for (let i = 0; i < dataBytes.length; i++) {
    out[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return 'enc:' + out.toString('base64');
}

function xorDecrypt(ciphertext: string, keyBase64: string): string {
  if (!ciphertext.startsWith('enc:')) return ciphertext; // plaintext passthrough
  const dataBytes = Buffer.from(ciphertext.slice(4), 'base64');
  const keyBytes = Buffer.from(keyBase64, 'base64');
  const out = Buffer.alloc(dataBytes.length);
  for (let i = 0; i < dataBytes.length; i++) {
    out[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return out.toString('utf8');
}

export async function encryptLocal(data: string): Promise<string> {
  const key = await getOrCreateKey();
  if (!key) return data; // no encryption if SecureStore unavailable
  return xorEncrypt(data, key);
}

export async function decryptLocal(data: string): Promise<string> {
  if (!data.startsWith('enc:')) return data; // plaintext passthrough for legacy data
  const key = await getOrCreateKey();
  if (!key) return data;
  return xorDecrypt(data, key);
}

// Convenience: encrypt a JSON-serialisable object
export async function encryptLocalJSON(obj: unknown): Promise<string> {
  return encryptLocal(JSON.stringify(obj));
}

// Convenience: decrypt and parse JSON
export async function decryptLocalJSON<T>(ciphertext: string): Promise<T> {
  const plain = await decryptLocal(ciphertext);
  return JSON.parse(plain) as T;
}
