import bcrypt from 'bcrypt'
import { authUser } from './auth.model.js'
import AppError from '../../utils/appError.js'
import jwt from "jsonwebtoken";

import crypto, { createDecipheriv } from "crypto";
import mongoose from 'mongoose';
import { authSession } from './auth.session.model.js';
import { currentUser } from './auth.controller.js';

const REFRESH_TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

// explain and understand this hashToken function
const hashToken = (token) => {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex')
};

// const generateRefreshToken = (user) => {
//     return jwt.sign({
//         id: user._id,
//         username: user.username
//     },
//         process.env.JWT_REFRESH_SECRET,
//         { expiresIn: process.env.expires_Refresh_IN })
// }



// why use these and also explain every functions:

const generateAccessToken = (user, sid) => {
    return jwt.sign(
        {
            id: user._id.toString(),
            // username: user.username,
            // role: user.role,
            sid,
            tokenVersion: user.tokenVersion
        },
        process.env.JWT_ACCESS_SECRET,
        {
            expiresIn: process.env.expiresIN
        }
    );
};

const generateRefreshToken = (user, sid, jti) => {
    return jwt.sign(
        {
            id: user._id.toString(),
            sid,
            tokenVersion: user.tokenVersion,
            jti
        },
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn: process.env.expires_Refresh_IN
        }
    );
};

const generateCsrfToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

export const createSessionAndTokens = async (user, req) => {
    const sessionId = new mongoose.Types.ObjectId().toString();

    const refreshTokenId = crypto.randomUUID();
    const familyId = crypto.randomUUID();
    const csrfToken = generateCsrfToken();

    const accessToken = generateAccessToken(user, sessionId);
    const refreshToken = generateRefreshToken(user, sessionId, refreshTokenId);

    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS);

    await authSession.create({
        _id: sessionId,
        userId: user._id,
        refreshTokenHash: hashToken(refreshToken),
        refreshTokenId,
        familyId,
        expiresAt,
        csrfTokenHash: hashToken(csrfToken),
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || null
    });

    return {
        accessToken,
        refreshToken,
        csrfToken
    };
};






export const registerUserService = async (username, name, email, password) => {
    const existingUser = await authUser.findOne({ email })

    if (existingUser) {
        throw new AppError('User is already exist')
    }

    const salt = await bcrypt.genSalt(12)
    const hashedPassword = await bcrypt.hash(password, salt)

    // const user = await authUser.create({
    //     username,
    //     name,
    //     email,
    //     password: hashedPassword,
    // })

    // return user;

    // understand why use this extra try catch 
    try {
        // const user = await authUser.create({
        //     username,
        //     name,
        //     email,
        //     password: hashedPassword
        // });

        // return user;



        // modification for the email verification feature
        const verificationToken = crypto.randomBytes(32).toString('hex');

        const verificationTokenHash = hashToken(verificationToken);

        const user = await authUser.create({
            username,
            name,
            email,
            password: hashedPassword,
            isEmailVerified: false,
            emailVerificationTokenHash: verificationTokenHash,
            emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
        })

        const verificationLink = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;

        // Temporary development output.
        // Later, replace this with an email service.
        console.log(
            'Email verification link:',
            verificationLink
        );

        return user;

    } catch (error) {
        // A database unique-index collision can still happen if two
        // registrations arrive at almost the same time.
        if (error.code === 11000) {
            throw new AppError('Email or username is already in use', 409);
        }

        throw error;
    }


}

