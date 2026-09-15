import AppError from "../../utils/appError.js";
import { authUser } from "../auth/auth.model.js";
import { Vault } from "./vault.model.js";
import mongoose from "mongoose";
import bcrypt from 'bcrypt'
import { VaultMember } from "./vault-member.model.js";
import { createEncryptionService } from "../../infrastructure/kms/kms.factory.js";



export const createVaultService = async (userId, { name, description = '' }) => {

    if (typeof name !== 'string') {
        throw new AppError('Vault name must be text', 400);
    }

    if (typeof description !== 'string') {
        throw new AppError('Vault description must be text', 400);
    }

    const cleanName = name.trim()
    const cleanDescription = description.trim();
    const nameNormalized = cleanName.toLowerCase();

    if (cleanName.length < 2 || cleanName.length > 80) {
        throw new AppError('vault name must contain between 2 and 80 characters', 400);
    }
    if (cleanDescription.length > 300) {
        throw new AppError('Vault description cannot exceed 300 characters', 400);
    }


    const existingVault = await Vault.findOne({ ownerId: userId, nameNormalized, isDeleted: false })

    if (existingVault) {
        throw new AppError('You already have a vault with this name', 409);
    }

    const existingVaultCount = await Vault.countDocuments({ ownerId: userId, isDeleted: false });

    const isDefault = existingVaultCount === 0;

    // Mongoose generates the _id before saving.
    const vault = new Vault({
        ownerId: userId,
        name: cleanName,
        nameNormalized,
        description: cleanDescription,
        isDefault,
        isDeleted: false,
        isArchived: false
    });

    const encryptionService = createEncryptionService();
    const encryptedDataKey = await encryptionService.createVaultDataKey(vault._id.toString())
    vault.encryptedDataKey = encryptedDataKey;

    try {
        // return await Vault.create({
        //     ownerId: userId,
        //     name: cleanName,
        //     nameNormalized,
        //     description,
        //     isDefault: existingVaultCount === 0
        // })

        await vault.save()

    } catch (error) {
        if (error.code === 11000) {
            throw new AppError('You already have a vault with this name', 409)
        }
        throw error;
    }
    return vault;

}

export const listUserVaultsService = async (userId) => {
    const memberships = await VaultMember.find({ userId }).select('vaultId role');

    const membershipMap = new Map(
        memberships.map((membership) => [
            membership.vaultId.toString(),
            membership.role
        ])
    );

    const vaults = await Vault.find({
        isArchived: false,
        isDeleted: false,
        $or: [
            { ownerId: userId },
            {
                _id: {
                    $in: memberships.map(
                        (membership) => membership.vaultId
                    )
                }
            }
        ]
    }).sort({ isDefault: -1, createdAt: 1 });

    return vaults.map((vault) => {
        const isOwner = vault.ownerId.toString() === userId.toString();

        return {
            id: vault._id,
            name: vault.name,
            description: vault.description,
            isDefault: isOwner ? vault.isDefault : false,
            role: isOwner ? 'owner' : membershipMap.get(vault._id.toString()),
            createdAt: vault.createdAt,
            updatedAt: vault.updatedAt
        };
    });
}

export const updateVaultService = async (userId, vaultId, { name, description }) => {
    if (!mongoose.isValidObjectId(vaultId)) {
        throw new AppError('Invalid vault ID', 400);
    }

    const vault = await Vault.findOne({
        _id: vaultId,
        ownerId: userId,
        isArchived: false,
        isDeleted: false
    })

    if (!vault) {
        throw new AppError('Vault not found', 404);
    }


    if (name !== undefined) {
        if (typeof name !== 'string') {
            throw new AppError('Vault name must be text', 400)
        }

        const cleanName = name.trim();

        if (cleanName.length < 2 || cleanName.length > 80) {
            throw new AppError('Vault name must contain between 2 and 80 characters', 400)
        }

        const nameNormalized = cleanName.toLowerCase();

        const duplicate = await Vault.findOne({
            ownerId: userId, nameNormalized, isDeleted: false, _id: { $ne: vaultId }
        });

        if (duplicate) {
            throw new AppError('You already have a vault with this name', 409);
        }

        vault.name = cleanName;
        vault.nameNormalized = nameNormalized;
    }

    if (description !== undefined) {
        if (typeof description !== 'string') {
            throw new AppError('Description must be text', 400);
        }

        if (description.length > 300) {
            throw new AppError('Description cannot exceed 300 characters', 400);
        }

        vault.description = description.trim();
    }

    try {
        await vault.save();
    } catch (error) {
        if (error.code === 11000) {
            throw new AppError('You already have a vault with this name', 409);
        }

        throw error;
    }

    return vault;
}

export const archiveVaultService = async (userId, vaultId) => {
    if (!mongoose.isValidObjectId(vaultId)) {
        throw new AppError('Invalid vault ID', 400);
    }

    const vault = await Vault.findOne({ _id: vaultId, ownerId: userId, isArchived: false, isDeleted: false });
    if (!vault) {
        throw new AppError('Vault not found', 404);
    }

    if (vault.isDefault) {
        throw new AppError(
            'The default vault cannot be archived',
            400
        );
    }

    vault.isArchived = true;
    vault.archivedAt = new Date();

    await vault.save();

    return vault;
}

