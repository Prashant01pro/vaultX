import AppError from "../../utils/appError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { getVaultAccessService } from "./vault.service.js";

export const loadVaultAccess = catchAsync(async (req, res, next) => {
    req.vaultAccess = await getVaultAccessService(req.user.id, req.params.vaultId);

    next();
})

export const authorizeVaultRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.vaultAccess) {
            return next(new AppError('Vault access has not been checked', 500))
        }

        if (!allowedRoles.includes(req.vaultAccess.role)) {
            return next(new AppError('You do not have permission for this vault action', 403))
        }
        next();
    }
}
