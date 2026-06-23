import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  userId?: number;
}

export interface ApiError extends Error {
  statusCode?: number;
  status?: number;
}
