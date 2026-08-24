import express from "express"
import { register, login, refreshToken, logout, logoutAllDevices, resetPassword, forgotPassword, verifyEmail, changePassword } from "./auth.controller.js"
import { authenticateToken } from "./auth.middleware.js";
import { csrfProtection } from "./csrf.middleware.js";
import { authorizeRoles } from "./role.middleware.js";
import { authorizePermissions } from "./permissions.middleware.js";

const router = express.Router()

router.post('/register', register);
router.post('/login', login)
router.post('/refresh', csrfProtection, refreshToken);
router.post('/logout', csrfProtection, logout);
router.post('/logout-all', authenticateToken, csrfProtection, logoutAllDevices)
router.post('/reset-password', resetPassword);
router.post('/forgot-password', forgotPassword);
router.post('/verify-email', verifyEmail);
router.post('/change-password', authenticateToken, csrfProtection, changePassword);
router.get('/admin-only', authenticateToken, authorizeRoles('admin'), (req, res) => {
    res.status(200).json({
        message: 'Only admins can access this route'
    })
});

router.delete('/users/:id', authenticateToken, authorizePermissions('users:delete'), (req, res) => {
    res.status(200).json({
        message: 'User deletion is allowed'
    })
})

router.delete('/users/:id',authenticateToken,authorizeRoles('admin'),(req, res) => {
        res.status(200).json({
            message: 'Only admins can delete users'
        });
    }
);

router.patch('/users/:id/access',authenticateToken,authorizeRoles('admin'),authorizePermissions('users:manage'),(req, res) => {
        res.status(200).json({
            message: 'Admin can update user access'
        });
    }
);

router.get('/users/:id',authenticateToken, authorizeAdminOrSelf,(req, res) => {
        res.status(200).json({
            message: 'User profile access allowed'
        });
    }
);


router.get('/protected', authenticateToken, (req, res) => {
    res.json({
        message: `Hello i am ${req.user.username} ,I have the access to this route`
    })
})

export default router


// Why both tokenVersion and session revocation?
// Session revocation handles known session records.
// tokenVersion is a global kill switch:
// Any access or refresh JWT issued with an old tokenVersion
// is rejected immediately.
// Use it whenever the account security state changes.


// Account lockout
// Account lockout temporarily blocks login after several failed password attempts.
// Example policy:
// - Maximum attempts: 5
// - Lock duration: 15 minutes
// - Successful login resets the failed-attempt counter