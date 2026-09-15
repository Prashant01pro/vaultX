import rateLimit from 'express-rate-limit'

const createLimiter= (message,limit)=>rateLimit({
    windowMs:15*60*1000,
    limit,
    standardHeaders:'draft-8',
    legacyHeaders:false,
    message:{
        status:'fail',
        message
    }
})

export const loginLimiter=createLimiter('Too many login attempts.Please try again later.',10);
export const registerLimiter = createLimiter('Too many registration attempts. Please try again later.',5);
export const passwordLimiter = createLimiter('Too many password requests. Please try again later.',5);
export const refreshLimiter = createLimiter('Too many refresh requests. Please try again later.',30);

