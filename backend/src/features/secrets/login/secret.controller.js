import AppError from '../../../utils/appError.js';
import { catchAsync } from '../../../utils/catchAsync.js';
import { archiveSecretService, createLoginSecretService, createSecureNoteService, createSecretService, deleteSecretService, getSecretService, listDeletedSecretsService, listSecretService, permanentlyDeleteSecretService, restoreSecretArchiveService, restoreSecretService, updateSecretService, updateSecretFavoriteService } from './secret.service.js';

export const createSecret = catchAsync(async (req, res) => {
    const { type = 'login', ...payload } = req.body;
    const secret = await createSecretService(
        req.user.id,
        req.vaultAccess,
        type,
        payload
    );

    res.status(201).json({
        message: `${type} secret created successfully`,
        secret: {
            id: secret._id,
            vaultId: secret.vaultId,
            type: secret.type,
            title: secret.title,
            tags: secret.tags,
            isFavorite: secret.isFavorite,
            createdAt: secret.createdAt,
            updatedAt: secret.updatedAt
        }
    });
});


export const createLoginSecret = catchAsync(async (req, res) => {
    const secret = await createLoginSecretService(req.user.id, req.vaultAccess, req.body);

    res.status(201).json({
        message: 'Login secret created successfully',
        secret: {
            id: secret._id,
            vaultId: secret.vaultId,
            type:secret.type,
            title:secret.title,
            tags:secret.tags,
            isFavorite:secret.isFavorite,
            createdAt:secret.createdAt,
            updatedAt:secret.updatedAt
        }
    })
})

export const createSecureNote = catchAsync(async (req, res) => {
    const secret = await createSecureNoteService(
        req.user.id,
        req.vaultAccess,
        req.body
    );

    res.status(201).json({
        message: 'Secure note created successfully',
        secret: {
            id: secret._id,
            vaultId: secret.vaultId,
            type: secret.type,
            title: secret.title,
            tags: secret.tags,
            isFavorite: secret.isFavorite,
            createdAt: secret.createdAt,
            updatedAt: secret.updatedAt
        }
    });
});

export const getSecret=catchAsync(async(req,res)=>{
    const secret=await getSecretService(req.user.id,req.vaultAccess,req.params.itemId);

    res.status(200).json({
        secret
    })
})

export const listSecrets=catchAsync(async(req,res)=>{
    const result=await listSecretService(req.vaultAccess,req.query);
    res.status(200).json(result);
})

export const updateSecret = catchAsync(
    async (req, res) => {
        const secret = await updateSecretService(
            req.user.id,
            req.vaultAccess,
            req.params.itemId,
            req.body
        );

        res.status(200).json({
            message: 'Secret updated successfully',
            secret: {
                id: secret._id,
                vaultId: secret.vaultId,
                type: secret.type,
                title: secret.title,
                tags: secret.tags,
                isFavorite: secret.isFavorite,
                updatedAt: secret.updatedAt
            }
        });
    }
);

export const deleteSecret = catchAsync(async (req, res) => {
    await deleteSecretService(
        req.user.id,
        req.vaultAccess,
        req.params.itemId
    );

    res.status(200).json({
        message: 'Secret moved to trash'
    });
});

export const listDeletedSecrets = catchAsync(
    async (req, res) => {
        const secrets =
            await listDeletedSecretsService(
                req.vaultAccess
            );

        res.status(200).json({
            secrets: secrets.map((secret) => ({
                id: secret._id,
                vaultId: secret.vaultId,
                type: secret.type,
                title: secret.title,
                tags: secret.tags,
                isFavorite: secret.isFavorite,
                deletedAt: secret.deletedAt,
                createdAt: secret.createdAt,
                updatedAt: secret.updatedAt
            }))
        });
    }
);

export const restoreSecret = catchAsync(
    async (req, res) => {
        const secret =
            await restoreSecretService(
                req.user.id,
                req.vaultAccess,
                req.params.itemId
            );

        res.status(200).json({
            message: 'Secret restored successfully',
            secret: {
                id: secret._id,
                vaultId: secret.vaultId,
                type: secret.type,
                title: secret.title,
                tags: secret.tags,
                isFavorite: secret.isFavorite,
                deletedAt: secret.deletedAt
            }
        });
    }
);

export const permanentlyDeleteSecret = catchAsync(
    async (req, res) => {
        const { currentPassword } = req.body;

        if (
            typeof currentPassword !== 'string' ||
            currentPassword.length === 0
        ) {
            throw new AppError(
                'Current password is required',
                400
            );
        }

        await permanentlyDeleteSecretService(
            req.user.id,
            req.vaultAccess,
            req.params.itemId,
            currentPassword
        );

        res.status(200).json({
            message: 'Secret permanently deleted'
        });
    }
);

export const updateSecretFavorite = catchAsync(
    async (req, res) => {
        const { isFavorite } = req.body;

        const secret =
            await updateSecretFavoriteService(
                req.vaultAccess,
                req.params.itemId,
                isFavorite
            );

        res.status(200).json({
            message: isFavorite
                ? 'Secret added to favorites'
                : 'Secret removed from favorites',
            secret: {
                id: secret._id,
                title: secret.title,
                isFavorite: secret.isFavorite
            }
        });
    }
);

export const archiveSecret = catchAsync(
    async (req, res) => {
        await archiveSecretService(
            req.user.id,
            req.vaultAccess,
            req.params.itemId
        );

        res.status(200).json({
            message: 'Secret archived successfully'
        });
    }
);

export const restoreSecretArchive = catchAsync(
    async (req, res) => {
        await restoreSecretArchiveService(
            req.user.id,
            req.vaultAccess,
            req.params.itemId
        );

        res.status(200).json({
            message: 'Secret restored successfully'
        });
    }
);
