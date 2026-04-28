import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = {
    status: number;
    message?: string;
    data?: T;
};

export const getAllSuppliers = async (): Promise<ServiceResult<unknown>> => {
    const suppliers = await prisma.supplier.findMany({
        where: { deletedAt: null },
        include: {
            _count: { select: { purchases: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    const result = suppliers.map((s) => ({
        ...s,
        purchaseCount: s._count.purchases,
    }));

    return { status: 200, data: result };
};

export const createSupplier = async (payload: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    contactPerson?: string;
    website?: string;
    category?: string;
    leadTimeDays?: number;
    rating?: number;
    notes?: string;
}): Promise<ServiceResult<unknown>> => {
    const name = payload.name?.trim();
    if (!name) {
        return { status: 400, message: "Supplier name is required" };
    }

    if (payload.rating !== undefined && payload.rating !== null) {
        const r = Number(payload.rating);
        if (r < 1 || r > 5) {
            return { status: 400, message: "Rating must be between 1 and 5" };
        }
    }

    const supplier = await prisma.supplier.create({
        data: {
            name,
            phone: payload.phone?.trim() || null,
            email: payload.email?.trim() || null,
            address: payload.address?.trim() || null,
            contactPerson: payload.contactPerson?.trim() || null,
            website: payload.website?.trim() || null,
            category: payload.category?.trim() || null,
            leadTimeDays: payload.leadTimeDays ? Number(payload.leadTimeDays) : null,
            rating: payload.rating ? Number(payload.rating) : null,
            notes: payload.notes?.trim() || null,
        },
    });

    return { status: 201, data: supplier };
};

export const updateSupplier = async (
    id: number,
    payload: Record<string, unknown>
): Promise<ServiceResult<unknown>> => {
    try {
        const supplierId = Number(id);
        if (!Number.isInteger(supplierId) || supplierId <= 0) {
            return { status: 400, message: "Invalid supplier id" };
        }

        const existing = await prisma.supplier.findUnique({ where: { id: supplierId } });
        if (!existing || existing.deletedAt) {
            return { status: 404, message: "Supplier not found" };
        }

        const rating = payload.rating != null ? Number(payload.rating) : null;
        if (rating !== null && (rating < 1 || rating > 5)) {
            return { status: 400, message: "Rating must be between 1 and 5" };
        }

        const str = (v: unknown) => (typeof v === "string" ? v.trim() || null : null);

        const updated = await prisma.supplier.update({
            where: { id: supplierId },
            data: {
                ...("name" in payload && payload.name != null && { name: String(payload.name).trim() }),
                ...("phone" in payload && { phone: str(payload.phone) }),
                ...("email" in payload && { email: str(payload.email) }),
                ...("address" in payload && { address: str(payload.address) }),
                ...("contactPerson" in payload && { contactPerson: str(payload.contactPerson) }),
                ...("website" in payload && { website: str(payload.website) }),
                ...("category" in payload && { category: str(payload.category) }),
                ...("leadTimeDays" in payload && { leadTimeDays: payload.leadTimeDays != null ? Number(payload.leadTimeDays) : null }),
                ...("rating" in payload && { rating }),
                ...("notes" in payload && { notes: str(payload.notes) }),
            },
        });

        return { status: 200, data: updated };
    } catch (error) {
        console.error("Update supplier error:", error);
        return { status: 500, message: "Failed to update supplier" };
    }
};

export const deleteSupplier = async (id: number): Promise<ServiceResult<unknown>> => {
    const supplierId = Number(id);
    if (!Number.isInteger(supplierId) || supplierId <= 0) {
        return { status: 400, message: "Invalid supplier id" };
    }

    const existing = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!existing || existing.deletedAt) {
        return { status: 404, message: "Supplier not found" };
    }

    await prisma.supplier.update({
        where: { id: supplierId },
        data: { deletedAt: new Date() },
    });

    return { status: 200, data: { message: "Supplier deleted" } };
};
