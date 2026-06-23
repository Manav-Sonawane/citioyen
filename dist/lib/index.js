import { Storage } from "@google-cloud/storage";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
// Google Cloud Storage instance example
const gcsStorage = new Storage({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});
export const storage = gcsStorage;
// Simple JWT wrappers
export const jwtSign = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET || "default-secret", {
        expiresIn: "1d",
    });
};
export const jwtVerify = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET || "default-secret");
};
// Bcrypt wrappers
export const hashPassword = async (password) => {
    return bcrypt.hash(password, 10);
};
export const comparePassword = async (password, hash) => {
    return bcrypt.compare(password, hash);
};
