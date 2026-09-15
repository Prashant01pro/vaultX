// //Your existing middleware only verifies the JWT:
// //“Is this token correctly signed and unexpired?”

// import jwt from "jsonwebtoken";
// import AppError from "../../utils/appError.js";

// export const authenticateToken = (req, res, next) => {

//     const token = req.cookies.accessToken;

//     // const authHeader = req.headers.authorization;

//     // const authHeader=req.headers['authorization'];
//     // why use this: const authHeader = req.headers.authorization;

//     // why not use this here when add accessToken and refreshToken in cookie
//     //split('') splits every character. You need split(' ')[1].
//     // const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN


//     // You no longer need these lines:
//     //     const authHeader = req.headers['authorization'];
//     //     const token = authHeader && authHeader.split(' ')[1];
//     // The browser now automatically attaches the cookie instead of your frontend manually attaching:
//     //     Authorization: Bearer < token >



//     if (!token) {
//         return next(new AppError('Access token is required', 401));

//         // why use the other above in this block
//         // throw new AppError('Access Token Requried',401)  
//     }


//     try {
//         const user = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

//         req.user = user;
//         next();
//     } catch (error) {
//         return next(new AppError('Invalid or expired access token', 401));
//     }

//     // why use above code not this 
//     // jwt.verify(token, process.env.JWT_ACCESS_SECRET,(err , user)=>{
//     //     if(err){
//     //         return next(new AppError("Invalid or Expired Token"))
//     //     }

//     //     req.user=user;
//     //     next()
//     // })

// }


// This verify:  “Is this login/device still active?”
import jwt from 'jsonwebtoken';
import AppError from '../../utils/appError.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { authUser } from './auth.model.js';
import { authSession } from './auth.session.model.js';

export const authenticateToken = catchAsync(
    async (req, res, next) => {
        const token = req.cookies.accessToken;

        if (!token) {
            throw new AppError('Access token is required', 401);
        }

        let decoded;

        try {
            decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        } catch (error) {
            throw new AppError('Invalid or expired access token', 401);
        }

        const session = await authSession.findOne({
            _id: decoded.sid,
            userId: decoded.id,
            revokedAt: null,
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            throw new AppError('This session is no longer active', 401);
        }

        const user = await authUser.findById(decoded.id);

        // for implementing deactivate account feature //Reject inactive accounts during authentication
        if (user.isActive === false) {
            throw new AppError('This account has been deactivated',401);
        }

        if (!user) {
            throw new AppError('User no longer exists', 401);
        }

        if (user.tokenVersion !== decoded.tokenVersion) {
            throw new AppError(
                'All sessions have been revoked. Please log in again.',
                401
            );
        }

        // req.user = decoded;
        req.user = {
            ...decoded,
            username: user.username,
            role: user.role,
            permissions: user.permissions
        };


        const now = new Date();

        await authSession.updateOne(
            { _id: session._id },
            {
                $set: {
                    lastUsedAt: now
                }
            }
        );

        //- lastUsedAt: null occurs because your code currently updates lastUsedAt only during refresh - token rotation, not during normal authenticated requests.
        // Update authenticateToken after the session is found:
        session.lastUsedAt = now;


        req.session = session;

        next();
    }
);

