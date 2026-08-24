import mongoose from "mongoose";

const authSessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'authUser',
            required: true,
            index: true
        },

        // Store only a SHA-256 hash of the raw refresh token.
        refreshTokenHash: {
            type: String,
            required: true,
            select: false
        },

        // Corresponds to `jti` inside the current refresh JWT.
        refreshTokenId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        // Useful for audits and future multi-record token-family handling.
        familyId: {
            type: String,
            required: true,
            index: true
        },

        expiresAt: {
            type: Date,
            required: true
        },

        revokedAt: {
            type: Date,
            default: null
        },

        lastUsedAt: {
            type: Date,
            default: null
        },

        // Hash of the anti-CSRF token, added later in Step 8.
        csrfTokenHash: {
            type: String,
            required: true,
            select: false
        },

        userAgent: {
            type: String,
            default: null
        },

        ipAddress: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// MongoDB automatically removes expired session records.
// It is cleanup, not your authorization check.
authSessionSchema.index( { expiresAt: 1 }, { expireAfterSeconds: 0 });

export const authSession=mongoose.model('authSession',authSessionSchema);
