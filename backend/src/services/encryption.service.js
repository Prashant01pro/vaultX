import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

export class EncryptionService {
    constructor(kmsProvider) {
        this.kmsProvider = kmsProvider;
    }

    async createVaultDataKey(vaultId) {
        const result = await this.kmsProvider.generateDataKey({
            encryptionContext: `vault-key:${vaultId}`
        });

        // The plaintext key is intentionally discarded.
        result.plaintextKey.fill(0);

        return {
            ciphertext: result.encryptedKey,
            keyId: result.keyId,
            keyVersion: result.keyVersion
        };
    }

    async getVaultDataKey(vault) {
        const key = await this.kmsProvider.decryptDataKey({
            encryptedKey: vault.encryptedDataKey.ciphertext,
            encryptionContext: `vault-key:${vault._id}`
        });

        if (key.length !== KEY_LENGTH) {
            throw new Error('Invalid vault data key');
        }

        return key;
    }

    encryptText(text, key, encryptionContext) {
        if (!Buffer.isBuffer(key)) {
            throw new Error('Encryption key must be a Buffer');
        }

        const iv = crypto.randomBytes(IV_LENGTH);

        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        cipher.setAAD(Buffer.from(encryptionContext, 'utf8'));

        const ciphertext = Buffer.concat([
            cipher.update(Buffer.from(text, 'utf8')),
            cipher.final()
        ]);

        const authTag = cipher.getAuthTag();

        return {
            ciphertext: ciphertext.toString('base64'),
            iv: iv.toString('base64'),
            authTag: authTag.toString('base64'),
            algorithm: ALGORITHM
        };
    }

    decryptText(encryptedValue, key, encryptionContext) {
        const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(encryptedValue.iv, 'base64'));

        decipher.setAAD(Buffer.from(encryptionContext, 'utf8'));

        decipher.setAuthTag(Buffer.from(encryptedValue.authTag, 'base64'));

        const plaintext = Buffer.concat([
            decipher.update(Buffer.from(encryptedValue.ciphertext, 'base64')),
            decipher.final()
        ]);

        return plaintext.toString('utf8');
    }
}
