import { promises as fs } from "node:fs";
import path from "node:path";

export type NotificationRuleEvent =
  | "PRODUCTION_CREATED"
  | "PURCHASE_CREATED"
  | "SALE_CREATED"
  | "INVENTORY_TRANSACTION_CREATED";

export type NotificationRuleDelivery = "ADMIN_ONLY" | "ADMIN_AND_SHIFT";

export type NotificationRuleConfig = {
  enabled: boolean;
  delivery: NotificationRuleDelivery;
};

export type NotificationRulesSettings = {
  rules: Record<NotificationRuleEvent, NotificationRuleConfig>;
  updatedAt: string;
  updatedById: number | null;
};

const defaultNotificationRules: NotificationRulesSettings = {
  rules: {
    PRODUCTION_CREATED: {
      enabled: true,
      delivery: "ADMIN_AND_SHIFT",
    },
    PURCHASE_CREATED: {
      enabled: true,
      delivery: "ADMIN_ONLY",
    },
    SALE_CREATED: {
      enabled: true,
      delivery: "ADMIN_ONLY",
    },
    INVENTORY_TRANSACTION_CREATED: {
      enabled: true,
      delivery: "ADMIN_ONLY",
    },
  },
  updatedAt: new Date(0).toISOString(),
  updatedById: null,
};

const fileCandidates = [
  path.resolve(process.cwd(), "config", "notification-rules.json"),
  path.resolve(process.cwd(), "Backend", "config", "notification-rules.json"),
];

const sanitizeRules = (
  input?: Partial<
    Record<NotificationRuleEvent, Partial<NotificationRuleConfig>>
  >,
): Record<NotificationRuleEvent, NotificationRuleConfig> => {
  const out = { ...defaultNotificationRules.rules };

  (Object.keys(out) as NotificationRuleEvent[]).forEach((key) => {
    const candidate = input?.[key];
    if (!candidate) {
      return;
    }

    out[key] = {
      enabled:
        typeof candidate.enabled === "boolean"
          ? candidate.enabled
          : out[key].enabled,
      delivery:
        candidate.delivery === "ADMIN_AND_SHIFT" ||
        candidate.delivery === "ADMIN_ONLY"
          ? candidate.delivery
          : out[key].delivery,
    };
  });

  return out;
};

const ensureDirectory = async (filePath: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
};

const resolveSettingsPath = async () => {
  for (const candidate of fileCandidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Keep trying candidates.
    }
  }

  return fileCandidates[0];
};

const readRawSettings = async (): Promise<NotificationRulesSettings> => {
  const filePath = await resolveSettingsPath();

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<NotificationRulesSettings>;

    return {
      rules: sanitizeRules(parsed.rules),
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : defaultNotificationRules.updatedAt,
      updatedById:
        typeof parsed.updatedById === "number" || parsed.updatedById === null
          ? parsed.updatedById
          : null,
    };
  } catch {
    return defaultNotificationRules;
  }
};

export const getNotificationRulesSettings = async () => {
  return readRawSettings();
};

export const upsertNotificationRulesSettings = async (
  payload: Partial<NotificationRulesSettings>,
  updatedById?: number,
) => {
  const filePath = await resolveSettingsPath();
  const current = await readRawSettings();

  const next: NotificationRulesSettings = {
    rules: sanitizeRules(payload.rules ?? current.rules),
    updatedAt: new Date().toISOString(),
    updatedById:
      typeof updatedById === "number" && Number.isInteger(updatedById)
        ? updatedById
        : current.updatedById,
  };

  await ensureDirectory(filePath);
  await fs.writeFile(filePath, JSON.stringify(next, null, 2), "utf8");

  return next;
};

export const getNotificationRuleForEvent = async (
  event: NotificationRuleEvent,
) => {
  const settings = await readRawSettings();
  return settings.rules[event] ?? defaultNotificationRules.rules[event];
};
