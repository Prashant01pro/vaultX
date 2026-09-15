import crypto from 'crypto';
import { kmsProvider } from './kms.provider.js';
import { version } from 'os';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;

const contextToBuffer = (encryptionContext) => {
    return Buffer.from(encryptionContext, 'utf-8')
}

export class LocalKmsProvider extends kmsProvider {
    constructor({ masterKey }) {
        super();

        if (!masterKey) {
            throw new Error('Local KMS master key is required')
        }

        const decodedKey = Buffer.from(masterKey, 'base64');

        if (decodedKey.length !== KEY_LENGTH) {
            throw new Error('Local KMS master key must decode to 32 bytes')
        }

        this.masterKey = decodedKey;
        this.keyId = 'local-development-master-key'
        this.keyVersion = 1
    }

    async generateDataKey({ encryptionContext }) {
        const plaintextKey = crypto.randomBytes(KEY_LENGTH);

        const encryptedKey = this.#wrapKey(plaintextKey, encryptionContext);

        return {
            plaintextKey,
            encryptedKey,
            keyId: this.keyId,
            keyVersion: this.keyVersion

        }
    }

    async decryptDataKey({ encryptedKey, encryptionContext }) {
        return this.#unwrapKey(encryptedKey, encryptionContext)
    }

    #wrapKey(key, encryptionContext) {
        const iv = crypto.randomBytes(IV_LENGTH);

        const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv);

        cipher.setAAD(contextToBuffer(encryptionContext))

        const ciphertext = Buffer.concat([cipher.update(key), cipher.final()])

        const authTag = cipher.getAuthTag();

        const envelope = {
            version: 1,
            algorithm: ALGORITHM,
            iv: iv.toString('base64'),
            ciphertext: ciphertext.toString('base64'),
            authTag: authTag.toString('base64')
        }

        return Buffer.from(JSON.stringify(envelope), 'utf-8').toString('base64')
    }

    #unwrapKey(encryptedKey, encryptionContext) {
        let envelope;

        try {
            envelope = JSON.parse(Buffer.from(encryptedKey, 'base64').toString('utf-8'));
        } catch {

            throw new Error('Invalid encrypted data key');
        }

        const decipher=crypto.createDecipheriv(ALGORITHM,this.masterKey,Buffer.from(envelope.iv,'base64'));

        decipher.setAAD(contextToBuffer(encryptionContext));

        decipher.setAuthTag(Buffer.from(envelope.authTag,'base64'));

        return Buffer.concat([
            decipher.update(Buffer.from(envelope.ciphertext,'base64')),decipher.final()
        ]);
    }
}


// LocalKmsProvider
// │
// ├── masterKey       ← from environment
// ├── keyId           ← identifies the local key
// └── keyVersion      ← identifies its version

// #wrapKey is a private class method, and JavaScript only allows #wrapKey to be called if that method is actually declared inside the same class.