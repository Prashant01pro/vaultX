import { authUser } from "../auth/auth.model.js";
import AppError from "../../utils/appError.js";
import { authSession } from "../auth/auth.session.model.js";

export const getUserProfileService = async (userId) => {
    const user = await authUser.findById(userId).select(
        '-password' + '-passwordResetTokenHash' + '-passowrdResetExpires' + '-emailVerificationTokenHash' + '-emailVerificationExpires' + '-providerId'
    )

    if (!user) {
        throw new AppError('User no longer exists', 404);
    }

    return user;
}

export const updateNameService = async (userId, name) => {
    const trimmedName = name.trim();

    if (trimmedName.length < 2 || trimmedName.length > 30) {
        throw new AppError('Name must contain between 2 and 30 characters', 400);
    }

    const user = await authUser.findById(userId);

    if (!user) {
        throw new AppError('User no longer exists', 404)
    }

    user.name = trimmedName;

    await user.save()
    return user;
}

export const changeUsernameService = async (userId, username) => {
    const normalizedUsername = username.trim().toLowerCase();

    if (!/^[a-z0-9_]+$/.test(normalizedUsername)) {
        throw new AppError('Username may contain only letters,numbers and underscores', 400);
    }

    if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
        throw new AppError('Username must contain between 3 and 30 characters', 400)
    }

    const existingUser = await authUser.findOne({ username: normalizedUsername, _id: { $ne: userId } });

    if (existingUser) {
        throw new AppError('Username is already in use', 409)
    }

    const user = await authUser.findById(userId);

    if (!user) {
        throw new AppError('User no longer exists', 404);
    }

    user.username = normalizedUsername;

    try {
        await user.save();
    } catch (error) {
        if (error.code === 11000) {
            throw new AppError('Username is already in use', 409);
        }
        throw error;
    }

    return user;
}

export const updatePreferencesService = async (userId, preferences) => {
    const user = await authUser.findById(userId);

    if (!user) {
        throw new AppError('User no longer exists', 404);
    };

    const { theme, timezone, notifications } = preferences;

    if (theme !== undefined && !['light', 'dark', 'system'].includes(theme)) {
        throw new AppError('Invalid theme', 400);
    }

    if (timezone !== undefined) {
        try {
            Intl.DateTimeFormat('en-US', {
                timeZone: timezone
            }).format();
        } catch {
            throw new AppError('Invalid timezone', 400);
        }
    }

    if (theme !== undefined) {
        user.preferences.theme = theme;
    }

    if (timezone !== undefined) {
        user.preferences.timezone = timezone;
    }

    if (notifications !== undefined) {
        if (typeof notifications !== 'object' || Array.isArray(notifications)) {
            throw new AppError('Notification must be an object', 400);
        };

        for (const key of ['security', 'login', 'expiration']) {
            if (notifications[key] !== undefined) {
                if (typeof notifications[key] !== 'boolean') {
                    throw new AppError(`${key} notification must be boolean`)
                }

                user.preferences.notifications[key] = notifications[key]
            }
        }
    }

    await user.save();

    return user.preferences;
}

export const deactivateAccountService = async (userId, currentPassword) => {
    const user = await authUser.findById(userId).select('+password');

    if (!user) {
        throw new AppError('User no longer exists', 404);
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatches) {
        throw new AppError('Current password is incorrect', 401);
    }

    user.isActive = false;
    user.deactivatedAt = new Date();
    user.tokenVersion += 1;

    await user.save();

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

export const exportUserDataService = async (userId) => {
    const user = await authUser.findById(userId).select(
        '-password ' +
        '-passwordResetTokenHash ' +
        '-passwordResetExpires ' +
        '-emailVerificationTokenHash ' +
        '-emailVerificationExpires ' +
        '-providerId ' +
        '-tokenVersion'
    );

    if (!user) {
        throw new AppError('User no longer exists', 404);
    }

    const sessions = await authSession.find({ userId })
        .select('userAgent ipAddress createdAt' + 'lastUsedAt expiresAt revokedAt')
        .sort({ createdAt: -1 });

    return {
        exportedAt: new Date().toISOString(),
        account: {
            id: user._id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: user.permissions,
            authProvider: user.authProvider,
            isEmailVerified: user.isEmailVerified,
            preferences: user.preferences,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        },
        sessions

    }

}