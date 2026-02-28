import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Response } from 'express'

const BCRYPT_SALT_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> => {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
};

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
    throw new Error("JWT_SECRET is missing");
}

export const generateToken = (userId: number, res: Response) => {
    const payload = { id: userId }
    const token = jwt.sign(payload, jwtSecret, { expiresIn: "1h" })
    res.cookie("jwt", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60 * 24 * 7
    })
    return token;
}