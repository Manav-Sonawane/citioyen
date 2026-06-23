import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error("Error occurred:", err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    error: err.message || "Internal Server Error",
  });
}

export function logRequests(
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
}
