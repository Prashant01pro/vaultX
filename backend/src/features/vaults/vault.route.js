import express from 'express'
import { authenticateToken } from '../auth/auth.middleware.js'
import { csrfProtection } from '../auth/csrf.middleware.js'
import { archiveVault, createVault, listVaults, restoreVault, setDefaultVault, updateVault } from './vault.controller.js'

const router=express.Router()

router.post('/',authenticateToken,csrfProtection,createVault);
router.get('/',authenticateToken,listVaults);
router.patch('/:vaultId',authenticateToken,csrfProtection,updateVault)
router.patch('/:vaultId/archive',authenticateToken,csrfProtection,archiveVault)
router.patch('/:vaultId/restore',authenticateToken,csrfProtection,restoreVault);
router.patch('/:vaultId/default',authenticateToken,csrfProtection,setDefaultVault)

export default router; 