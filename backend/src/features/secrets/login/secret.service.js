import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { Secret } from './secret.model.js';
import { authUser } from '../../auth/auth.model.js';
import AppError from '../../../utils/appError.js';
import { createEncryptionService } from '../../../infrastructure/kms/kms.factory.js';
import {
    validateSecretInput,
    validateSecretUpdateInput
} from './secret.validation.js';

export const SECRET_TYPES = [
    'login',
    'secure_note',
    'api_key',
    'ssh_key',
    'wifi_credential',
    'software_license',
    'recovery_codes'
];

const createEncryptedSecret = async ({
    userId,
    vaultAccess,
    type,
    title,
    tags,
    payload
}) => {
    const vaultId = vaultAccess.vault._id.toString();

    const secret = new Secret({
        vaultId,
        createdBy: userId,
        updatedBy: userId,
        type,
        title,
        tags,
        encryptedData: {
            ciphertext: 'pending',
            iv: 'pending',
            authTag: 'pending',
            algorithm: 'aes-256-gcm'
        }
    });

    const encryptionService = createEncryptionService();
    const vaultKey = await encryptionService.getVaultDataKey(
        vaultAccess.vault
    );

    try {
        secret.encryptedData = encryptionService.encryptText(
            JSON.stringify(payload),
            vaultKey,
            `item:${vaultId}:${secret._id}`
        );

        await secret.save();
    } finally {
        vaultKey.fill(0);
    }

    return secret;
};

export const createLoginSecretService = async (
    userId,
    vaultAccess,
    input
) => {
    const data = validateLoginInput(input);

    return createEncryptedSecret({
        userId,
        vaultAccess,
        type: 'login',
        title: data.title,
        tags: data.tags,
        payload: {
            website: data.website,
            username: data.username,
            password: data.password,
            url: data.url,
            notes: data.notes
        }
    });
};

export const createSecureNoteService = async (
    userId,
    vaultAccess,
    input
) => {
    const data = validateSecureNoteInput(input);

    return createEncryptedSecret({
        userId,
        vaultAccess,
        type: 'secure_note',
        title: data.title,
        tags: data.tags,
        payload: {
            content: data.content
        }
    });
};

export const createSecretService = async (
    userId,
    vaultAccess,
    type = 'login',
    input
) => {
    if (!SECRET_TYPES.includes(type)) {
        throw new AppError('Invalid secret type', 400);
    }

    const data = validateSecretInput(type, input);
    const { title, tags, ...payload } = data;

    return createEncryptedSecret({
        userId,
        vaultAccess,
        type,
        title,
        tags,
        payload
    });
};

export const getSecretService = async (
    userId,
    vaultAccess,
    itemId
) => {
    if (!mongoose.isValidObjectId(itemId)) {
        throw new AppError('Invalid secret ID', 400);
    }

    const secret = await Secret.findOne({
        _id: itemId,
        vaultId: vaultAccess.vault._id,
        isDeleted: false,
        isArchived: false
    });

    if (!secret) {
        throw new AppError('Secret not found', 404);
    }

    const encryptionService = createEncryptionService();
    const vaultKey = await encryptionService.getVaultDataKey(
        vaultAccess.vault
    );

    try {
        const plaintext = encryptionService.decryptText(
            secret.encryptedData,
            vaultKey,
            `item:${vaultAccess.vault._id}:${secret._id}`
        );

        let payload;

        try {
            payload = JSON.parse(plaintext);
        } catch {
            throw new AppError(
                'Stored secret data is invalid',
                500
            );
        }

        return {
            id: secret._id,
            vaultId: secret.vaultId,
            type: secret.type,
            title: secret.title,
            tags: secret.tags,
            isFavorite: secret.isFavorite,
            createdAt: secret.createdAt,
            updatedAt: secret.updatedAt,
            data: payload
        };
    } finally {
        vaultKey.fill(0);
    }
};

const escapeRegex = (value) => value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
);

