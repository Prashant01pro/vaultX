import mongoose from "mongoose";

const vaultSchema = new mongoose.Schema(
    {
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'authUser',
            required: true,
            index: true
        },
        name: {
            type: String,
            required: [true, 'vault name is required'],
            trim: true,
            minlength: 2,
            maxlength: 100
        },
        nameNormalized: {
            type: String,
            required: true
        },
        description: {
            type: String,
            trim: true,
            maxlength: 300,
            default: ''
        },
        isArchived: {
            type: Boolean,
            default: false
        },

        archivedAt: {
            type: Date,
            default: null
        },

        isDefault: {
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
        encryptedDataKey: {
            ciphertext: {
                type: String,
                required: true
            },
            keyId: {
                type: String,
                required: true
            },
            keyVersion: {
                type: Number,
                required: true
            }
        }
    },
    {
        timestamps: true
    }

);

vaultSchema.index({ ownerId: 1, nameNormalized: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
vaultSchema.index({ ownerId: 1, isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } })

export const Vault = mongoose.model('Vault', vaultSchema)