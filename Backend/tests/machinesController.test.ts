import { beforeEach, describe, expect, it, vi } from "vitest";

const { serviceMocks } = vi.hoisted(() => ({
  serviceMocks: {
    updateMachine: vi.fn(),
  },
}));

vi.mock("../src/services/machinesServices", () => ({
  getAllMachines: vi.fn(),
  createMachine: vi.fn(),
  updateMachine: serviceMocks.updateMachine,
  updateMachineStatus: vi.fn(),
  deleteMachine: vi.fn(),
}));

import { machinesController } from "../src/controllers/machinesController";

const createResponseMock = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);
  return res;
};

describe("machinesController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updateMachineHandler forwards valid payload and returns 200", async () => {
    const req = {
      params: { id: "7" },
      body: { name: "Line 7", type: "CAPS", status: "OPERATIONAL" },
    } as any;
    const res = createResponseMock();

    serviceMocks.updateMachine.mockResolvedValue({
      status: 200,
      data: { id: 7, name: "Line 7", type: "CAPS", status: "OPERATIONAL" },
    });

    await machinesController.updateMachineHandler(req, res as any);

    expect(serviceMocks.updateMachine).toHaveBeenCalledWith(7, {
      name: "Line 7",
      type: "CAPS",
      status: "OPERATIONAL",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      id: 7,
      name: "Line 7",
      type: "CAPS",
      status: "OPERATIONAL",
    });
  });

  it("updateMachineHandler returns service error response", async () => {
    const req = {
      params: { id: "9" },
      body: { status: "INVALID" },
    } as any;
    const res = createResponseMock();

    serviceMocks.updateMachine.mockResolvedValue({
      status: 400,
      message: "Invalid machine status",
    });

    await machinesController.updateMachineHandler(req, res as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid machine status",
    });
  });
});
