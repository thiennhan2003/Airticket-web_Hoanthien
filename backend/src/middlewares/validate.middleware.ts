import { AnySchema, ValidationError } from 'yup';
import { NextFunction, Request, Response } from 'express';

const validateSchemaYup = (schema: AnySchema) => 
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate toàn bộ request object (body, params, query) như thiết kế ban đầu
      await schema.validate({
        body: req.body,
        params: req.params,
        query: req.query,
      }, { 
        abortEarly: false, // lấy tất cả lỗi cùng lúc
        stripUnknown: true, // bỏ qua các field không khai báo
      });

      next();
    } catch (err: any) {
      if (err instanceof ValidationError) {
        res.status(400).json({
          statusCode: 400,
          message: err.errors, // mảng các lỗi Yup
          typeError: 'validateSchema'
        });
        return;
      }

      res.status(500).json({
        statusCode: 500,
        message: 'validate Yup Error',
        typeError: 'validateSchemaUnknown'
      });
      return;
    }
};

export default validateSchemaYup;