export const loginUserService = async (email, password, req) => {
    //    const user = await authUser.findOne({ email, username  });  // do for username also in this 

    // why use this find email and also with password
    const user = await authUser
        .findOne({ email })
        .select('+password');

    if (!user) {
        throw new AppError("Invalid Email or Password", 401)
    }

    // add for implement deactivate account feature
    if (user.isActive === false) {
    throw new AppError('This account has been deactivated',403);
}

    //lockout feature:
    // Check whether the account is currently locked.
    if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new AppError('Account temporarily locked. Please try again later.', 423);
    }

    if (user.lockedUntil && user.lockedUntil <= new Date()) {
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;

        await user.save();
    }

    const comparePassword = await bcrypt.compare(password, user.password)

    if (!comparePassword) {
        // throw new AppError("Invalid Email or Password",401)

        user.failedLoginAttempts += 1;
        if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
            user.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        }

        await user.save();
        throw new AppError("Invalid Email or Password", 401)
    }

    if (user.authProvider === 'local' && !user.isEmailVerified) {
        throw new AppError('Please verify your email before logging in', 403);
    }

    // Successful login clears previous failures.
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;

    await user.save();


    //undestand when use this one and when use other one 
    //  throw new AppError("Invalid Email or Password")
    //  return next(new AppError("Invalid Email or Password"))

    // why not use token and refreshToken generation in this after implementing createSessionAndTokens function 
    // const token = await jwt.sign({ id: user._id, username: user.username }, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.expiresIN })
    // const refreshToken = generateRefreshToken(user)

    const tokens = await createSessionAndTokens(user, req)


    return {
        user,
        // token,
        // refreshToken
        ...tokens
    };
}


export const refreshTokenService = async (refreshToken) => {

    try {
        // const user = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
        //user is the decoded JWT payload, not your MongoDB user document.

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)

        const accessToken = jwt.sign({ id: decoded.id, username: decoded.username }, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.expiresIN })
        return accessToken


    } catch (err) {
        throw new AppError("Invalid Token or expired token", 401);
    }
}

export const rotateRefreshTokenService = async (refreshToken) => {
    let decoded;

    try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    } catch (error) {
        throw new AppError('Invalid or expired refresh token', 401);
    }

    const user = await authUser.findById(decoded.id);

    if (!user) {
        throw new AppError('User no longer exists', 401);
    }


    // explain tokenversion in this 
    if (user.tokenVersion !== decoded.tokenVersion) {
        throw new AppError(
            'All sessions have been revoked. Please log in again.',
            401
        );
    }

    const currentTokenHash = hashToken(refreshToken);

    const session = await authSession.findOne({
        _id: decoded.sid,
        userId: decoded.id,
        revokedAt: null,
        expiresAt: { $gt: new Date() }
    }).select('+refreshTokenHash +csrfTokenHash');

    if (!session) {
        throw new AppError('This session is no longer active', 401);
    }

    // // A used/stolen/old refresh token is presented.
    if (session.refreshTokenId !== decoded.jti || session.refreshTokenHash !== currentTokenHash) {
        await authSession.updateMany(
            {
                familyId: session.familyId,
                revokedAt: null
            },
            {
                $set: {
                    revokedAt: new Date()
                }
            }
        )
        throw new AppError('Refresh token reuse detected.Please log in again.', 401);

    }

    const newRefreshTokenId = crypto.randomUUID();
    const newAccessToken = generateAccessToken(user, session._id.toString())
    const newRefreshToken = generateRefreshToken(user, session._id.toString(), newRefreshTokenId)

    const updatedSession = await authSession.findOneAndUpdate(
        {
            _id: session._id,
            refreshTokenId: decoded.jti,
            refreshTokenHash: currentTokenHash,
            revokedAt: null
        },
        {
            $set: {
                refreshTokenId: newRefreshTokenId,
                refreshTokenHash: hashToken(newRefreshToken),
                lastUsedAt: new Date()
            }
        },
        {
            new: true
        }
    );

    if (!updatedSession) {
        // Two requests may have tried to rotate the same token.
        // Treat that safely as a suspicious reuse event.
        await authSession.updateMany(
            {
                familyId: session.familyId,
                revokedAt: null
            },
            {
                $set: {
                    revokedAt: new Date()
                }
            }
        );

        throw new AppError(
            'Refresh token reuse detected. Please log in again.',
            401
        );
    }

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
    };


}


//This intentionally hashes the supplied refresh token and revokes the matching session. It does not need to trust an expired JWT payload.
export const logoutUserService = async (refreshToken) => {
    if (!refreshToken) {
        return;
    }

    const refreshTokenHash = hashToken(refreshToken);

    await authSession.updateOne(
        {
            refreshTokenHash,
            revokedAt: null
        },
        {
            $set: {
                revokedAt: new Date()
            }
        }
    )
}

