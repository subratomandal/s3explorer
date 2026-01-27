import express from 'express';
import { isSetupMode, setAdminPassword, validatePasswordStrength } from '../middleware/auth.js';
import { preferences } from '../services/db.js';

const router = express.Router();

// Check setup status
router.get('/status', (req, res) => {
    res.json({
        configured: !isSetupMode(),
    });
});

// Perform setup (set password)
router.post('/', async (req, res) => {
    // 1. Check if already configured
    if (!isSetupMode()) {
        return res.status(403).json({ error: 'Server is already configured via setup wizard or environment variable.' });
    }

    const { password, sessionSecret } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }

    // 2. Validate strength
    const check = validatePasswordStrength(password);
    if (!check.valid) {
        return res.status(400).json({ error: check.reason });
    }

    try {
        // 3. Set password and session secret
        await setAdminPassword(password);

        if (sessionSecret) {
            // We need to import preferences to save this, or add a helper in auth.ts
            // For now, let's update auth.ts to export a helper or do it here if we import preferences
            // Ideally setAdminPassword could accept it, but cleaner to separate.
            // Let's import preferences at top of file.
            preferences.set('session_secret', sessionSecret);
            console.log('Setup: Session secret configured');
        }

        res.json({ success: true, message: 'Setup completed successfully' });
    } catch (err: any) {
        console.error('Setup error:', err);
        res.status(500).json({ error: 'Internal setup error' });
    }
});

export default router;
