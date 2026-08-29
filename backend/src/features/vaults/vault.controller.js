import AppError from "../../utils/appError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { archiveVaultService, createVaultService, listUserVaultsService, restoreVaultService, setDefaultVaultService, updateVaultService } from "./vault.service.js";

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

    const vault = await updateVaultService(req.user.id, req, params.vaultId, req.body);

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

export const setDefaultVault=catchAsync(async(req,res)=>{
    const vault=await setDefaultVaultService(req.user.id,req.params.vaultId)

    res.status(200).json({
        message:'Default vault updated successfully',
        vault:{
            id:vault._id,
            name:vault.name,
            isDefault:vault.isDefault
        }
    })
})