//log out all devices” / global revocation
export const revokedAllUserSessionsService = async (userId) => {
    await authUser.findByIdAndUpdate(
        userId,
        {
            $inc: {
                tokenVersion: 1
            }
        }
    );

    await authSession.updateMany(
        {
            userId,
            revokedAt: null
        },
        {
            $set: {
                revokedAt: new Date()
            }
        }

    )
}

export const resetPasswordService = async (resetToken, newPassword) => {

    // hashToken function is already defined
    const resetTokenHash = hashToken(resetToken);

    const user = await authUser.findOne({
        passwordResetTokenHash: resetTokenHash,
        passwordResetExpires: { $gt: new Date() }
    })
        .select('+passwordResetTokenHash +passwordResetExpires')

    if (!user) {
        throw new AppError('Invalid or expired password reset token', 400);
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword

    // make the token single use
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;

    // invalidate previoulsy issued jwts
    user.tokenVersion += 1;

    await user.save();

    // Revoke all active login sessions
    await authSession.updateMany(
        {
            userId: user._id,
            revokedAt: null
        },
        {
            $set: {
                revokedAt: new Date()
            }
        }
    )
}

export const forgotPasswordService = async (email) => {
    const user = await authUser.findOne({ email });

    // Do not reveal whether the email exist 
    if (!user) {
        return
    }

    // this raw token goes into the reset link.
    const resetToken = crypto.randomBytes(32).toString('hex')

    //storing the hash in mongoDB.
    const resetTokenHash = hashToken(resetToken);

    user.passwordResetTokenHash = resetTokenHash;

    //valid for 15 minute
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    // Temporary development output.
    // Later, replace this with an email service.
    console.log('Password reset link:', resetLink);
}

export const verifyEmailService = async (verificationToken) => {
    const verificationTokenHash = hashToken(verificationToken);

    const user = await authUser.findOne({ emailVerificationTokenHash: verificationTokenHash, emailVerificationExpires: { $gt: new Date() } })
        .select('+emailVerificationTokenHash +emailVerificationExpires')

    if (!user) {
        throw new AppError('Invalid or expired email verification token', 400);
    }

    user.isEmailVerified = true;

    // Make the verification token single-use.
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

}

export const changePasswordService = async (userId, currentPassword, newPassword) => {
    const user = await authUser.findById(userId).select('+password');

    if (!user) {
        throw new AppError('User no longer exists', 404);
    }

    const currentPasswordMatches = await bcrypt.compare(currentPassword, user.password);

    if (!currentPasswordMatches) {
        throw new AppError('Current password is incorrect', 401);
    }

    const salt = await bcrypt.genSalt(12);

    user.password = await bcrypt.hash(newPassword, salt);

    // Invalidate previously issued JWTs.
    user.tokenVersion += 1;

    await user.save();

    // Revoke all active sessions.
    await authSession.updateMany(
        {
            userId: user._id,
            revokedAt: null
        },
        {
            $set: {
                revokedAt: new Date()
            }
        }
    );
}

export const googleLoginService = async (authorizationCode, req) => {
    const tokenResponse = await fetch('http://oauth2.googleapis.com/token', {
        method: "POST",
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code: authorizationCode,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_CALLBACK_URL,
            grant_type: 'authorization_code'
        })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
        throw new AppError('Google authorization failed', 401);
    }

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
    })

    const googleProfile = await profileResponse.json();

    if (!profileResponse.ok || !googleProfile.sub || !googleProfile.email) {
        throw new AppError('Could not receive Google profile', 401)
    }

    if (!googleProfile.email_verified) {
        throw new AppError('Google email is not verified', 403);
    }

    let user = await authUser.findOne({
        authProvider: 'google',
        providerId: googleProfile.sub
    })

    if (!user) {
        const existingEmailUser = await authUser.findOne({ email: googleProfile.email });
        if (existingEmailUser) {
            throw new AppError('An account with this email already exists. Log in with your password first', 409)
        }
    }

    if (user) {
        const tokens = await createSessionAndTokens(user, req);
        return { user, ...tokens };
    }

    const baseUsername = googleProfile.email
        .split('@')[0]
        .replace(/[^a-zA-Z0-9_]/g, '')
        .slice(0, 20) || 'googleuser';

    const username = `${baseUsername}_${crypto
        .randomBytes(3)
        .toString('hex')}`;

    const randomPassword = crypto.randomBytes(32).toString('hex');
    const salt = await bcrypt.genSalt(12)

    const hashPassword = await bcrypt.hash(randomPassword, salt)

    user = await authUser.create({
        username,
        name: googleProfile.name || googleProfile.email.trim().toLowerCase(),
        email: googleProfile.email.trim().toLowerCase(),
        password: hashPassword,
        authProvider: 'google',
        providerId: googleProfile.sub,
        isEmailVerified: true
    })

    const tokens = await createSessionAndTokens(user, req);

    return {
        user,
        ...tokens
    }
}

