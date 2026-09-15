import express from 'express'
import { authenticateToken } from "../../auth/auth.middleware.js"
import { csrfProtection } from '../../auth/csrf.middleware.js'
import { loadVaultAccess, authorizeVaultRoles } from '../../vaults/vault.middleware.js'
import { archiveSecret, createSecret, createSecureNote, deleteSecret, getSecret, listDeletedSecrets, listSecrets, permanentlyDeleteSecret, restoreSecret, restoreSecretArchive, updateSecret, updateSecretFavorite } from './secret.controller.js'

const router = express.Router()

router.post('/:vaultId/items', authenticateToken, csrfProtection, loadVaultAccess, authorizeVaultRoles('owner', 'admin', 'editor'), createSecret)
router.post('/:vaultId/items/secure-notes', authenticateToken, csrfProtection, loadVaultAccess, authorizeVaultRoles('owner', 'admin', 'editor'), createSecureNote)
router.get('/:vaultId/items/trash', authenticateToken, loadVaultAccess, authorizeVaultRoles('owner', 'admin', 'editor', 'viewer'), listDeletedSecrets)
router.get('/:vaultId/items/:itemId', authenticateToken, loadVaultAccess, authorizeVaultRoles('owner', 'admin', 'editor', 'viewer'), getSecret)
router.get('/:vaultId/items', authenticateToken, loadVaultAccess, authorizeVaultRoles('owner', 'admin', 'editor', 'viewer'), listSecrets)
router.patch('/:vaultId/items/:itemId', authenticateToken, csrfProtection, loadVaultAccess, authorizeVaultRoles('owner', 'admin', 'editor'), updateSecret);
router.delete('/:vaultId/items/:itemId', authenticateToken, csrfProtection, loadVaultAccess, authorizeVaultRoles('owner', 'admin', 'editor'), deleteSecret);
router.patch('/:vaultId/items/:itemId/restore', authenticateToken, csrfProtection, loadVaultAccess, authorizeVaultRoles('owner', 'admin', 'editor'), restoreSecret);
router.delete('/:vaultId/items/:itemId/permanent', authenticateToken, csrfProtection, loadVaultAccess, authorizeVaultRoles('owner', 'admin'), permanentlyDeleteSecret);
router.patch('/:vaultId/items/:itemId/favorite', authenticateToken, csrfProtection, loadVaultAccess, authorizeVaultRoles('owner', 'admin', 'editor'), updateSecretFavorite);
router.patch('/:vaultId/items/:itemId/archive', authenticateToken, csrfProtection, loadVaultAccess, authorizeVaultRoles('owner', 'admin', 'editor'), archiveSecret);
router.patch('/:vaultId/items/:itemId/archive/restore', authenticateToken, csrfProtection, loadVaultAccess, authorizeVaultRoles('owner', 'admin', 'editor'), restoreSecretArchive);


export default router;







// Both routers use /vaults because they manage different parts of the same vault resource.
// vaultRouter handles vault operations:
// router.post('/');
// router.get('/');
// router.patch('/:vaultId');
// router.delete('/:vaultId');
// router.get('/:vaultId/members');
// Mounted as:
// app.use('/vaults', vaultRouter);
// Final URLs:
// POST   /vaults
// GET    /vaults
// PATCH  /vaults/:vaultId
// DELETE /vaults/:vaultId
// GET    /vaults/:vaultId/members
// secretRouter handles items inside a vault:
// router.post('/:vaultId/items');
// router.get('/:vaultId/items');
// Mounted as:
// app.use('/vaults', secretRouter);
// Final URLs:
// POST /vaults/:vaultId/items
// GET  /vaults/:vaultId/items
// Express combines the mount path with the router path:
// app.use('/vaults', secretRouter)
// +
// router.post('/:vaultId/items')
// =
// POST /vaults/:vaultId/items
// This is called a nested resource URL:

// Vault
//   └── Items
// The two routers can safely share the same prefix because their route patterns are different.
// You could alternatively mount the secret router like this:
// app.use('/secrets', secretRouter);
// But then your route would need to be:
// router.post('/:secretId');
// and the URL would become:
// POST /secrets/:secretId
// For VaultX, this is clearer:
// /vaults/:vaultId/items
// because every secret belongs to a specific vault.
