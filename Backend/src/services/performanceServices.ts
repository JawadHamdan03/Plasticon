import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = {
    status: number;
    message?: string;
    data?: T;
};

export const getAllPerformances = async (
    page = 1,
    limit = 50
): Promise<ServiceResult<unknown>> => {
    const skip = (page - 1) * limit;
    const [total, records] = await Promise.all([
        prisma.employeePerformance.count(),
        prisma.employeePerformance.findMany({
            skip,
            take: limit,
            include: {
                user: { select: { id: true, fullName: true, username: true, role: true } },
                calculatedBy: { select: { id: true, fullName: true } },
            },
            orderBy: { createdAt: "desc" },
        }),
    ]);

    return { status: 200, data: { total, page, limit, records } };
};

export const getPerformanceByUser = async (userId: number): Promise<ServiceResult<unknown>> => {
    const uid = Number(userId);
    const user = await prisma.user.findUnique({ where: { id: uid }, select: { id: true, fullName: true } });
    if (!user) {
        return { status: 404, message: "User not found" };
    }

    const records = await prisma.employeePerformance.findMany({
        where: { userId: uid },
        include: {
            calculatedBy: { select: { id: true, fullName: true } },
        },
        orderBy: { periodDate: "desc" },
    });

    return { status: 200, data: { user, records } };
};

export const createPerformance = async (
    calculatedById: number,
    payload: {
        userId: number;
        periodType: string;
        periodDate: string;
        productionScore: number;
        qualityScore: number;
        attendanceScore: number;
        kaizenScore: number;
        notes?: string;
    }
): Promise<ServiceResult<unknown>> => {
    const userId = Number(payload.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
        return { status: 400, message: "Invalid userId" };
    }

    const periodType = payload.periodType?.trim().toUpperCase();
    if (!["DAILY", "WEEKLY"].includes(periodType)) {
        return { status: 400, message: "periodType must be DAILY or WEEKLY" };
    }

    const scores = [
        Number(payload.productionScore),
        Number(payload.qualityScore),
        Number(payload.attendanceScore),
        Number(payload.kaizenScore),
    ];

    for (const s of scores) {
        if (!Number.isFinite(s) || s < 0 || s > 100) {
            return { status: 400, message: "All scores must be between 0 and 100" };
        }
    }

    const totalScore = scores.reduce((a, b) => a + b, 0) / 4;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return { status: 404, message: "User not found" };
    }

    const record = await prisma.employeePerformance.create({
        data: {
            userId,
            calculatedById,
            periodType,
            periodDate: new Date(payload.periodDate),
            productionScore: scores[0],
            qualityScore: scores[1],
            attendanceScore: scores[2],
            kaizenScore: scores[3],
            totalScore: Math.round(totalScore * 100) / 100,
            notes: payload.notes?.trim() || null,
        },
        include: {
            user: { select: { id: true, fullName: true, username: true } },
            calculatedBy: { select: { id: true, fullName: true } },
        },
    });

    return { status: 201, data: record };
};

export const calculatePerformance = async (
    calculatedById: number,
    payload: {
        userId: number;
        periodType: string;
        periodDate: string;
    }
): Promise<ServiceResult<unknown>> => {
    const userId = Number(payload.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
        return { status: 400, message: "Invalid userId" };
    }

    const periodType = payload.periodType?.trim().toUpperCase();
    if (!["DAILY", "WEEKLY"].includes(periodType)) {
        return { status: 400, message: "periodType must be DAILY or WEEKLY" };
    }

    const periodStart = new Date(payload.periodDate);
    if (isNaN(periodStart.getTime())) {
        return { status: 400, message: "Invalid periodDate" };
    }

    const periodEnd = new Date(periodStart);
    if (periodType === "WEEKLY") {
        periodEnd.setDate(periodEnd.getDate() + 7);
    } else {
        periodEnd.setDate(periodEnd.getDate() + 1);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return { status: 404, message: "User not found" };
    }

    // Production score: count production records / expected (2 per day = 100)
    const productionCount = await prisma.productionRecord.count({
        where: {
            userId,
            createdAt: { gte: periodStart, lt: periodEnd },
        },
    });
    const expectedProduction = periodType === "WEEKLY" ? 14 : 2;
    const productionScore = Math.min(100, (productionCount / expectedProduction) * 100);

    // Quality score: 100 - (quality issues × 10), min 0
    const qualityIssues = await prisma.qualityCheck.count({
        where: {
            engineerId: userId,
            createdAt: { gte: periodStart, lt: periodEnd },
        },
    });
    const qualityScore = Math.max(0, 100 - qualityIssues * 10);

    // Attendance score: (days present / working days) × 100
    const attendanceRecords = await prisma.attendance.findMany({
        where: {
            userId,
            checkIn: { gte: periodStart, lt: periodEnd },
        },
    });
    const workingDays = periodType === "WEEKLY" ? 6 : 1;
    const attendanceScore = Math.min(100, (attendanceRecords.length / workingDays) * 100);

    // Kaizen score: kaizen submissions × 20, max 100
    // Kaizen is tracked in worker tools - count from workerFeatures if exists, else 0
    let kaizenCount = 0;
    try {
        // @ts-ignore - workerKaizenIdea may not exist in schema
        const kaizenModel = (prisma as any).workerKaizenIdea;
        if (kaizenModel) {
            kaizenCount = await kaizenModel.count({
                where: {
                    userId,
                    createdAt: { gte: periodStart, lt: periodEnd },
                },
            });
        }
    } catch {
        kaizenCount = 0;
    }
    const kaizenScore = Math.min(100, kaizenCount * 20);

    const totalScore =
        (productionScore + qualityScore + attendanceScore + kaizenScore) / 4;

    const record = await prisma.employeePerformance.create({
        data: {
            userId,
            calculatedById,
            periodType,
            periodDate: periodStart,
            productionScore: Math.round(productionScore * 100) / 100,
            qualityScore: Math.round(qualityScore * 100) / 100,
            attendanceScore: Math.round(attendanceScore * 100) / 100,
            kaizenScore: Math.round(kaizenScore * 100) / 100,
            totalScore: Math.round(totalScore * 100) / 100,
            notes: `Auto-calculated: prod=${productionCount}/${expectedProduction}, quality_issues=${qualityIssues}, attendance=${attendanceRecords.length}/${workingDays}, kaizen=${kaizenCount}`,
        },
        include: {
            user: { select: { id: true, fullName: true, username: true } },
            calculatedBy: { select: { id: true, fullName: true } },
        },
    });

    return { status: 201, data: record };
};

export const deletePerformance = async (id: number): Promise<ServiceResult<unknown>> => {
    const perfId = Number(id);
    if (!Number.isInteger(perfId) || perfId <= 0) {
        return { status: 400, message: "Invalid id" };
    }

    const existing = await prisma.employeePerformance.findUnique({ where: { id: perfId } });
    if (!existing) {
        return { status: 404, message: "Performance record not found" };
    }

    await prisma.employeePerformance.delete({ where: { id: perfId } });

    return { status: 200, data: { message: "Deleted successfully" } };
};
