import {request, Response, NextFunction,RequestHandler} from 'express';
import ErrorHandler from './errorhandler.js';


const tryCatch = (controller: RequestHandler): RequestHandler =>  {
    return async (req: typeof request, res: Response, next: NextFunction) => {
        try {
            await controller(req, res, next);

        } catch (error: unknown) {
            if(error instanceof ErrorHandler) {
                return res.status(error.statusCode || 500).json({ message: error.message });
            }
            console.error('Error in controller:', error);
            res.status(500).json({ message:'Internal server error' });
        }
    };
};

export default tryCatch;