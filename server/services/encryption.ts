import crypto from 'crypto';

// 32-byte key for AES-256-GCM
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'sahara-ai-nhaa-secret-key-32-byte-length!';
const KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
const ALGORITHM = 'aes-256-gcm';

export function encryptField(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptField(encryptedText: string): string {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText; // not encrypted
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const ciphertext = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed, returning masked text', err);
    return '***-****';
  }
}

export function maskPhoneNumber(phone: string): string {
  if (!phone) return 'Unknown';
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length < 10) return phone;
  const first2 = clean.slice(0, 2);
  const last3 = clean.slice(-3);
  return `+91 ${first2}*** **${last3}`;
}