export const listSecretService = async (
    vaultAccess,
    query = {}
) => {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(
        Math.max(Number(query.limit) || 20, 1),
        100
    );

    const filter = {
        vaultId: vaultAccess.vault._id,
        isDeleted: false,
        isArchived: false
    };

    if (query.type !== undefined) {
        if (!SECRET_TYPES.includes(query.type)) {
            throw new AppError('Invalid secret type', 400);
        }

        filter.type = query.type;
    }

    if (query.favorite !== undefined) {
        if (!['true', 'false'].includes(query.favorite)) {
            throw new AppError(
                'favorite must be true or false',
                400
            );
        }

        filter.isFavorite = query.favorite === 'true';
    }

    if (
        typeof query.search === 'string' &&
        query.search.trim().length > 0
    ) {
        const regex = new RegExp(
            escapeRegex(query.search.trim()),
            'i'
        );

        filter.$or = [
            { title: regex },
            { tags: regex },
            { type: regex }
        ];
    }

    const allowedSorts = [
        'createdAt',
        '-createdAt',
        'updatedAt',
        '-updatedAt',
        'title',
        '-title'
    ];

    const sort = allowedSorts.includes(query.sort)
        ? query.sort
        : '-updatedAt';

    const [secrets, total] = await Promise.all([
        Secret.find(filter)
            .select(
                'vaultId type title tags isFavorite ' +
                'createdAt updatedAt'
            )
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit),
        Secret.countDocuments(filter)
    ]);

    return {
        items: secrets,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

export const updateSecretService = async (
    userId,
    vaultAccess,
    itemId,
    input
) => {
    if (!mongoose.isValidObjectId(itemId)) {
        throw new AppError('Invalid secret ID', 400);
    }

    const secret = await Secret.findOne({
        _id: itemId,
        vaultId: vaultAccess.vault._id,
        isDeleted: false,
        isArchived: false
    });

    if (!secret) {
        throw new AppError('Secret not found', 404);
    }

    const validatedInput = validateSecretUpdateInput(secret.type, input);

    const encryptionService = createEncryptionService();
    const vaultKey = await encryptionService.getVaultDataKey(
        vaultAccess.vault
    );

    try {
        let currentPayload;

        try {
            const plaintext = encryptionService.decryptText(
                secret.encryptedData,
                vaultKey,
                `item:${vaultAccess.vault._id}:${secret._id}`
            );

            currentPayload = JSON.parse(plaintext);
        } catch {
            throw new AppError(
                'Unable to decrypt secret data',
                500
            );
        }

        const encryptedFields = Object.keys(validatedInput).filter(
            (field) => !['title', 'tags'].includes(field)
        );

        for (const field of encryptedFields) {
            if (
                Object.hasOwn(validatedInput, field) &&
                validatedInput[field] !== undefined
            ) {
                currentPayload[field] = validatedInput[field];
            }
        }

        if (
            Object.hasOwn(validatedInput, 'title') &&
            validatedInput.title !== undefined
        ) {
            secret.title = validatedInput.title;
        }

        if (
            Object.hasOwn(validatedInput, 'tags') &&
            validatedInput.tags !== undefined
        ) {
            secret.tags = validatedInput.tags;
        }

        secret.encryptedData = encryptionService.encryptText(
            JSON.stringify(currentPayload),
            vaultKey,
            `item:${vaultAccess.vault._id}:${secret._id}`
        );

        secret.updatedBy = userId;

        await secret.save();

        return secret;
    } finally {
        vaultKey.fill(0);
    }
};

export const deleteSecretService = async (
    userId,
    vaultAccess,
    itemId
) => {
    const secret = await Secret.findOne({
        _id: itemId,
        vaultId: vaultAccess.vault._id,
        isDeleted: false
    });

    if (!secret) throw new AppError('Secret not found', 404);

    secret.isDeleted = true;
    secret.deletedAt = new Date();
    secret.updatedBy = userId;
    await secret.save();
};

export const listDeletedSecretsService = async (vaultAccess) => {
    return Secret.find({
        vaultId: vaultAccess.vault._id,
        isDeleted: true
    })
        .select('vaultId type title tags isFavorite deletedAt createdAt updatedAt')
        .sort({ deletedAt: -1 });
};

export const restoreSecretService = async (
    userId,
    vaultAccess,
    itemId
) => {
    const secret = await Secret.findOne({
        _id: itemId,
        vaultId: vaultAccess.vault._id,
        isDeleted: true
    });

    if (!secret) {
        throw new AppError('Deleted secret not found', 404);
    }

    secret.isDeleted = false;
    secret.deletedAt = null;
    secret.updatedBy = userId;
    await secret.save();
    return secret;
};

export const permanentlyDeleteSecretService = async (
    userId,
    vaultAccess,
    itemId,
    currentPassword
) => {
    const user = await authUser
        .findById(userId)
        .select('+password');

    if (!user) throw new AppError('User no longer exists', 404);

    const matches = await bcrypt.compare(
        currentPassword,
        user.password
    );

    if (!matches) {
        throw new AppError(
            'Current password is incorrect',
            401
        );
    }

    const secret = await Secret.findOne({
        _id: itemId,
        vaultId: vaultAccess.vault._id,
        isDeleted: true
    });

    if (!secret) {
        throw new AppError('Deleted secret not found', 404);
    }

    await Secret.deleteOne({
        _id: secret._id,
        vaultId: vaultAccess.vault._id
    });
};

export const updateSecretFavoriteService = async (
    vaultAccess,
    itemId,
    isFavorite
) => {
    if (!mongoose.isValidObjectId(itemId)) {
        throw new AppError('Invalid secret ID', 400);
    }

    if (typeof isFavorite !== 'boolean') {
        throw new AppError('isFavorite must be boolean', 400);
    }

    const secret = await Secret.findOne({
        _id: itemId,
        vaultId: vaultAccess.vault._id,
        isDeleted: false,
        isArchived: false
    });

    if (!secret) throw new AppError('Secret not found', 404);

    secret.isFavorite = isFavorite;
    await secret.save();
    return secret;
};

export const archiveSecretService = async (
    userId,
    vaultAccess,
    itemId
) => {
    const secret = await Secret.findOne({
        _id: itemId,
        vaultId: vaultAccess.vault._id,
        isDeleted: false,
        isArchived: false
    });

    if (!secret) throw new AppError('Secret not found', 404);

    secret.isArchived = true;
    secret.archivedAt = new Date();
    secret.updatedBy = userId;
    await secret.save();
};

export const restoreSecretArchiveService = async (
    userId,
    vaultAccess,
    itemId
) => {
    const secret = await Secret.findOne({
        _id: itemId,
        vaultId: vaultAccess.vault._id,
        isDeleted: false,
        isArchived: true
    });

    if (!secret) {
        throw new AppError('Archived secret not found', 404);
    }

    secret.isArchived = false;
    secret.archivedAt = null;
    secret.updatedBy = userId;
    await secret.save();
};
