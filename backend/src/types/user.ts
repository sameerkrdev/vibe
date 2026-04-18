import type { ICreateUserValidationSchema } from "@/zodValidationSchema/memberValidationSchema.js";
import type { Request } from "express";

export interface ICreateUserRequest extends Request {
  body: ICreateUserValidationSchema["body"];
}
