import { beforeEach, describe, expect, it, vi } from "vitest";

const { serviceMocks } = vi.hoisted(() => ({
  serviceMocks: {
    updateAttendance: vi.fn(),
  },
}));

vi.mock("../src/services/attendanceServices", () => ({
  checkIn: vi.fn(),
  checkOut: vi.fn(),
  getAllAttendances: vi.fn(),
  getMyAttendances: vi.fn(),
  updateAttendance: serviceMocks.updateAttendance,
}));

import { updateAttendance } from "../src/controllers/attendanceController";

const createResponseMock = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);
  return res;
};

describe("attendanceController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updateAttendance forwards payload and returns 200", async () => {
    const req = {
      params: { id: "9" },
      body: {
        checkIn: "2026-04-07T08:00:00.000Z",
        checkOut: "2026-04-07T16:00:00.000Z",
      },
    } as any;
    const res = createResponseMock();

    serviceMocks.updateAttendance.mockResolvedValue({
      status: 200,
      data: { id: 9, checkIn: "2026-04-07T08:00:00.000Z" },
    });

    await updateAttendance(req, res as any);

    expect(serviceMocks.updateAttendance).toHaveBeenCalledWith(9, req.body);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      id: 9,
      checkIn: "2026-04-07T08:00:00.000Z",
    });
  });

  it("updateAttendance returns service error response", async () => {
    const req = {
      params: { id: "9" },
      body: {},
    } as any;
    const res = createResponseMock();

    serviceMocks.updateAttendance.mockResolvedValue({
      status: 404,
      message: "Attendance record not found",
    });

    await updateAttendance(req, res as any);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Attendance record not found",
    });
  });
});
