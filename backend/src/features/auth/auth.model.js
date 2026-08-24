import mongoose from 'mongoose'


const authSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: [true, 'Username is required'],
            unique: true,
            trim: true,
            minlength: [3, 'Username must be at least 3 characters'],
            maxlength: [30, 'Username cannot exceed 30 characters']
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [30, 'Name cannot exceed 30 characters']
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email']
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password must contain at least 8 characters'],
            select: false
        },
        tokenVersion: {
            type: Number,
            default: 0
        },
        passwordResetTokenHash: {
            type: String,
            select: false
        },
        passwordResetExpires: {
            type: Date,
            select: false
        },
        isEmailVerified: {
            type: Boolean,
            default: false
        },

        emailVerificationTokenHash: {
            type: String,
            select: false
        },

        emailVerificationExpires: {
            type: Date,
            select: false
        },
        failedLoginAttempts: {
            type: Number,
            default: 0
        },
        lockedUntil: {
            type: Date,
            default: null
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user'
        },
        permissions: {
            type: [String],
            default: []
        },
        authProvider: {
            type: String,
            enum: ['local', 'google', 'github'],
            default: 'local'
        },

        providerId: {
            type: String,
            select: false
        }
    },
    {
        timestamps: true
    }
)

export const authUser = new mongoose.model('authUser', authSchema);






















// const authSchema = new mongoose.Schema(
//     {
//         username: {
//             type: String,
//             required: true,
//             unique: true,
//         },
//         name: {
//             type: String,
//             required: true,
//             minLength: 2,
//             maxLength: 30

//         },
//         email: {
//             type: String,
//             required: true,
//             unique: true,
//             trim:true,
//             lowercase:true

//         },
//         password: {
//             type: String,
//             required: true,
//         }
//     },
//     {
//         timestamps: true
//     }
// )

// export const authUser=new mongoose.model('authUser',authSchema);
