import mongoose from 'mongoose'

const vaultMemberSchema = new mongoose.Schema(
    {
        vaultId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vault',
            required: true,
            index: true
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'authUser',
            required: true,
            index: true
        },

        role: {
            type: String,
            enum: ['admin', 'editor', 'viewer'],
            required: true,
            default: 'viewer'
        },

        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'authUser',
            required: true
        }
    },
    {
        timestamps: true
    }
)

vaultMemberSchema.index({ vaultId: 1, userId: 1 }, { unique: true })

export const VaultMember = mongoose.model('VaultMember', vaultMemberSchema)


// owner
//   Full control

// admin
//   Manage members and permissions

// editor
//   Create, update, delete permitted items

// viewer
//   Read permitted items only