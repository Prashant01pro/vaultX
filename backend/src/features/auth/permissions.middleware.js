import AppError from "../../utils/appError.js";

export const authorizePermissions = (...requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError('Authentication is required', 401));
        }

        const userPermissions = req.user.permissions || [];
        const hasAllPermissions = requiredPermissions.every((permission) => userPermissions.includes(permission));

        if (!hasAllPermissions) {
            return next(new AppError('You do not have permission to perform this action',403));
        }

        next();
    }
}