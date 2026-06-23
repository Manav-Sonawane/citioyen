import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export interface ApiError extends Error {
  statusCode?: number;
  status?: number;
}
