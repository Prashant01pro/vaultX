import mongoose from 'mongoose'

const encryptedDataSchema = new mongoose.Schema(
    {

        ciphertext: {
            type: String,
            required: true
        },
        iv: {
            type: String,
            required: true
        },
        authTag: {
            type: String,
            required: true
        },
        algorithm: {
            type: String,
            required: true,
            enum: ['aes-256-gcm']
        }
    },
    {
        _id: false

    }
)

const secretSchema = new mongoose.Schema(
    {
        vaultId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vault',
            required: true,
            index: true
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'authUser',
            required: true
        },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'authUser',
            required: true
        },

        type: {
            type: String,
            enum: [
                'login',
                'secure_note',
                'api_key',
                'ssh_key',
                'wifi_credential',
                'software_license',
                'recovery_codes'
            ],
            required: true,
            default: 'login'
        },

        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 120
        },

        tags: {
            type: [String],
            default: []
        },

        isFavorite: {
            type: Boolean,
            default: false
        },

        isArchived: {
            type: Boolean,
            default: false
        },

        isDeleted: {
            type: Boolean,
            default: false
        },

        deletedAt: {
            type: Date,
            default: null
        },
        archivedAt: {
            type: Date,
            default: null
        },

        encryptedData: {
            type: encryptedDataSchema,
            required: true
        },

        encryptionKeyVersion: {
            type: Number,
            required: true,
            default: 1
        }
    },
    {
        timestamps: true
    }

)

secretSchema.index({ vaultId: 1, isDeleted: 1, isArchived: 1 })

export const Secret = mongoose.model('Secret', secretSchema)