export const restoreVaultService = async (userId, vaultId) => {
    if (!mongoose.isValidObjectId(vaultId)) {
        throw new AppError('Invalid vault ID', 400)
    }

    const vault = await Vault.findOne({ _id: vaultId, ownerId: userId, isArchived: true, isDeleted: false });

    if (!vault) {
        throw new AppError('Archived vault not found', 404);
    }

    vault.isArchived = false;
    vault.archivedAt = null;

    await vault.save();

    return vault;
}

export const setDefaultVaultService = async (userId, vaultId) => {
    if (!mongoose.isValidObjectId(vaultId)) {
        throw new AppError('Invalid vault ID', 400);
    }

    const vault = await Vault.findOne({
        _id: vaultId,
        ownerId: userId,
        isArchived: false,
        isDeleted: false
    });

    if (!vault) {
        throw new AppError('Vault not found', 404);
    }

    await Vault.updateMany(
        {
            ownerId: userId,
            isDefault: true
        },
        {
            $set: {
                isDefault: false
            }
        }
    );

    vault.isDefault = true;

    try {
        await vault.save();
    } catch (error) {
        if (error.code === 11000) {
            throw new AppError('Could not set default vault', 409);
        }
        throw error;
    }

    return vault;
};

export const deletedVaultService = async (userId, vaultId) => {
    if (!mongoose.isValidObjectId(vaultId)) {
        throw new AppError('Invalid vault ID', 400);
    }

    const vault = await Vault.findOne({
        _id: vaultId,
        ownerId: userId,
        isDeleted: false
    })

    if (!vault) {
        throw new AppError('Vault not found', 404);
    }

    if (vault.isDefault) {
        throw new AppError('Set another vault as default before deleting this vault', 400
        );
    }

    vault.isDeleted = true;
    vault.deletedAt = new Date();
    vault.isArchived = true;
    vault.archivedAt = vault.archivedAt || new Date();

    await vault.save()
    return vault;
}

export const listDeletedVaultsService = async (userId) => {
    return Vault.find({ ownerId: userId, isDeleted: true }).sort({ deletedAt: -1 });
};

export const restoreDeletedVaultService = async (userId, vaultId) => {
    if (!mongoose.isValidObjectId(vaultId)) {
        throw new AppError('Invalid vault ID', 400);
    }

    const vault = await Vault.findOne({
        _id: vaultId,
        ownerId: userId,
        isDeleted: true
    });

    if (!vault) {
        throw new AppError('Deleted vault not found', 404);
    }

    const duplicate = await Vault.findOne({
        ownerId: userId,
        nameNormalized: vault.nameNormalized,
        isDeleted: false
    });

    if (duplicate) {
        throw new AppError('An active vault already uses this name');
    }

    vault.isDeleted = false;
    vault.deletedAt = null;
    vault.isArchived = false;
    vault.archivedAt = null;
    vault.isDefault = false;

    await vault.save();

    return vault;
};

export const permanentlyDeleteVaultService = async (userId, vaultId, currentPassword, confirmationName) => {
    const user = await authUser.findById(userId).select('+password');

    if (!user) {
        throw new AppError('User no longer exists', 404);
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatches) {
        throw new AppError('Current password is incorrect', 401);
    }

    const vault = await Vault.findOne({
        _id: vaultId,
        ownerId: userId,
        isDeleted: true
    })

    if (!vault) {
        throw new AppError('Deleted vault not found', 404)
    }

    if (confirmationName !== vault.name) {
        throw new AppError('Vault name confirmation does not match', 400)
    }

    await Vault.deleteOne({ _id: vault._id, ownerId: userId })
}

export const addVaultMemberService = async (ownerId, vaultId, email, role = 'viewer') => {
    const vault = await Vault.findOne({
        _id: vaultId,
        ownerId,
        isDeleted: false
    })

    if (!vault) {
        throw new AppError('Vault not found', 404);
    }

    const allowedRoles = ['admin', 'editor', 'viewer'];

    if (!allowedRoles.includes(role)) {
        throw new AppError('Invalid vault member role', 400)
    }

    const user = await authUser.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
        throw new AppError('No user exists with this email', 404);
    }

    if (user._id.toString() === ownerId.toString()) {
        throw new AppError('The vault owner cannot be added as a member', 400);
    }

    const existingMember = await VaultMember.findOne({ vaultId, userId: user._id })

    if (existingMember) {
        throw new AppError('User is already a vault member', 409);
    }

    try {
        return await VaultMember.create({
            vaultId,
            userId: user._id,
            role,
            addedBy: ownerId
        })
    } catch (error) {
        if (error.code === 11000) {
            throw new AppError('User is already a vault member', 409)
        }
        throw error;
    }

}

export const getVaultAccessService = async (userId, vaultId) => {
    const vault = await Vault.findOne({
        _id: vaultId,
        isDeleted: false,
        isArchived: false
    });

    if (!vault) {
        throw new AppError('Vault not found', 404);
    }

    if (vault.ownerId.toString() === userId.toString()) {
        return {
            vault,
            role: 'owner',
            isOwner: true
        };
    }

    const membership = await VaultMember.findOne({ vaultId, userId });

    if (!membership) {
        throw new AppError('Vault not found', 404);
    }

    return {
        vault,
        role: membership.role,
        isOwner: false,
        membership
    };
};

export const listVaultMembersService = async (userId, vaultId) => {
    await getVaultAccessService(userId, vaultId);

    return VaultMember
        .find({ vaultId })
        .populate({
            path: 'userId',
            select: 'username name email'
        })
        .populate({
            path: 'addedBy',
            select: 'username name'
        })
        .sort({ createdAt: 1 });
};
