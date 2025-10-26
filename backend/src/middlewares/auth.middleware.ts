import jwt, { JwtPayload }  from 'jsonwebtoken';
import User from '../models/users.model';
import Coupon from '../models/coupon.model';
import { Request, Response, NextFunction } from "express";
import createError from 'http-errors';
import { env } from '../helpers/env.helper';

interface decodedJWT extends JwtPayload {
   _id?: string
 }

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  //Get the jwt token from the head
  const authHeader = req.headers['authorization'];
  if(!authHeader) {
    return next(createError(401, 'Unauthorized'));
  }
    const token = authHeader && authHeader.split(' ')[1];

     //If token is not valid, respond with 401 (unauthorized)
    if (!token) {
      return next(createError(401, 'Unauthorized'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET as string) as decodedJWT;
      //try verify user exits in database
      const user = await User
      .findOne({
        _id: decoded._id
      })
      .select('-password -__v');

      if (!user) {
        return next(createError(401, 'Unauthorized'));
      }
      //Đăng ký biến user global trong app
      res.locals.user = user;

      next();
    } catch (err) {
      return next(createError(401, 'Forbidden'));
    }
};

export const authorize = (roles: string[] = []) => {
    // roles param can be a single role string (e.g. Role.user or 'user')
    // or an array of roles (e.g. [Role.Admin, Role.user] or ['Admin', 'user'])
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req: Request, res: Response, next: NextFunction) => {
      if (roles.length && res.locals.user.role && !roles.includes(res.locals.user.role)) {
        return next(createError(403, 'Forbidden'));
      }
        // authentication and authorization successful
        next();
    }
};

export const validateCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { couponId } = req.body;

    if (!couponId) {
      return next(createError(400, 'Coupon ID is required'));
    }

    // Find coupon by ID
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return next(createError(404, 'Coupon not found'));
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return next(createError(400, 'Coupon is not active'));
    }

    // Check if coupon is expired
    if (coupon.isExpired()) {
      return next(createError(400, 'Coupon has expired'));
    }

    // Check if usage limit reached
    if (coupon.isUsageLimitReached()) {
      return next(createError(400, 'Coupon usage limit reached'));
    }

    // Attach coupon to request for use in controller
    res.locals.coupon = coupon;
    next();
  } catch (error) {
    console.error('Error validating coupon:', error);
    return next(createError(500, 'Error validating coupon'));
  }
};