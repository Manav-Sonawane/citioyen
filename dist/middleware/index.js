import { jwtVerify } from "../lib/index.js";
export function errorHandler(err, req, res, next) {
    console.error("Error occurred:", err);
    const status = err.statusCode || err.status || 500;
    res.status(status).json({
        error: err.message || "Internal Server Error",
    });
}
export function logRequests(req, res, next) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
}
export function requireAuth(req, res, next) {
    const token = req.cookies?.token ||
        req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
        res.status(401).json({ error: "Authentication required" });
        return;
    }
    try {
        const payload = jwtVerify(token);
        req.userId = payload.userId;
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid or expired token" });
    }
}
