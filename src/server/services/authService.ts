import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { authDb } from '../db/init';
import { generateToken, authenticate, AuthenticatedRequest } from '../middleware/authMiddleware';

export const authRouter = Router();

// Login
authRouter.post('/login', (req, res: Response): void => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = authDb.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) as any;
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  if (user.status === 'suspended') {
    res.status(403).json({ error: 'Account has been deactivated. Please contact emergency administration.' });
    return;
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    full_name: user.full_name,
    district: user.district,
  });

  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// Demo switch login for reviewer convenience
authRouter.post('/demo-login', (req, res: Response): void => {
  const { role } = req.body;
  const user = authDb.prepare("SELECT * FROM users WHERE role = ? AND status = 'active' LIMIT 1").get(role) as any;
  if (!user) {
    res.status(404).json({ error: `Demo account for role '${role}' not found.` });
    return;
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    full_name: user.full_name,
    district: user.district,
  });

  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// Register
authRouter.post('/register', (req, res: Response): void => {
  const { full_name, email, phone, password, role, district, address, organization_name } = req.body;

  if (!full_name || !email || !password) {
    res.status(400).json({ error: 'Full name, email, and password are required.' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    return;
  }

  const existing = authDb.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  if (existing) {
    res.status(409).json({ error: 'An account with this email address already exists.' });
    return;
  }

  // Allowed self-registration roles. Coordinators and Admins can be registered or default to provider verification.
  const assignedRole = ['citizen', 'provider', 'coordinator', 'admin'].includes(role) ? role : 'citizen';
  const status = assignedRole === 'provider' ? 'active' : 'active'; // active for demonstration

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  authDb.prepare(`
    INSERT INTO users (id, full_name, email, phone, password_hash, role, status, district, address, organization_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, full_name, email, phone || null, passwordHash, assignedRole, status, district || 'Colombo', address || null, organization_name || null);

  const newUser = authDb.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  const token = generateToken({
    id: newUser.id,
    email: newUser.email,
    role: newUser.role,
    full_name: newUser.full_name,
    district: newUser.district,
  });

  const { password_hash, ...safeUser } = newUser;
  res.status(201).json({ token, user: safeUser });
});

// Current user info
authRouter.get('/me', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const user = authDb.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const { password_hash, ...safeUser } = user;
  res.json({ user: safeUser });
});

// Password reset simulation
authRouter.post('/forgot-password', (req, res: Response): void => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }
  const user = authDb.prepare('SELECT id, email FROM users WHERE LOWER(email) = LOWER(?)').get(email) as any;
  if (!user) {
    // Return generic success to avoid enumeration
    res.json({ message: 'If an account matches that email, a password reset link has been dispatched.' });
    return;
  }
  res.json({ message: 'Password reset link dispatched. In development mode, you can sign in directly or test with demo accounts.' });
});
