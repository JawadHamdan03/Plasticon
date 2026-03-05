import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

const LATE_GRACE_MINUTES = 30;
const OVERTIME_GRACE_MINUTES = 30;

const minutesBetween = (later: Date, earlier: Date): number => {
    return Math.floor((later.getTime() - earlier.getTime()) / 60000);
};

export const checkInHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Not authorized" });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { shift: true },
        });

        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const now = new Date();

        const existingOpenAttendance = await prisma.attendance.findFirst({
            where: {
                userId,
                checkOut: null,
            },
            orderBy: { createdAt: "desc" },
        });

        if (existingOpenAttendance) {
            res.status(409).json({ message: "You already have an open attendance record" });
            return;
        }

        let shiftId: number | null = user.shiftId ?? null;
        let lateMinutes = 0;

        if (user.shift) {
            const shiftStart = new Date(user.shift.startTime);

            if (now.getTime() < shiftStart.getTime()) {
                res.status(400).json({ message: "Early check-in is not allowed" });
                return;
            }

            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(now);
            endOfDay.setHours(23, 59, 59, 999);

            const todayShiftAttendance = await prisma.attendance.findFirst({
                where: {
                    userId,
                    shiftId: user.shift.id,
                    checkIn: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                },
            });

            if (todayShiftAttendance) {
                res.status(409).json({ message: "Check-in already recorded for this shift today" });
                return;
            }

            const minutesLateFromStart = minutesBetween(now, shiftStart);
            lateMinutes = Math.max(0, minutesLateFromStart - LATE_GRACE_MINUTES);
        } else {
            shiftId = null;
            lateMinutes = 0;
        }

        const attendance = await prisma.attendance.create({
            data: {
                userId,
                shiftId,
                checkIn: now,
                lateMinutes,
                overtimeMinutes: 0,
            },
        });

        res.status(201).json(attendance);
    } catch (error) {
        console.error("Check-in error:", error);
        res.status(500).json({ message: "Failed to check in" });
    }
};

export const checkOutHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Not authorized" });
            return;
        }

        const now = new Date();

        const openAttendance = await prisma.attendance.findFirst({
            where: {
                userId,
                checkOut: null,
            },
            include: { shift: true },
            orderBy: { createdAt: "desc" },
        });

        if (!openAttendance) {
            res.status(404).json({ message: "No open attendance record found" });
            return;
        }

        if (openAttendance.shift) {
            const shiftEnd = new Date(openAttendance.shift.endTime);

            if (now.getTime() < shiftEnd.getTime()) {
                res.status(400).json({ message: "Early check-out is not allowed" });
                return;
            }

            const minutesAfterShiftEnd = minutesBetween(now, shiftEnd);
            const overtimeMinutes = Math.max(0, minutesAfterShiftEnd - OVERTIME_GRACE_MINUTES);

            const attendance = await prisma.attendance.update({
                where: { id: openAttendance.id },
                data: {
                    checkOut: now,
                    overtimeMinutes,
                },
            });

            res.status(200).json(attendance);
            return;
        }

        const attendance = await prisma.attendance.update({
            where: { id: openAttendance.id },
            data: {
                checkOut: now,
                overtimeMinutes: 0,
            },
        });

        res.status(200).json(attendance);
    } catch (error) {
        console.error("Check-out error:", error);
        res.status(500).json({ message: "Failed to check out" });
    }
};

export const getMyAttendances = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Not authorized" });
            return;
        }

        const attendances = await prisma.attendance.findMany({
            where: { userId },
            include: {
                shift: true,
            },
            orderBy: { checkIn: "desc" },
        });

        res.status(200).json(attendances);
    } catch (error) {
        console.error("Get my attendances error:", error);
        res.status(500).json({ message: "Failed to fetch attendances" });
    }
};

export const getAllAttendances = async (_req: Request, res: Response) => {
    try {
        const attendances = await prisma.attendance.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        username: true,
                        role: true,
                    },
                },
                shift: true,
            },
            orderBy: { checkIn: "desc" },
        });

        res.status(200).json(attendances);
    } catch (error) {
        console.error("Get all attendances error:", error);
        res.status(500).json({ message: "Failed to fetch attendances" });
    }
};