export const githubLoginService = async (authorizationCode, req) => {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token',
        {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code: authorizationCode,
                redirect_uri: process.env.GITHUB_CALLBACK_URL
            })
        }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
        throw new AppError('GitHub authorization failed', 401);
    }

    const githubHeaders = {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${tokenData.access_token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'vaultX'
    };

    const profileResponse = await fetch('https://api.github.com/user',
        {
            headers: githubHeaders
        }
    );

    const githubProfile = await profileResponse.json();

    if (!profileResponse.ok || !githubProfile.id) {
        throw new AppError('Could not retrieve GitHub profile', 401);
    }

    const emailResponse = await fetch('https://api.github.com/user/emails',
        {
            headers: githubHeaders
        }
    );

    const githubEmails = await emailResponse.json();

    if (!emailResponse.ok || !Array.isArray(githubEmails)) {
        throw new AppError('Could not retrieve GitHub email', 401);
    }

    const verifiedEmail =
        githubEmails.find((email) => email.primary && email.verified);

    if (!verifiedEmail) {
        throw new AppError('No verified GitHub email was found', 403);
    }

    const providerId = String(githubProfile.id);

    let user = await authUser.findOne({ authProvider: 'github', providerId });

    if (!user) {
        const existingEmailUser =
            await authUser.findOne({ email: verifiedEmail.email.trim().toLowerCase() });

        if (existingEmailUser) {
            throw new AppError('An account with this email already exists. Log in with your password first.', 409);
        }

        const baseUsername = githubProfile.login
            .replace(/[^a-zA-Z0-9_]/g, '')
            .slice(0, 20) || 'githubuser';

        const username = `${baseUsername}_${crypto.randomBytes(3).toString('hex')}`;

        const randomPassword = crypto.randomBytes(32).toString('hex');

        const salt = await bcrypt.genSalt(12);

        const hashedPassword = await bcrypt.hash(randomPassword, salt);

        user = await authUser.create({
            username,
            name:
                githubProfile.name ||
                githubProfile.login,
            email:
                verifiedEmail.email
                    .trim()
                    .toLowerCase(),
            password: hashedPassword,
            authProvider: 'github',
            providerId,
            isEmailVerified: true
        });
    }

    const tokens = await createSessionAndTokens(user, req);

    return {
        user,
        ...tokens
    };


}

export const listUserSessionService = async (userId, currentSessionId) => {
    const session = await authSession.find({
        userId,
        revokedAt: null,
        expiresAt: { $gt: new Date() }
    }).sort({ lastUsedAt: -1, createAt: -1 });

    return session.map((session) => ({
        id: session._id,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        expiresAt: session.expiresAt,
        current: session._id.toString() === currentSessionId
    }))
}

export const revokeUserSessionService = async (userId, sessionId) => {
    const session = await authSession.findOneAndUpdate(
        {
            _id: sessionId,
            userId,
            revokedAt: null
        },
        {
            $set: {
                revokedAt: new Date()
            }
        },
        { new: true }
    )

    if (!session) {
        throw new AppError('Session not found or already revoked',404);
    }

    return session;
}
