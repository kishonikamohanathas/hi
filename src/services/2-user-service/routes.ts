import { Router } from 'express';
import { UserController } from './controller';
import { authenticate } from '../common/auth';

export const userRouter = Router();

userRouter.get('/', UserController.listUsers);
userRouter.put('/profile', authenticate, UserController.updateProfile);
userRouter.get('/:id', UserController.getUserById);
userRouter.patch('/:id', UserController.updateUser);
