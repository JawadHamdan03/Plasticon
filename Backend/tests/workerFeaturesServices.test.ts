import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationType } from "../src/config/generated/prisma/client";

const {
  mockPrisma,
  mockEmitNotificationToUser,
  mockEmitNotificationUnreadCountUpdate,
} = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    notification: {
      createMany: vi.fn(),
    },
    $executeRaw: vi.fn(),
    $queryRawUnsafe: vi.fn(),
  },
  mockEmitNotificationToUser: vi.fn(),
  mockEmitNotificationUnreadCountUpdate: vi.fn(),
}));

vi.mock("../src/config/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("../src/config/socket", () => ({
  emitNotificationToUser: mockEmitNotificationToUser,
  emitNotificationUnreadCountUpdate: mockEmitNotificationUnreadCountUpdate,
}));

import {
  createElectricityAnomalyAlert,
  createKaizenSuggestion,
  createMachineStopAlert,
  createMaterialWasteLog,
  createMicroStop,
  createQualityIssueReport,
  reviewKaizenSuggestion,
  saveDailyTargetProgress,
  saveShiftChecklist,
} from "../src/services/workerFeaturesServices";

describe("workerFeaturesServices", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.$executeRaw.mockResolvedValue(undefined);
    mockPrisma.user.findMany.mockResolvedValue([{ id: 21 }, { id: 22 }]);
    mockPrisma.user.findUnique.mockResolvedValue({ fullName: 'Test Worker', username: 'testworker' });
    mockPrisma.notification.createMany.mockResolvedValue({ count: 2 });
  });

  it("records machine stop alerts and notifies admins", async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      {
        id: 1,
        machine_label: "Line A",
        priority: "HIGH",
        reason: "Jam detected",
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ]);

    const result = await createMachineStopAlert(7, {
      machineLabel: "Line A",
      priority: "high",
      reason: "Jam detected",
    });

    expect(result.status).toBe(201);
    expect(result.data).toEqual(
      expect.objectContaining({
        id: 1,
        machine_label: "Line A",
        priority: "HIGH",
      }),
    );
    expect(mockPrisma.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            title: "Machine Stop — 🟠 HIGH",
            type: NotificationType.MAINTENANCE_URGENT,
          }),
        ]),
      }),
    );
    expect(mockEmitNotificationToUser).toHaveBeenCalledWith(
      21,
      expect.objectContaining({ title: "Machine Stop — 🟠 HIGH" }),
    );
  });

  it("saves shift checklists with filtered tasks and a digital signature", async () => {
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ count: 0n }]) // duplicate check returns 0
      .mockResolvedValueOnce([
        {
          id: 2,
          shift_phase: "END",
          tasks_json: [{ label: "Check belts", done: true }],
          digital_signature: "Worker A",
          created_at: new Date().toISOString(),
        },
      ]);

    const result = await saveShiftChecklist(8, {
      shiftPhase: "end",
      tasks: [
        { label: "Check belts", done: true },
        { label: "  ", done: false },
      ],
      digitalSignature: "Worker A",
    });

    expect(result.status).toBe(201);
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.any(String),
      8,
      "END",
      JSON.stringify([{ label: "Check belts", done: true }]),
      "Worker A",
    );
    expect(mockPrisma.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            title: "Shift Checklist Submitted",
            type: NotificationType.SYSTEM_MESSAGE,
          }),
        ]),
      }),
    );
  });

  it("stores material waste logs and notifies admins", async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      {
        id: 3,
        machine_label: "Press 2",
        machine_type: "Press",
        material_type: "PVC",
        waste_kg: 2.75,
        reason: "Start-up waste",
        created_at: new Date().toISOString(),
      },
    ]);

    const result = await createMaterialWasteLog(9, {
      machineLabel: "Press 2",
      machineType: "Press",
      materialType: "PVC",
      wasteKg: 2.75,
      reason: "Start-up waste",
    });

    expect(result.status).toBe(201);
    expect(result.data).toEqual(
      expect.objectContaining({
        machine_label: "Press 2",
        waste_kg: 2.75,
      }),
    );
    expect(mockPrisma.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            title: "Material Waste Logged",
            type: NotificationType.SYSTEM_MESSAGE,
          }),
        ]),
      }),
    );
  });

  it("stores daily targets and sends an alert when the target is missed", async () => {
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ count: 0n }]) // duplicate check returns 0
      .mockResolvedValueOnce([
        {
          id: 4,
          target_date: "2026-04-07",
          target_units: 120,
          actual_units: 96,
          note: "Short shift",
          created_at: new Date().toISOString(),
        },
      ]);

    const result = await saveDailyTargetProgress(10, {
      targetDate: "2026-04-07",
      targetUnits: 120,
      actualUnits: 96,
      note: "Short shift",
    });

    expect(result.status).toBe(201);
    expect(result.data).toEqual(
      expect.objectContaining({
        achieved: false,
        achievementRatio: 0.8,
      }),
    );
    expect(result.data).toEqual(
      expect.objectContaining({
        alert: "Target not achieved yet. Keep pushing.",
      }),
    );
    expect(mockPrisma.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            title: "Daily Target Missed",
            type: NotificationType.PRODUCTION_ALERT,
          }),
        ]),
      }),
    );
  });

  it("records kaizen suggestions and assigns reward points", async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      {
        id: 5,
        title: "Reduce idle time",
        details: "Add a checklist before shift start.",
        estimated_impact: "Higher throughput",
        review_status: "PENDING",
        score: 0,
        reward_points: 5,
        created_at: new Date().toISOString(),
      },
    ]);

    const result = await createKaizenSuggestion(11, {
      title: "Reduce idle time",
      details: "Add a checklist before shift start.",
      estimatedImpact: "Higher throughput",
    });

    expect(result.status).toBe(201);
    expect(result.data).toEqual(
      expect.objectContaining({
        review_status: "PENDING",
        reward_points: 5,
      }),
    );
    expect(mockPrisma.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            title: "Kaizen Suggestion Submitted",
            type: NotificationType.SYSTEM_MESSAGE,
          }),
        ]),
      }),
    );
  });

  it("reviews kaizen suggestions and sends the result to the worker", async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      {
        id: 99,
        user_id: 42,
        title: "Reduce idle time",
        review_status: "APPROVED",
        score: 88,
        reward_points: 20,
        review_note: "Solid idea",
        reviewed_by_id: 5,
        reviewed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ]);

    const result = await reviewKaizenSuggestion(5, 99, {
      reviewStatus: "approved",
      score: 88,
      rewardPoints: 20,
      reviewNote: "Solid idea",
    });

    expect(result.status).toBe(200);
    expect(result.data).toEqual(
      expect.objectContaining({
        review_status: "APPROVED",
        reviewed_by_id: 5,
      }),
    );
    expect(mockPrisma.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            userId: 42,
            title: "Kaizen Suggestion Reviewed",
            type: NotificationType.SYSTEM_MESSAGE,
          }),
        ],
      }),
    );
    expect(mockEmitNotificationToUser).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ title: "Kaizen Suggestion Reviewed" }),
    );
  });

  it("records quality issues with image references and notifies admins", async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      {
        id: 6,
        batch_code: "B-14",
        machine_label: "QA-1",
        issue_type: "Crack",
        details: "Visible crack on the surface",
        issue_image: "prisma/pictures/issue-1.jpg",
        created_at: new Date().toISOString(),
      },
    ]);

    const result = await createQualityIssueReport(12, {
      batchCode: "B-14",
      machineLabel: "QA-1",
      issueType: "Crack",
      details: "Visible crack on the surface",
      issueImage: "prisma/pictures/issue-1.jpg",
    });

    expect(result.status).toBe(201);
    expect(result.data).toEqual(
      expect.objectContaining({
        batch_code: "B-14",
        issue_image: "prisma/pictures/issue-1.jpg",
      }),
    );
    expect(mockPrisma.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            title: "Quality Issue Reported",
            type: NotificationType.QUALITY_ISSUE,
          }),
        ]),
      }),
    );
  });

  it("records micro-stops and notifies admins", async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      {
        id: 7,
        machine_label: "Cutting 3",
        reason: "Minor adjustment",
        duration_minutes: 2.5,
        created_at: new Date().toISOString(),
      },
    ]);

    const result = await createMicroStop(13, {
      machineLabel: "Cutting 3",
      reason: "Minor adjustment",
      durationMinutes: 2.5,
    });

    expect(result.status).toBe(201);
    expect(result.data).toEqual(
      expect.objectContaining({
        machine_label: "Cutting 3",
        duration_minutes: 2.5,
      }),
    );
    expect(mockPrisma.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            title: "Micro-stop Logged",
            type: NotificationType.MAINTENANCE_URGENT,
          }),
        ]),
      }),
    );
  });

  it("detects electricity anomalies and sends the result when the threshold is exceeded", async () => {
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ baseline: 10 }])
      .mockResolvedValueOnce([
        {
          id: 8,
          machine_label: "Line 9",
          current_kwh: 28,
          baseline_kwh: 10,
          threshold_ratio: 1.3,
          severity: "HIGH",
          message: "Electricity usage is abnormal for Line 9",
          created_at: new Date().toISOString(),
        },
      ]);

    const result = await createElectricityAnomalyAlert(14, {
      machineLabel: "Line 9",
      currentKwh: 28,
      thresholdRatio: 1.3,
    });

    expect(result.status).toBe(201);
    expect(result.data).toEqual(
      expect.objectContaining({
        alerted: true,
        machine_label: "Line 9",
        severity: "HIGH",
      }),
    );
    expect(mockPrisma.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            title: "Electricity Anomaly Alert",
            type: NotificationType.PRODUCTION_ALERT,
          }),
        ]),
      }),
    );
  });
});
