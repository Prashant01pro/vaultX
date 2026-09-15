import AppError from "../../utils/appError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { changeUsernameService, deactivateAccountService, exportUserDataService, getUserProfileService, updateNameService, updatePreferencesService } from "./user.services.js";



export const getMyProfile = catchAsync(async (req, res) => {
    const user = await getUserProfileService(req.user.id);

    res.status(200).json({
        user: {
            id: user._id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: user.permissions,
            authProvider: user.authProvider,
            isEmailVerified: user.isEmailVerified,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        }
    })
})

export const updateMyName = catchAsync(async (req, res) => {
    const { name } = req.body;

    if (typeof name !== 'string') {
        throw new AppError('Name must be text', 400)
    }

    const user = await updateNameService(req.user.id, name);

    res.status(200).json({
        message: 'Profile updated successfully',
        user: {
            id: user._id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: user.permissions
        }
    })
})

export const changeUsername = catchAsync(async (req, res) => {
    const { username } = req.body;

    if (typeof username !== 'string') {
        throw new AppError('Username must be text', 400)
    }

    const user = await changeUsernameService(req.user.id, username);

    res.status(200).json({
        message: 'Username changed successfully',
        user: {
            id: user._id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: user.permissions
        }
    })
})

export const updatePreferences=catchAsync(async(req,res)=>{
    const preferences=await updatePreferencesService(req.user.id,req.body);

    res.status(200).json({
        message:'Preferences updated successfully',
        preferences
    })
})

export const deactivateAccount=catchAsync(async(req,res)=>{
    const {currentPassword}=req.body;

    if(typeof currentPassword !== 'string'|| currentPassword.length===0){
        throw new AppError('Current password is required',400)
    }

    await deactivateAccountService(req.user.id,currentPassword)

    res.status(200).json({
        message:'Account deactivated successfully'
    })
})

export const exportMyData = catchAsync(async(req,res)=>{
    const exportData=await exportUserDataService(req.user.id);

    res.setHeader('Content-Disposition','attachment; filename="vaultx-account-export.json"');

    res.status(200).json({exportData})
})