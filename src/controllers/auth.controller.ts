import  { Request, Response, NextFunction} from 'express';
import authService from '../services/auth.service';
import { httpStatus } from '../helpers/response.helper';
import { sendJsonSuccess } from '../helpers/response.helper';

const login = async(req: Request, res: Response, next: NextFunction) => {
    try{
        const tokens = await authService.login(req.body.email, req.body.password);
        sendJsonSuccess(res, tokens, httpStatus.OK.statusCode, httpStatus.OK.message);
    } catch (error) {
        next(error);
    }
}

const getProfile = async(req: Request, res: Response, next: NextFunction) => {
    try{
        const user = await authService.getProfile(res);
        sendJsonSuccess(res, user, httpStatus.OK.statusCode, httpStatus.OK.message);
    } catch (error) {
        next(error);
    }
}
export default {
    login,
    getProfile
}
