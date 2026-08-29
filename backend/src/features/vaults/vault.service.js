import AppError from "../../utils/appError.js";
import { Vault } from "./vault.model";
import mongoose from "mongoose";



export const createVaultService = async (userId, { name, description = '' }) => {
    const cleanName = name.trim()
    const nameNormalized = cleanName.toLowerCase();

    if (cleanName.length < 2 || cleanName > 80) {
        throw new AppError('vault name must contain between 2 and 80 characters', 400);
    }

    if (description.length > 300) {
        throw new AppError('Vault description cannot exceed 300 characters', 400);
    }

    const existingVault = await Vault.findOne({ ownerId: userId, nameNormalized })

    if (existingVault) {
        throw new AppError('You already have a vault with this name', 409);
    }

    const existingVaultCount = await Vault.countDocuments({ ownerId: userId });

    try {
        return await Vault.create({
            ownerId: userId,
            name: cleanName,
            nameNormalized,
            description,
            isDefault: existingVaultCount === 0
        })
    } catch (error) {
        if (error.code === 11000) {
            throw new AppError('You already have a vault with this name', 409)
        }
        throw error;
    }


}

export const listUserVaultsService = async (userId) => {
    return Vault.find({ userId: userId, isArchived: false }).sort({ isDefault: -1, createdAt: 1 })
}

export const updateVaultService = async (userId, vaultId, { name, description }) => {
    if (!mongoose.isValidObjectId(vaultId)) {
        throw new AppError('Invalid vault ID', 400);
    }

    const vault = await Vault.findOne({
        _id: vaultId,
        ownerId: userId,
        isArchived: false
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
            ownerId: userId, nameNormalized, _id: { $ne: vaultId }
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

    const vault = await Vault.findOne({ _id: vaultId, ownerId: userId, isArchived: false });
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

    const vault = await Vault.findOne({ _id: vaultId, ownerId: userId, isArchived: true });

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
        isArchived: false
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
            throw new AppError('Could not set default vault',409);
        }
        throw error;
    }

    return vault;
};