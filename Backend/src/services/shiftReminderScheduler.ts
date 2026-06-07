import { prisma } from "../config/lib/prisma";
import {
  emitNotificationToUser,
  emitNotificationUnreadCountUpdate,
} from "../config/socket";
import { NotificationType } from "../config/generated/prisma/client";
import { sendPushToUsers } from "./pushService";

// Track which shifts already sent check-in reminders today to avoid duplicates.
// Key: `${shiftId}-${YYYY-MM-DD}` — resets naturally each day (and on restart).
const sentCheckInReminders = new Set<string>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function minutesUntilShiftEnd(endTime: Date): number {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const endMin = new Date(endTime).getUTCHours() * 60 + new Date(endTime).getUTCMinutes();
  return (endMin - nowMin + 1440) % 1440;
}

function minutesSinceShiftStart(startTime: Date): number {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = new Date(startTime).getUTCHours() * 60 + new Date(startTime).getUTCMinutes();
  return (nowMin - startMin + 1440) % 1440;
}

async function notifyUsers(
  userIds: number[],
  title: string,
  message: string,
  type: NotificationType = NotificationType.SYSTEM_MESSAGE,
): Promise<void> {
  if (userIds.length === 0) return;

  const notes = await prisma.$transaction(
    userIds.map(userId =>
      prisma.notification.create({ data: { userId, title, message, type } }),
    ),
  );

  notes.forEach(n => {
    emitNotificationToUser(n.userId, n);
    emitNotificationUnreadCountUpdate(n.userId, { refresh: true });
  });

  sendPushToUsers(userIds, title, message, { type }).catch(() => undefined);
}

export function startShiftReminderScheduler(): void {
  setInterval(async () => {
    try {
      const shifts = await prisma.shift.findMany();

      for (const shift of shifts) {
        const minsLeft  = minutesUntilShiftEnd(shift.endTime);
        const minsAfter = minutesSinceShiftStart(shift.startTime);

        // ── 1. Check-out reminder: 20 minutes before shift ends ────────────
        if (minsLeft >= 19 && minsLeft <= 21) {
          const openAttendances = await prisma.attendance.findMany({
            where: { shiftId: shift.id, checkOut: null },
            include: { user: { select: { id: true, role: true } } },
          });

          for (const att of openAttendances) {
            const role = att.user?.role ?? "";
            let body =
              `وردية "${shift.name}" تنتهي خلال 20 دقيقة. ` +
              `Shift "${shift.name}" ends in 20 minutes. `;

            if (role === "WORKER" || role === "ENGINEER") {
              body += "يرجى التأكد من تسجيل: الإنتاج والكهرباء. / Please ensure you have recorded: Production and Electricity.";
            } else if (role === "ACCOUNTANT") {
              body += "يرجى التأكد من تسجيل: الاستهلاك (المخزون). / Please ensure you have recorded: Consumption (Inventory).";
            } else {
              body += "يرجى إتمام مهام نهاية الوردية. / Please complete end-of-shift tasks.";
            }

            await notifyUsers(
              [att.userId],
              "⏰ تنتهي الوردية قريباً / Shift Ending Soon",
              body,
            );
          }
        }

        // ── 2. Check-in reminder: 30 minutes after shift starts ────────────
        if (minsAfter >= 29 && minsAfter <= 31) {
          const key = `${shift.id}-${todayKey()}`;
          if (sentCheckInReminders.has(key)) continue;
          sentCheckInReminders.add(key);

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // All active users assigned to this shift
          const shiftUsers = await prisma.user.findMany({
            where: { shiftId: shift.id, isActive: true, deletedAt: null },
            select: { id: true },
          });

          if (shiftUsers.length === 0) continue;

          // Users who already checked in today for this shift
          const checkedIn = await prisma.attendance.findMany({
            where: {
              shiftId: shift.id,
              checkIn: { gte: today },
            },
            select: { userId: true },
          });

          const checkedInSet = new Set(checkedIn.map(a => a.userId));
          const missingIds = shiftUsers
            .map(u => u.id)
            .filter(id => !checkedInSet.has(id));

          if (missingIds.length === 0) continue;

          await notifyUsers(
            missingIds,
            "🔔 لم تسجّل الحضور / Check-In Reminder",
            `وردية "${shift.name}" بدأت منذ 30 دقيقة ولم تسجّل حضورك بعد. / Shift "${shift.name}" started 30 minutes ago — you haven't checked in yet.`,
          );
        }
      }

      // Clean up old sentinel keys (keep only today's)
      const today = todayKey();
      for (const key of sentCheckInReminders) {
        if (!key.endsWith(today)) sentCheckInReminders.delete(key);
      }
    } catch (err) {
      console.error("[ShiftReminder] scheduler error:", err);
    }
  }, 60 * 1000);
}
