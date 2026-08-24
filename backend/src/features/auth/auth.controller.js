import { registerUserService, loginUserService, refreshTokenService, rotateRefreshTokenService, logoutUserService, revokedAllUserSessionsService, resetPasswordService, forgotPasswordService } from './auth.services.js'
import { catchAsync } from '../../utils/catchAsync.js'
import AppError from '../../utils/appError.js';

const accessCookieOptions = {
    httpOnly: true,
    secure: false,  // in Production: true
    sameSite: "lax",
    maxAge: 15 * 60 * 1000,
    path: '/'
};

const refreshCookieOptions = {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 1000,
    //after session function creation in auth.service.js
    // path: '/auth/refresh'
    path: '/auth'
};

const csrfCookieOptions = {
    httpOnly: false,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
}

export const register = catchAsync(async (req, res) => {
    const { username, name, email, password } = req.body;

    if (!username || !name || !email || !password) {
        throw new AppError('Fill the Details', 400)
    }

    const user = await registerUserService(username, name, email, password)

    res.status(201).json({
        message: 'User Registration successful',
        user: {
            id: user._id,
            name: user.name,
            email: user.email
        }
    })

})

export const login = catchAsync(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new AppError('Fill the Details', 400)
    }

    const { user, accessToken, refreshToken, csrfToken } = await loginUserService(
        email.trim().toLowerCase(),
        password,
        req
    );

    // why use above code
    // const { user, token, refreshToken } = await loginUserService(email, password)

    // explain these:
    res.cookie('accessToken', accessToken, accessCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);
    res.cookie('csrfToken', csrfToken, csrfCookieOptions);


    res.status(201).json({
        message: 'User Login successful',
        user: {
            id: user._id,
            name: user.name,
            email: user.email,

        }
    })
    // why not in response
    // accessToken: token,
    // refreshToken: refreshToken

})

export const refreshToken = catchAsync(async (req, res) => {
    // Once login stores the refresh token in an HTTP-only cookie, this current line will stop working
    // const { refreshToken } = req.body;
    // Change the refresh controller to read the cookie

    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        throw new AppError('Refresh token is required', 401);
    }
    if (typeof refreshToken !== 'string') {
        throw new AppError('Refresh token must be text', 400);
    }

    // const accessToken = await refreshTokenService(refreshToken)
    const { accessToken, refreshToken: newRefreshToken } = await rotateRefreshTokenService(refreshToken);

    res.cookie('accessToken', accessToken, accessCookieOptions)

    res.cookie('refreshToken', newRefreshToken, refreshCookieOptions);


    res.status(200).json({
        message: "Token Successfully refreshed",
    })

    // why not add accessToken in response after add accessToken in cookie 
})

export const logout = catchAsync(async (req, res) => {
    const refreshToken = req.cookies.refreshToken

    await logoutUserService(refreshToken);

    res.clearCookie('accessToken', accessCookieOptions)
    res.clearCookie('refreshToken', refreshCookieOptions)
    res.clearCookie('csrfToken', csrfCookieOptions)

    res.status(200).json({
        message: "Logged Out successfullys"
    });

})

export const logoutAllDevices = catchAsync(async (req, res) => {
    await revokedAllUserSessionsService(req.user.id)

    res.clearCookie('accessToken', accessCookieOptions)
    res.clearCookie('refreshToken', refreshCookieOptions)
    res.clearCookie('csrfToken', csrfCookieOptions)

    res.status(200).json({
        message: 'All sessions have been revoked'
    });

})

export const resetPassword = catchAsync(async (req, res) => {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!resetToken || !newPassword || !confirmPassword) {
        throw new AppError('Reset token, new password, and confirmation are required', 400);
    }

    if (typeof newPassword !== 'string') {
        throw new AppError('Password must be text', 400)
    }

    if (newPassword !== confirmPassword) {
        throw new AppError('Password do not match', 400);
    }

    await resetPasswordService(resetToken, newPassword);

    res.status(200).json({
        message: 'Password reset successful.Please log in again'
    })
})

export const forgotPassword = catchAsync(async (req, res) => {
    const { email } = req.body;

    if(!email){
        throw new AppError('Email is required',400);
    }

    await forgotPasswordService(email);

    res.status(200).json({
        message:'If an account exists with this email, a password reset lint has been sent'
    })
})

export const verifyEmail=catchAsync(async(req,res)=>{
    const {verificationToken}=req.body;

    if (!verificationToken) {
        throw new AppError('Verification token is required',400);
    }

    await verifyEmailService(verificationToken);

    res.status(200).json({
        message: 'Email verified successfully'
    });
});

export const changePassword=catchAsync(async(req,res)=>{
    const{currentPassword,newPassword,confirmPassword}=req.body;

     if (!currentPassword ||!newPassword ||!confirmPassword) {
        throw new AppError('All password fields are required',400);
    }

    if (newPassword !== confirmPassword) {
        throw new AppError('New passwords do not match', 400);
    }

    if (currentPassword === newPassword) {
        throw new AppError('New password must be different from the current password',400);
    }

    await changePasswordService(req.user.id,currentPassword,newPassword);

    res.status(200).json({
        message:
            'Password changed successfully. Please log in again.'
    });
});