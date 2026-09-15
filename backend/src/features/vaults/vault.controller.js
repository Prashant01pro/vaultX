import AppError from "../../utils/appError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { addVaultMemberService, archiveVaultService, createVaultService, deletedVaultService, listDeletedVaultsService, listUserVaultsService, listVaultMembersService, permanentlyDeleteVaultService, restoreDeletedVaultService, restoreVaultService, setDefaultVaultService, updateVaultService } from "./vault.service.js";

export const createVault = catchAsync(async (req, res) => {
    const { name, description } = req.body;

    if (typeof name !== 'string') {
        throw new AppError('Vault name must be text', 400)
    }

    const vault = await createVaultService(req.user.id, { name, description: typeof description === 'string' ? description : '' })

    res.status(201).json({
        message: 'vault created successfully',
        vault
    })
})

export const listVaults = catchAsync(async (req, res) => {
    const vaults = await listUserVaultsService(req.user.id);

    res.status(200).json({ vaults })
})

export const updateVault = catchAsync(async (req, res) => {

    const vault = await updateVaultService(req.user.id, req.params.vaultId, req.body);

    res.status(200).json({
        message: 'vault updated successfully',
        vault: {
            id: vault._id,
            name: vault.name,
            description: vault.description,
            isArchived: vault.isArchived,
            isDefault: vault.isDefault,
            createdAt: vault.createdAt,
            updatedAt: vault.updatedAt
        }
    })

})

export const archiveVault = catchAsync(async (req, res) => {
    await archiveVaultService(req.user.id, req.params.vaultId);

    res.status(200).json({
        message: 'Vault archived successfully'
    });
});

export const restoreVault = catchAsync(async (req, res) => {
    await restoreVaultService(req.user.id, req.params.vaultId);

    res.status(200).json({
        message: 'Vault restored successfully'
    });
});

export const setDefaultVault = catchAsync(async (req, res) => {
    const vault = await setDefaultVaultService(req.user.id, req.params.vaultId)

    res.status(200).json({
        message: 'Default vault updated successfully',
        vault: {
            id: vault._id,
            name: vault.name,
            isDefault: vault.isDefault
        }
    })
})

export const deleteVault = catchAsync(async (req, res) => {
    await deletedVaultService(req.user.id, req.params.vaultId);

    res.status(200).json({
        message: 'Vault moved to trash'
    });
})

export const listDeletedVaults = catchAsync(async (req, res) => {
    const vaults = await listDeletedVaultsService(req.user.id);

    res.status(200).json({
        vaults
    });
});

export const restoreDeletedVault = catchAsync(async (req, res) => {
    const vault = await restoreDeletedVaultService(req.user.id, req.params.vaultId);

    res.status(200).json({
        message: 'Vault restored successfully',
        vault: {
            id: vault._id,
            name: vault.name,
            isDeleted: vault.isDeleted,
            isArchived: vault.isArchived,
            isDefault: vault.isDefault
        }
    });
});

export const permanentlyDeleteVault = catchAsync(async (req, res) => {
    const { currentPassword, confirmationName } = req.body;

    if (typeof currentPassword !== 'string' || typeof confirmationName !== 'string') {
        throw new AppError('Password and vault-name confirmation are required', 400)
    }

    await permanentlyDeleteVaultService(req.user.id, req.params.vaultId, currentPassword, confirmationName);
    res.status(200).json({
        message: 'Vault permanently deleted'
    })
})

export const addVaultMember = catchAsync(async (req, res) => {
    const { email, role } = req.body;

    if (typeof email !== 'string') {
        throw new AppError('Member email is required', 400);
    }

    const member = await addVaultMemberService(req.user.id, req.params.vaultId, email, role)

    res.status(201).json({
        message: 'Vault member added successfully',
        member: {
            id: member._id,
            vaultId: member.vaultId,
            userId: member.userId,
            role: member.role,
            createdAt: member.createdAt
        }
    })
})

export const listVaultMembers = catchAsync(async (req, res) => {
    const members = await listVaultMembersService(req.user.id, req.params.vaultId);

    res.status(200).json({
        members: members.map((member) => (
            {
                id: member._id,
                role: member.role,
                user: {
                    id: member.userId._id,
                    username: member.userId.username,
                    name: member.userId.name,
                    email: member.userId.email
                },
                addedBy: member.addedBy ? { id: member.addedBy._id, username: member.addedBy.username, name: member.addedBy.name } : null,
                createdAt: member.createdAt
            }
        ))
    })
})
