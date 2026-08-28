import AppError from "../../utils/appError.js";

export const authorizeAdminOrSelf=(req,res,next)=>{
    const requestedUserId=req.params.id;
    const isAdmin = req.user.role === 'admin';

    const isSelf=req.user.id === requestedUserId;

    if(!isAdmin && !isSelf){
        return next( new AppError('You are not authorized to access this user',403))
    }
    next();
}
