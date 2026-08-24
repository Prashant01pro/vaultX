import AppError from "../../utils/appError.js"

export const authorizeRoles=(...allowedRoles)=>{
    return(req,res,next)=>{
        if(!req.user){
            return next( new AppError('Authetication is required',401));
        };

        if(!allowedRoles.includes(req.user.role)){
            return next( new AppError('You do not have permission to access this resources',403));
        }

        next();
    };
};