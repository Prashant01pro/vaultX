export class kmsProvider{
    async generateDataKey(){
        throw new Error('generateDataKey() must be implemented')
    }

    async decryptDataKey(){
        throw new Error('decryptDataKey() must be implemented')
    }
}