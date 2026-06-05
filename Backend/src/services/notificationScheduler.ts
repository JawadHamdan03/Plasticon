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
  // Every minute: check shift start (30 min ahead) and shift end (20 min ahead)
  cron.schedule("* * * * *", async () => {
    try {
      await checkShiftStartReminders();
      await checkShiftEndReminders();
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
