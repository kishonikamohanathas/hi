import { Router } from 'express';
import { AuthController } from './controller';
import { authenticate } from '../common/auth';

export const authRouter = Router();

authRouter.post('/login', AuthController.login);
authRouter.post('/demo-login', AuthController.demoLogin);
authRouter.post('/register', AuthController.register);
authRouter.get('/me', authenticate, AuthController.getCurrentUser);
authRouter.post('/forgot-password', AuthController.forgotPassword);
