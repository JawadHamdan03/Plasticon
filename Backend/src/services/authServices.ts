import { Response } from "express";
import { $Enums, User } from "../config/generated/prisma/client";
import { prisma } from "../config/lib/prisma";
import { hashPassword, generateToken } from "../utils/authServices";
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

type ServiceResult<T> = {
    status: number;
    message?: string;
    data?: T;
};

export const registerUser = async (body: RegisterBody): Promise<ServiceResult<{ user: unknown }>> => {
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
        return {
            status: 400,
            message: "nationalId, fullName, username, password, and role are required",
        };
    }

    if (!Object.values($Enums.UserRole).includes(role)) {
        return { status: 400, message: "Invalid role" };
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
        return { status: 409, message: "User already exists" };
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

    return { status: 201, data: { user } };
};

export const loginUser = async (
    email: string,
    password: string,
    res: Response
): Promise<ServiceResult<{ name: string; email: string | null; token: string }>> => {
    const user = (await prisma.user.findUnique({ where: { email: email } })) as User;

    if (!user) {
        return { status: 401, message: "invalid email or password" };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        return { status: 401, message: "invalid email or password" };
    }

    const token = generateToken(user.id, res);

    return { status: 200, data: { name: user.fullName, email: user.email, token } };
};

export const logoutUser = (res: Response): ServiceResult<{ message: string }> => {
    res.cookie("jwt", "", {
        httpOnly: true,
        expires: new Date(0),
    });

    return { status: 200, data: { message: "logged out successfully" } };
};
