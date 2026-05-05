import { prisma } from "../config/lib/prisma";
import {
  emitNotificationToUser,
  emitNotificationUnreadCountUpdate,
} from "../config/socket";
import { NotificationType } from "../config/generated/prisma/client";

function minutesUntilShiftEnd(endTime: Date): number {
  const now = new Date();
  const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const endMin =
    new Date(endTime).getUTCHours() * 60 + new Date(endTime).getUTCMinutes();
  return (endMin - nowMin + 1440) % 1440;
}

export function startShiftReminderScheduler(): void {
  setInterval(async () => {
    try {
      const shifts = await prisma.shift.findMany();

      for (const shift of shifts) {
        const minsLeft = minutesUntilShiftEnd(shift.endTime);

        // Trigger once when 19–21 minutes remain (±1 min tolerance)
        if (minsLeft < 19 || minsLeft > 21) continue;

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
            body +=
              "يرجى التأكد من تسجيل: الإنتاج والكهرباء. / Please ensure you have recorded: Production and Electricity.";
          } else if (role === "ACCOUNTANT") {
            body +=
              "يرجى التأكد من تسجيل: الاستهلاك (المخزون). / Please ensure you have recorded: Consumption (Inventory).";
          } else {
            body += "يرجى إتمام مهام نهاية الوردية. / Please complete end-of-shift tasks.";
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
        }
      }
    } catch (err) {
      console.error("[ShiftReminder] scheduler error:", err);
    }
  }, 60 * 1000);
}
