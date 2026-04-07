import { beforeEach, describe, expect, it, vi } from "vitest";

const { serviceMocks } = vi.hoisted(() => ({
  serviceMocks: {
    updatePayroll: vi.fn(),
  },
}));

vi.mock("../src/services/payrollServices", () => ({
  calculatePayroll: vi.fn(),
  getPayrollAdminOverview: vi.fn(),
  getAllPayrolls: vi.fn(),
  getMyPayrolls: vi.fn(),
  getPayrollById: vi.fn(),
  updatePayroll: serviceMocks.updatePayroll,
  deletePayroll: vi.fn(),
}));

import { updatePayrollHandler } from "../src/controllers/payrollController";

const createResponseMock = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);
  return res;
};

describe("payrollController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updatePayrollHandler forwards payload and returns 200", async () => {
    const req = {
      user: { id: 2 },
      params: { id: "11" },
      body: { month: "2026-04", totalSalary: 1250 },
    } as any;
    const res = createResponseMock();

    serviceMocks.updatePayroll.mockResolvedValue({
      status: 200,
      data: { id: 11, month: "2026-04", totalSalary: 1250 },
    });

    await updatePayrollHandler(req, res as any);

    expect(serviceMocks.updatePayroll).toHaveBeenCalledWith(
      11,
      { month: "2026-04", totalSalary: 1250 },
      2,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      id: 11,
      month: "2026-04",
      totalSalary: 1250,
    });
  });

  it("updatePayrollHandler returns service error response", async () => {
    const req = {
      user: { id: 2 },
      params: { id: "11" },
      body: {},
    } as any;
    const res = createResponseMock();

    serviceMocks.updatePayroll.mockResolvedValue({
      status: 404,
      message: "Payroll record not found",
    });

    await updatePayrollHandler(req, res as any);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Payroll record not found",
    });
  });
});
