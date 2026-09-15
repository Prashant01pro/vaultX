import { EncryptionService } from "../../services/encryption.service.js";
import { LocalKmsProvider } from "./local-kms.provider.js";


export const createEncryptionService=()=>{
    const provider=process.env.KMS_PROVIDER|| 'local';

    if(provider === 'local'){
        const localKms=new LocalKmsProvider({masterKey:process.env.VAULT_ENCRYPTION_KEY});

        return new EncryptionService(localKms);
    }

    if(provider==='cloud'){
        throw new Error('Cloud KMS provider is not implemented yet')
    }

    throw new Error(`Unsupported KMS provider:${provider}`)
}