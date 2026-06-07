import cron from "node-cron";
import { prisma } from "../config/lib/prisma";
import { NotificationType } from "../config/generated/prisma/client";
import {
  emitNotificationToUser,
  emitNotificationUnreadCountUpdate,
} from "../config/socket";
import { sendPushToUsers } from "./pushService";

function nowUTCMinutes(): number {
  const now = new Date();
  return now.getUTCHours() * 60 + now.getUTCMinutes();
}

function shiftTimeUTCMinutes(time: Date): number {
  const d = new Date(time);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function minutesUntil(target: Date): number {
  const targetMin = shiftTimeUTCMinutes(target);
  const nowMin = nowUTCMinutes();
  return (targetMin - nowMin + 1440) % 1440;
}

function minutesSince(target: Date): number {
  const targetMin = shiftTimeUTCMinutes(target);
  const nowMin = nowUTCMinutes();
  return (nowMin - targetMin + 1440) % 1440;
}

function todayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Sentinel sets to prevent duplicate sends per shift per day.
// Key format: `${shiftId}-${YYYY-MM-DD}`
const sentCheckInReminders  = new Set<string>();
const sentCheckOutReminders = new Set<string>();

function sentinelKey(shiftId: number): string {
  return `${shiftId}-${new Date().toISOString().slice(0, 10)}`;
}

function pruneOldSentinels(set: Set<string>): void {
  const today = new Date().toISOString().slice(0, 10);
  for (const key of set) {
    if (!key.endsWith(today)) set.delete(key);
  }
}

async function checkShiftStartReminders(): Promise<void> {
  const shifts = await prisma.shift.findMany();

  for (const shift of shifts) {
    const minsUntilStart = minutesUntil(shift.startTime);
    // Fire once when 29–31 minutes remain before shift start
    if (minsUntilStart < 29 || minsUntilStart > 31) continue;

    const shiftUsers = await prisma.user.findMany({
      where: { shiftId: shift.id, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (shiftUsers.length === 0) continue;

    const title = "⏰ وردية قادمة / Shift Starting Soon";
    const message =
      `وردية "${shift.name}" تبدأ خلال 30 دقيقة. ` +
      `Shift "${shift.name}" starts in 30 minutes. ` +
      "يرجى التحضير. / Please get ready.";

    const userIds = shiftUsers.map((u) => u.id);

    const created = await prisma.$transaction(
      userIds.map((userId) =>
        prisma.notification.create({
          data: { userId, title, message, type: NotificationType.SYSTEM_MESSAGE },
        }),
      ),
    );

    created.forEach((n) => {
      emitNotificationToUser(n.userId, n);
      emitNotificationUnreadCountUpdate(n.userId, { refresh: true });
    });

    await sendPushToUsers(userIds, title, message, {
      type: "SHIFT_START",
      shiftId: shift.id,
    });
  }
}

async function checkShiftEndReminders(): Promise<void> {
  const shifts = await prisma.shift.findMany();

  for (const shift of shifts) {
    const minsUntilEnd = minutesUntil(shift.endTime);
    // Fire once when 19–21 minutes remain before shift end
    if (minsUntilEnd < 19 || minsUntilEnd > 21) continue;

    const openAttendances = await prisma.attendance.findMany({
      where: { shiftId: shift.id, checkOut: null },
      include: { user: { select: { id: true, role: true } } },
    });
    if (openAttendances.length === 0) continue;

    const userIds: number[] = [];

    for (const att of openAttendances) {
      const role = att.user?.role ?? "";
      let body =
        `وردية "${shift.name}" تنتهي خلال 20 دقيقة. ` +
        `Shift "${shift.name}" ends in 20 minutes. `;

      if (role === "WORKER" || role === "ENGINEER") {
        body +=
          "يرجى التأكد من تسجيل: الإنتاج والكهرباء. / Please ensure you have recorded: Production and Electricity.";
      } else if (role === "ACCOUNTANT") {
        body +=
          "يرجى التأكد من تسجيل: الاستهلاك (المخزون). / Please ensure you have recorded: Consumption (Inventory).";
      } else {
        body +=
          "يرجى إتمام مهام نهاية الوردية. / Please complete end-of-shift tasks.";
      }

      const notification = await prisma.notification.create({
        data: {
          userId: att.userId,
          title: "⏰ تنتهي الوردية قريباً / Shift Ending Soon",
          message: body,
          type: NotificationType.SYSTEM_MESSAGE,
        },
      });

      emitNotificationToUser(att.userId, notification);
      emitNotificationUnreadCountUpdate(att.userId, { refresh: true });
      userIds.push(att.userId);
    }

    if (userIds.length > 0) {
      await sendPushToUsers(
        userIds,
        "⏰ تنتهي الوردية قريباً / Shift Ending Soon",
        `وردية "${shift.name}" تنتهي خلال 20 دقيقة. Shift "${shift.name}" ends in 20 minutes.`,
        { type: "SHIFT_END", shiftId: shift.id },
      );
    }
  }
}

async function checkMissingCheckIn(): Promise<void> {
  const shifts = await prisma.shift.findMany();

  for (const shift of shifts) {
    const minsAfterStart = minutesSince(shift.startTime);
    // Fire once ~30 minutes after shift starts
    if (minsAfterStart < 29 || minsAfterStart > 31) continue;

    const key = sentinelKey(shift.id);
    if (sentCheckInReminders.has(key)) continue;
    sentCheckInReminders.add(key);

    // All active users assigned to this shift
    const shiftUsers = await prisma.user.findMany({
      where: { shiftId: shift.id, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (shiftUsers.length === 0) continue;

    // Users who already checked in today
    const checkedIn = await prisma.attendance.findMany({
      where: { shiftId: shift.id, checkIn: { gte: todayUTC() } },
      select: { userId: true },
    });
    const checkedInSet = new Set(checkedIn.map((a) => a.userId));

    const missingIds = shiftUsers.map((u) => u.id).filter((id) => !checkedInSet.has(id));
    if (missingIds.length === 0) continue;

    const title = "🔔 لم تسجّل الحضور / Check-In Reminder";
    const message =
      `وردية "${shift.name}" بدأت منذ 30 دقيقة ولم تسجّل حضورك بعد. ` +
      `Shift "${shift.name}" started 30 minutes ago — you haven't checked in yet.`;

    const created = await prisma.$transaction(
      missingIds.map((userId) =>
        prisma.notification.create({
          data: { userId, title, message, type: NotificationType.SYSTEM_MESSAGE },
        }),
      ),
    );
    created.forEach((n) => {
      emitNotificationToUser(n.userId, n);
      emitNotificationUnreadCountUpdate(n.userId, { refresh: true });
    });
    await sendPushToUsers(missingIds, title, message, { type: "CHECK_IN_REMINDER", shiftId: shift.id });
  }
}

async function checkMissingCheckOut(): Promise<void> {
  const shifts = await prisma.shift.findMany();

  for (const shift of shifts) {
    const minsAfterEnd = minutesSince(shift.endTime);
    // Fire once ~30 minutes after shift ends
    if (minsAfterEnd < 29 || minsAfterEnd > 31) continue;

    const key = sentinelKey(shift.id);
    if (sentCheckOutReminders.has(key)) continue;
    sentCheckOutReminders.add(key);

    // Users still checked in (no checkout) from today's shift
    const openAttendances = await prisma.attendance.findMany({
      where: {
        shiftId: shift.id,
        checkOut: null,
        checkIn: { gte: todayUTC() },
      },
      select: { userId: true },
    });
    if (openAttendances.length === 0) continue;

    const userIds = openAttendances.map((a) => a.userId);
    const title = "🔔 لم تسجّل الانصراف / Check-Out Reminder";
    const message =
      `وردية "${shift.name}" انتهت منذ 30 دقيقة ولم تسجّل انصرافك بعد. ` +
      `Shift "${shift.name}" ended 30 minutes ago — you haven't checked out yet.`;

    const created = await prisma.$transaction(
      userIds.map((userId) =>
        prisma.notification.create({
          data: { userId, title, message, type: NotificationType.SYSTEM_MESSAGE },
        }),
      ),
    );
    created.forEach((n) => {
      emitNotificationToUser(n.userId, n);
      emitNotificationUnreadCountUpdate(n.userId, { refresh: true });
    });
    await sendPushToUsers(userIds, title, message, { type: "CHECK_OUT_REMINDER", shiftId: shift.id });
  }
}

async function sendMonthlyPayrollReminder(): Promise<void> {
  const activeUsers = await prisma.user.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true },
  });
  if (activeUsers.length === 0) return;

  const userIds = activeUsers.map((u) => u.id);
  const title = "💰 تذكير الراتب / Payroll Reminder";
  const message =
    "راتبك لهذا الشهر جاهز للمراجعة. Your monthly salary is ready to review. " +
    "تفقد تفاصيل راتبك في قسم 'راتبي'. / Check your payroll details in 'My Payroll'.";

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      title,
      message,
      type: NotificationType.SYSTEM_MESSAGE,
    })),
  });

  userIds.forEach((userId) => {
    emitNotificationUnreadCountUpdate(userId, { refresh: true });
  });

  await sendPushToUsers(userIds, title, message, { type: "PAYROLL_REMINDER" });
  console.log(
    `[NotificationScheduler] Payroll reminder sent to ${userIds.length} users`,
  );
}

export function startNotificationScheduler(): void {
  // Every minute: shift reminders + check-in/check-out absence alerts
  cron.schedule("* * * * *", async () => {
    try {
      await checkShiftStartReminders();
      await checkShiftEndReminders();
      await checkMissingCheckIn();
      await checkMissingCheckOut();
      pruneOldSentinels(sentCheckInReminders);
      pruneOldSentinels(sentCheckOutReminders);
    } catch (err) {
      console.error("[NotificationScheduler] shift reminder error:", err);
    }
  });

  // 9:00 AM on the 10th of every month: payroll reminder for all active users
  cron.schedule("0 9 10 * *", async () => {
    try {
      await sendMonthlyPayrollReminder();
    } catch (err) {
      console.error("[NotificationScheduler] payroll reminder error:", err);
    }
  });

  console.log("[NotificationScheduler] started");
}
