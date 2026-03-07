import { prisma } from "../config/lib/prisma";

const LATE_GRACE_MINUTES = 30;
const OVERTIME_GRACE_MINUTES = 30;

const minutesBetween = (later: Date, earlier: Date): number => {
    return Math.floor((later.getTime() - earlier.getTime()) / 60000);
};

type ServiceResult<T> = {
    status: number;
    message?: string;
    data?: T;
};

export const checkIn = async (userId: number): Promise<ServiceResult<unknown>> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { shift: true },
    });

    if (!user) {
        return { status: 404, message: "User not found" };
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
        return { status: 409, message: "You already have an open attendance record" };
    }

    let shiftId: number | null = user.shiftId ?? null;
    let lateMinutes = 0;

    if (user.shift) {
        const shiftStart = new Date(user.shift.startTime);

        if (now.getTime() < shiftStart.getTime()) {
            return { status: 400, message: "Early check-in is not allowed" };
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
            return { status: 409, message: "Check-in already recorded for this shift today" };
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

    return { status: 201, data: attendance };
};

export const checkOut = async (userId: number): Promise<ServiceResult<unknown>> => {
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
        return { status: 404, message: "No open attendance record found" };
    }

    if (openAttendance.shift) {
        const shiftEnd = new Date(openAttendance.shift.endTime);

        if (now.getTime() < shiftEnd.getTime()) {
            return { status: 400, message: "Early check-out is not allowed" };
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

        return { status: 200, data: attendance };
    }

    const attendance = await prisma.attendance.update({
        where: { id: openAttendance.id },
        data: {
            checkOut: now,
            overtimeMinutes: 0,
        },
    });

    return { status: 200, data: attendance };
};

export const getMyAttendances = async (userId: number): Promise<ServiceResult<unknown>> => {
    const attendances = await prisma.attendance.findMany({
        where: { userId },
        include: {
            shift: true,
        },
        orderBy: { checkIn: "desc" },
    });

    return { status: 200, data: attendances };
};

export const getAllAttendances = async (): Promise<ServiceResult<unknown>> => {
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

    return { status: 200, data: attendances };
};