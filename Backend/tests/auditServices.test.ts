import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock Prisma before importing services
const mockPrisma = vi.hoisted(() => ({
  auditLog: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock("../src/config/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { auditServices, AuditAction, AuditEntityType } from "../src/services/auditServices";
import { auditAsync, getChangedFields } from "../src/services/auditHelper";

describe("AuditLog Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("logAudit", () => {
    it("should create an audit log entry", async () => {
      const mockLog = {
        id: 1,
        userId: 1,
        action: AuditAction.USER_CREATED,
        entityType: AuditEntityType.USER,
        entityId: 42,
        changes: JSON.stringify({ fullName: "John Doe" }),
        createdAt: new Date(),
      };

      mockPrisma.auditLog.create.mockResolvedValue(mockLog);

      const result = await auditServices.logAudit({
        userId: 1,
        action: AuditAction.USER_CREATED,
        entityType: AuditEntityType.USER,
        entityId: 42,
        changes: { fullName: "John Doe" },
      });

      expect(result).toBeDefined();
      expect(result.action).toBe(AuditAction.USER_CREATED);
      expect(result.entityType).toBe(AuditEntityType.USER);
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it("should handle null changes", async () => {
      const mockLog = {
        id: 1,
        userId: 1,
        action: AuditAction.USER_DELETED,
        entityType: AuditEntityType.USER,
        entityId: 42,
        changes: null,
        createdAt: new Date(),
      };

      mockPrisma.auditLog.create.mockResolvedValue(mockLog);

      const result = await auditServices.logAudit({
        userId: 1,
        action: AuditAction.USER_DELETED,
        entityType: AuditEntityType.USER,
        entityId: 42,
        changes: null,
      });

      expect(result.changes).toBeNull();
    });
  });

  describe("getChanges", () => {
    it("should detect added fields", () => {
      const before = { id: 1, name: "John" };
      const after = { id: 1, name: "John", email: "john@example.com" };

      const changes = auditServices.getChanges(before, after);

      expect(changes?.email).toBeDefined();
      expect(changes?.email.before).toBeUndefined();
      expect(changes?.email.after).toBe("john@example.com");
    });

    it("should detect modified fields", () => {
      const before = { id: 1, name: "John", role: "WORKER" };
      const after = { id: 1, name: "John", role: "ENGINEER" };

      const changes = auditServices.getChanges(before, after);

      expect(changes?.role).toBeDefined();
      expect(changes?.role.before).toBe("WORKER");
      expect(changes?.role.after).toBe("ENGINEER");
    });

    it("should detect deleted fields", () => {
      const before = { id: 1, name: "John", tempField: "temp" };
      const after = { id: 1, name: "John" };

      const changes = auditServices.getChanges(before, after);

      expect(changes?.tempField).toBeDefined();
      expect(changes?.tempField.before).toBe("temp");
      expect(changes?.tempField.after).toBeNull();
    });

    it("should return null if no changes", () => {
      const before = { id: 1, name: "John" };
      const after = { id: 1, name: "John" };

      const changes = auditServices.getChanges(before, after);

      expect(changes).toBeNull();
    });
  });

  describe("auditHelper - getChangedFields", () => {
    it("should detect field changes using helper", () => {
      const before = { id: 1, status: "ACTIVE", username: "john" };
      const after = { id: 1, status: "INACTIVE", username: "john" };

      const changes = getChangedFields(before, after);

      expect(changes?.status).toBeDefined();
      expect(changes?.status.before).toBe("ACTIVE");
      expect(changes?.status.after).toBe("INACTIVE");
      expect(changes?.username).toBeUndefined();
    });
  });

  describe("auditAsync", () => {
    it("should not throw on async logging failure", async () => {
      // This should not throw even if logging fails internally
      expect(() => {
        auditAsync(
          1,
          AuditAction.USER_UPDATED,
          AuditEntityType.USER,
          42,
          { name: "Jane" }
        );
      }).not.toThrow();
    });
  });

  describe("getAuditLogs", () => {
    it("should fetch audit logs with pagination", async () => {
      const mockLogs = [
        {
          id: 1,
          userId: 1,
          action: AuditAction.USER_CREATED,
          entityType: AuditEntityType.USER,
          entityId: 1,
          changes: null,
          createdAt: new Date(),
        },
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const result = await auditServices.getAuditLogs({
        limit: 10,
        offset: 0,
      });

      expect(result).toBeDefined();
      expect(result.logs).toBeInstanceOf(Array);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    it("should filter logs by userId", async () => {
      const mockLogs: any[] = [];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const result = await auditServices.getAuditLogs({
        userId: 1,
        limit: 10,
      });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalled();
      expect(result.logs).toBeInstanceOf(Array);
    });

    it("should filter logs by entityType", async () => {
      const mockLogs: any[] = [];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const result = await auditServices.getAuditLogs({
        entityType: AuditEntityType.USER,
        limit: 10,
      });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalled();
      expect(result.logs).toBeInstanceOf(Array);
    });

    it("should cap limit at 100", async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const result = await auditServices.getAuditLogs({
        limit: 500,
      });

      expect(result.limit).toBe(100);
    });
  });

  describe("getEntityAuditHistory", () => {
    it("should fetch audit history for specific entity", async () => {
      const mockHistory: any[] = [
        {
          id: 1,
          userId: 1,
          action: AuditAction.USER_UPDATED,
          entityType: AuditEntityType.USER,
          entityId: 99,
          changes: JSON.stringify({ name: "Updated" }),
          createdAt: new Date(),
        },
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockHistory);

      const history = await auditServices.getEntityAuditHistory(
        AuditEntityType.USER,
        99,
        10
      );

      expect(history).toBeInstanceOf(Array);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalled();
    });
  });

  describe("getUserAuditHistory", () => {
    it("should fetch audit history for specific user", async () => {
      const mockHistory: any[] = [];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockHistory);

      const history = await auditServices.getUserAuditHistory(1, 10);

      expect(history).toBeInstanceOf(Array);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalled();
    });
  });

  describe("AuditAction enum", () => {
    it("should have all expected actions defined", () => {
      expect(AuditAction.USER_CREATED).toBe("USER_CREATED");
      expect(AuditAction.USER_DELETED).toBe("USER_DELETED");
      expect(AuditAction.PAYROLL_CREATED).toBe("PAYROLL_CREATED");
      expect(AuditAction.INVENTORY_IN).toBe("INVENTORY_IN");
      expect(AuditAction.MACHINE_STATUS_CHANGED).toBe("MACHINE_STATUS_CHANGED");
    });
  });

  describe("AuditEntityType enum", () => {
    it("should have all expected entity types defined", () => {
      expect(AuditEntityType.USER).toBe("User");
      expect(AuditEntityType.PAYROLL).toBe("Payroll");
      expect(AuditEntityType.MACHINE).toBe("Machine");
      expect(AuditEntityType.INVENTORY_TRANSACTION).toBe("InventoryTransaction");
    });
  });
});
