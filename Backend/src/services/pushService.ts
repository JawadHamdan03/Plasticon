import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { prisma } from "../config/lib/prisma";

const expo = new Expo();

/**
 * Send Expo push notifications to one or more users.
 * Silently ignores invalid / stale tokens and cleans them from DB.
 */
export async function sendPushToUsers(
  userIds: number[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (userIds.length === 0) return;

  const tokens = await prisma.pushToken.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, token: true },
  });
  if (tokens.length === 0) return;

  const messages: ExpoPushMessage[] = tokens
    .filter((t: { id: number; token: string }) => Expo.isExpoPushToken(t.token))
    .map((t: { id: number; token: string }) => ({
      to: t.token,
      sound: "default" as const,
      title,
      body,
      data: data ?? {},
      priority: "high" as const,
      channelId: "default",
    }));

  if (messages.length === 0) return;

  const chunks = expo.chunkPushNotifications(messages);
  const staleTokenIds: number[] = [];

  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      receipts.forEach((receipt, i) => {
        if (receipt.status === "error") {
          const details = receipt.details as { error?: string } | undefined;
          if (
            details?.error === "DeviceNotRegistered" ||
            details?.error === "InvalidCredentials"
          ) {
            const token = tokens.find((t: { id: number; token: string }) => t.token === messages[i]?.to);
            if (token) staleTokenIds.push(token.id);
          }
          console.error("[Push] send error:", receipt.message, details);
        }
      });
    } catch (err) {
      console.error("[Push] chunk send failed:", err);
    }
  }

  if (staleTokenIds.length > 0) {
    await prisma.pushToken.deleteMany({ where: { id: { in: staleTokenIds } } }).catch(() => undefined);
  }
}
