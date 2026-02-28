import { Request, Response } from "express"
import { $Enums, User } from "../config/generated/prisma/client";
import { prisma } from "../lib/prisma";
import { hashPassword, generateToken } from "../services/authServices";
import bcrypt from "bcrypt";



export type RegisterBody = {
    nationalId?: string;
    fullName?: string;
    username?: string;
    phone?: string;
    email?: string;
    password?: string;
    idImage?: string;
    profileImage?: string;
    role?: $Enums.UserRole;
    shiftId?: number;
};

export const registerHandler = async (req: Request, res: Response) => {
    try {
        if (!req.body) {
            res.status(400).json({ message: "Request body is required" });
            return;
        }

        const body = req.body as RegisterBody;
        const {
            nationalId,
            fullName,
            username,
            phone,
            email,
            password,
            idImage,
            profileImage,
            role,
            shiftId,
        } = body;

        if (!nationalId || !fullName || !username || !password || !role) {
            res.status(400).json({
                message: "nationalId, fullName, username, password, and role are required",
            });
            return;
        }

        if (!Object.values($Enums.UserRole).includes(role)) {
            res.status(400).json({ message: "Invalid role" });
            return;
        }

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { nationalId },
                    { username },
                    ...(email ? [{ email }] : []),
                ],
            },
        });

        if (existingUser) {
            res.status(409).json({ message: "User already exists" });
            return;
        }

        const hashedPassword = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                nationalId,
                fullName,
                username,
                phone: phone || null,
                email: email || null,
                password: hashedPassword,
                idImage: idImage || null,
                profileImage: profileImage || null,
                role,
                shiftId: shiftId ?? null,
            },
            select: {
                id: true,
                nationalId: true,
                fullName: true,
                username: true,
                phone: true,
                email: true,
                idImage: true,
                profileImage: true,
                role: true,
                shiftId: true,
                isActive: true,
                createdAt: true,
            },
        });

        res.status(201).json({ user });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Failed to register user" });
    }

}


export const loginHandler = async (req: Request, res: Response) => {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({ where: { email: email } }) as User

    if (!user) {
        res.status(401).send({ error: "invalid email or password" })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
        res.status(401).send({ error: "invalid email or password" })
        return
    }

    const token = generateToken(user.id, res)


    res.status(200).json({ name: user.fullName, email: user.email, token: token })
}

export const logoutHandler = async (req: Request, res: Response) => {
    res.cookie("jwt", "", {
        httpOnly: true,
        expires: new Date(0)
    });
    res.status(200).send({
        message: "logged out successfully"
    })

} 