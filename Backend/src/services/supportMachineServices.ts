import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

type ReadingRow = {
  id: number;
  machine_name: string;
  reading_type: string;
  value: number;
  unit: string;
  notes: string | null;
  image_path: string | null;
  shift: string | null;
  created_by_id: number | null;
  created_at: Date;
  creator_name: string | null;
};

const VALID_TYPES = [
  "TEMPERATURE",
  "PRESSURE",
  "RUN_HOURS",
  "ELECTRICITY_KWH",
  "VIBRATION",
  "HUMIDITY",
  "CUSTOM",
];

const VALID_SHIFTS = ["MORNING", "AFTERNOON", "NIGHT"];

const toDto = (row: ReadingRow) => ({
  id: row.id,
  machineName: row.machine_name,
  readingType: row.reading_type,
  value: Number(row.value),
  unit: row.unit,
  notes: row.notes,
  imagePath: row.image_path,
  shift: row.shift,
  createdById: row.created_by_id,
  createdByName: row.creator_name,
  createdAt: row.created_at,
});

export const createSupportMachineReading = async (
  userId: number,
  payload: Record<string, unknown>,
): Promise<ServiceResult<unknown>> => {
  const machineName = String(payload.machineName ?? "").trim();
  const readingType = String(payload.readingType ?? "").trim().toUpperCase();
  const value = Number(payload.value);
  const unit = String(payload.unit ?? "").trim();
  const notes = String(payload.notes ?? "").trim() || null;
  const shift = payload.shift
    ? String(payload.shift).trim().toUpperCase()
    : null;
  const imagePath = payload.imagePath ? String(payload.imagePath) : null;

  if (!machineName)
    return { status: 400, message: "machineName is required" };
  if (!VALID_TYPES.includes(readingType))
    return { status: 400, message: "Invalid readingType" };
  if (!Number.isFinite(value))
    return { status: 400, message: "value must be a finite number" };
  if (!unit) return { status: 400, message: "unit is required" };
  if (shift && !VALID_SHIFTS.includes(shift))
    return { status: 400, message: "Invalid shift" };

  const rows = await prisma.$queryRaw<ReadingRow[]>`
    INSERT INTO support_machine_readings
      (machine_name, reading_type, value, unit, notes, image_path, shift, created_by_id)
    VALUES
      (${machineName}, ${readingType}, ${value}, ${unit}, ${notes}, ${imagePath}, ${shift}, ${userId})
    RETURNING
      id, machine_name, reading_type, value, unit, notes, image_path, shift,
      created_by_id, created_at, NULL::text AS creator_name
  `;

  return { status: 201, data: toDto(rows[0]) };
};

export const getMyReadings = async (
  userId: number,
): Promise<ServiceResult<unknown>> => {
  const rows = await prisma.$queryRaw<ReadingRow[]>`
    SELECT r.id, r.machine_name, r.reading_type, r.value, r.unit, r.notes,
           r.image_path, r.shift, r.created_by_id, r.created_at,
           u."fullName" AS creator_name
    FROM support_machine_readings r
    LEFT JOIN "User" u ON u.id = r.created_by_id
    WHERE r.created_by_id = ${userId}
    ORDER BY r.created_at DESC
    LIMIT 200
  `;
  return { status: 200, data: rows.map(toDto) };
};

export const getAllReadings = async (): Promise<ServiceResult<unknown>> => {
  const rows = await prisma.$queryRaw<ReadingRow[]>`
    SELECT r.id, r.machine_name, r.reading_type, r.value, r.unit, r.notes,
           r.image_path, r.shift, r.created_by_id, r.created_at,
           u."fullName" AS creator_name
    FROM support_machine_readings r
    LEFT JOIN "User" u ON u.id = r.created_by_id
    ORDER BY r.created_at DESC
    LIMIT 500
  `;
  return { status: 200, data: rows.map(toDto) };
};

export const deleteSupportMachineReading = async (
  id: number,
  userId: number,
  isAdmin: boolean,
): Promise<ServiceResult<unknown>> => {
  const existing = await prisma.$queryRaw<
    { id: number; created_by_id: number }[]
  >`
    SELECT id, created_by_id FROM support_machine_readings WHERE id = ${id}
  `;

  if (!existing.length)
    return { status: 404, message: "Reading not found" };
  if (!isAdmin && existing[0].created_by_id !== userId)
    return { status: 403, message: "Forbidden" };

  await prisma.$executeRaw`
    DELETE FROM support_machine_readings WHERE id = ${id}
  `;
  return { status: 204 };
};
