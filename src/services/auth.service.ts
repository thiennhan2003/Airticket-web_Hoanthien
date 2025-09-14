import createError from 'http-errors';
import jwt from 'jsonwebtoken';
import User from '../models/users.model';
import bcrypt from 'bcryptjs';
import { env } from '../helpers/env.helper';
import { Response } from 'express';
const login = async (email: string, password: string) => {
    const user = await User.findOne({email});
    if(!user) {
        throw createError(401, 'Invalid email or password');
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch) {
        throw createError(401, 'Invalid email or password');
    }

    const accessToken  = jwt.sign(
        { _id: user._id, email: user.email},
        env.JWT_SECRET as string,
        {
          expiresIn: '24h', // expires in 1 hour (1 x 60 x 60)
        }
      );
    const refreshToken  = jwt.sign(
        { _id: user._id, email: user.email},
        env.JWT_SECRET as string,
        {
          expiresIn: '365d', // expires in 365 days
        }
      );
    
      return {
        user: { id: user._id, email: user.email},
        accessToken,
        refreshToken
      };
    }
    const getProfile = async (res: Response) => {
        const { user } = res.locals;
        return user;
    }
export default {
    login,
    getProfile
}