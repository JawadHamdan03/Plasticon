import { beforeEach, describe, expect, it, vi } from "vitest";

const { serviceMocks } = vi.hoisted(() => ({
  serviceMocks: {
    updateShift: vi.fn(),
  },
}));

vi.mock("../src/services/shiftsServices", () => ({
  getAllShifts: vi.fn(),
  createShift: vi.fn(),
  updateShift: serviceMocks.updateShift,
  deleteShift: vi.fn(),
}));

import { shiftsController } from "../src/controllers/shiftsController";

const createResponseMock = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);
  return res;
};

describe("shiftsController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updateShiftHandler forwards valid payload and returns 200", async () => {
    const req = {
      params: { id: "3" },
      body: {
        name: "Night",
        startTime: "2026-01-01T20:00:00.000Z",
        endTime: "2026-01-02T04:00:00.000Z",
      },
    } as any;
    const res = createResponseMock();

    serviceMocks.updateShift.mockResolvedValue({
      status: 200,
      data: { id: 3, name: "Night" },
    });

    await shiftsController.updateShiftHandler(req, res as any);

    expect(serviceMocks.updateShift).toHaveBeenCalledWith(
      3,
      "Night",
      "2026-01-01T20:00:00.000Z",
      "2026-01-02T04:00:00.000Z",
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: 3, name: "Night" });
  });

  it("updateShiftHandler returns service error response", async () => {
    const req = {
      params: { id: "3" },
      body: {},
    } as any;
    const res = createResponseMock();

    serviceMocks.updateShift.mockResolvedValue({
      status: 500,
      message: "Failed to update shift",
    });

    await shiftsController.updateShiftHandler(req, res as any);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Failed to update shift",
    });
  });
});
