import express from 'express'
import { authenticateToken } from '../auth/auth.middleware.js'
import { csrfProtection } from '../auth/csrf.middleware.js'
import { addVaultMember, archiveVault, createVault, deleteVault, listDeletedVaults, listVaultMembers, listVaults, permanentlyDeleteVault, restoreDeletedVault, restoreVault, setDefaultVault, updateVault } from './vault.controller.js'
import { authorizeVaultRoles, loadVaultAccess } from './vault.middleware.js'

const router = express.Router()

router.post('/', authenticateToken, csrfProtection, createVault);
router.get('/', authenticateToken, listVaults);
router.patch('/:vaultId', authenticateToken, csrfProtection, updateVault)
router.patch('/:vaultId/archive', authenticateToken, csrfProtection, archiveVault)
router.patch('/:vaultId/archive/restore', authenticateToken, csrfProtection, restoreVault);
router.patch('/:vaultId/default', authenticateToken, csrfProtection, setDefaultVault);
router.delete('/:vaultId', authenticateToken, csrfProtection, deleteVault);
router.get('/trash', authenticateToken, listDeletedVaults);
router.patch('/:vaultId/restore', authenticateToken, csrfProtection, restoreDeletedVault);
router.delete('/:vaultId/permanent', authenticateToken, csrfProtection, permanentlyDeleteVault)
router.post('/:vaultId/members', authenticateToken, csrfProtection, loadVaultAccess, authorizeVaultRoles('owner'), addVaultMember)
router.get('/:vaultId/members', authenticateToken, loadVaultAccess, authorizeVaultRoles('owner', 'admin'), listVaultMembers)

export default router; 
