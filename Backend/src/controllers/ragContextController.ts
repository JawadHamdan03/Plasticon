import type { Request, Response } from "express";
import { prisma } from "../config/lib/prisma";

export const getUserContext = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId as string, 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: "Invalid userId" });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [user, attendance, maintenance, notifications] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullName: true,
          username: true,
          role: true,
          department: true,
          jobTitle: true,
          shiftId: true,
          shift: { select: { id: true, name: true, startTime: true, endTime: true } },
        },
      }),
      prisma.attendance.findFirst({
        where: { userId, createdAt: { gte: today, lt: tomorrow } },
        orderBy: { createdAt: "desc" },
        select: { id: true, checkIn: true, checkOut: true, lateMinutes: true, shiftId: true },
      }),
      prisma.maintenance.findMany({
        where: { engineerId: userId },
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          machineId: true,
          reportText: true,
          downtimeMinutes: true,
          downtimeReason: true,
          partsUsed: true,
          createdAt: true,
          machine: { select: { id: true, name: true } },
        },
      }),
      prisma.notification.findMany({
        where: { userId, isRead: false },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, message: true, type: true, createdAt: true },
      }),
    ]);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user, attendance, maintenance, notifications });
  } catch (error) {
    console.error("RAG getUserContext error:", error);
    res.status(500).json({ error: "Failed to fetch user context" });
  }
};

export const getProductionContext = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, shift } = req.query as { date?: string; shift?: string };

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Resolve shift IDs from shift name if provided
    let shiftIds: number[] | undefined;
    if (shift) {
      const matchingShifts = await prisma.shift.findMany({
        where: { name: { contains: shift, mode: "insensitive" } },
        select: { id: true, name: true },
      });
      shiftIds = matchingShifts.map((s) => s.id);
    }

    const productionWhere: Record<string, unknown> = {
      createdAt: { gte: targetDate, lt: nextDay },
    };
    if (shiftIds?.length) productionWhere.shiftId = { in: shiftIds };

    const electricityWhere: Record<string, unknown> = {
      date: { gte: targetDate, lt: nextDay },
    };
    if (shiftIds?.length) electricityWhere.shiftId = { in: shiftIds };

    const maintenanceWhere: Record<string, unknown> = {
      createdAt: { gte: targetDate, lt: nextDay },
    };

    const attendanceWhere: Record<string, unknown> = {
      createdAt: { gte: targetDate, lt: nextDay },
    };

    const [production, electricity, maintenances, attendances] = await Promise.all([
      prisma.productionRecord.findMany({
        where: productionWhere,
        take: 200,
        select: {
          id: true,
          shiftId: true,
          hourSlot: true,
          cartonsCount: true,
          totalPieces: true,
          downtimeMinutes: true,
          downtimeReason: true,
          rawHdpeUsed: true,
          rawLdpeUsed: true,
          rawPetUsed: true,
          userId: true,
          machineId: true,
          user: { select: { fullName: true } },
          shift: { select: { name: true } },
        },
      }),
      prisma.electricityReading.findMany({
        where: electricityWhere,
        take: 50,
        select: {
          id: true,
          date: true,
          consumption: true,
          shiftCost: true,
          kwhPriceSnap: true,
          shift: { select: { name: true } },
        },
      }),
      prisma.maintenance.findMany({
        where: maintenanceWhere,
        take: 50,
        select: {
          id: true,
          machineId: true,
          reportText: true,
          downtimeMinutes: true,
          downtimeReason: true,
          machine: { select: { name: true } },
          engineer: { select: { fullName: true } },
        },
      }),
      prisma.attendance.findMany({
        where: attendanceWhere,
        take: 100,
        select: {
          userId: true,
          checkIn: true,
          checkOut: true,
          lateMinutes: true,
          user: { select: { fullName: true, role: true } },
        },
      }),
    ]);

    const totalPieces = production.reduce((sum, r) => sum + (r.totalPieces ?? 0), 0);
    const totalCartons = production.reduce((sum, r) => sum + (r.cartonsCount ?? 0), 0);
    const totalDowntime = production.reduce((sum, r) => sum + (r.downtimeMinutes ?? 0), 0);
    const totalKwh = electricity.reduce((sum, r) => sum + (r.consumption ?? 0), 0);
    const totalElecCost = electricity.reduce((sum, r) => sum + (r.shiftCost ?? 0), 0);

    res.json({
      date: targetDate.toISOString().split("T")[0],
      shift: shift ?? "all",
      summary: { totalPieces, totalCartons, totalDowntime, totalKwh, totalElecCost },
      production,
      electricity,
      maintenances,
      attendances,
    });
  } catch (error) {
    console.error("RAG getProductionContext error:", error);
    res.status(500).json({ error: "Failed to fetch production context" });
  }
};
