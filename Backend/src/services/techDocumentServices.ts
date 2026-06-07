import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

const uploaderSelect = { id: true, fullName: true };

export const getAllTechDocuments = async (): Promise<ServiceResult<unknown>> => {
  try {
    const documents = await prisma.techDocument.findMany({
      include: {
        uploadedBy: { select: uploaderSelect },
      },
      orderBy: { createdAt: "desc" },
    });
    return { status: 200, data: documents };
  } catch (error) {
    console.error("Get all tech documents error:", error);
    return { status: 500, message: "Failed to fetch tech documents" };
  }
};

export const createTechDocument = async (
  uploadedById: number,
  title: string,
  category: string,
  description?: string,
  fileName?: string,
  filePath?: string,
  fileSize?: number,
  mimeType?: string,
  images?: string[],
): Promise<ServiceResult<unknown>> => {
  try {
    if (!title || !title.trim()) {
      return { status: 400, message: "title is required" };
    }

    if (!category || !category.trim()) {
      return { status: 400, message: "category is required" };
    }

    const validCategories = [
      "Manual",
      "Maintenance",
      "Safety",
      "Reference",
      "Support",
      "Other",
    ];

    if (!validCategories.includes(category)) {
      return {
        status: 400,
        message: `category must be one of: ${validCategories.join(", ")}`,
      };
    }

    const document = await prisma.techDocument.create({
      data: {
        uploadedById,
        title: title.trim(),
        category,
        description: description?.trim() ?? null,
        fileName: fileName ?? null,
        filePath: filePath ?? null,
        fileSize: fileSize ?? null,
        mimeType: mimeType ?? null,
        images: images ?? [],
        downloadCount: 0,
      },
      include: {
        uploadedBy: { select: uploaderSelect },
      },
    });

    return { status: 201, data: document };
  } catch (error) {
    console.error("Create tech document error:", error);
    return { status: 500, message: "Failed to create tech document" };
  }
};

export const incrementDownloadCount = async (
  id: number,
): Promise<ServiceResult<unknown>> => {
  try {
    const existing = await prisma.techDocument.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return { status: 404, message: "Tech document not found" };
    }

    const updated = await prisma.techDocument.update({
      where: { id },
      data: {
        downloadCount: { increment: 1 },
      },
      include: {
        uploadedBy: { select: uploaderSelect },
      },
    });

    return { status: 200, data: updated };
  } catch (error) {
    console.error("Increment download count error:", error);
    return { status: 500, message: "Failed to update download count" };
  }
};

export const updateTechDocument = async (
  id: number,
  title?: string,
  category?: string,
  description?: string,
): Promise<ServiceResult<unknown>> => {
  try {
    const existing = await prisma.techDocument.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { status: 404, message: "Tech document not found" };

    const validCategories = ["Manual", "Maintenance", "Safety", "Reference", "Support", "Other"];
    if (category && !validCategories.includes(category)) {
      return { status: 400, message: `category must be one of: ${validCategories.join(", ")}` };
    }

    const updated = await prisma.techDocument.update({
      where: { id },
      data: {
        ...(title?.trim() ? { title: title.trim() } : {}),
        ...(category ? { category } : {}),
        ...(description !== undefined ? { description: description?.trim() ?? null } : {}),
      },
      include: { uploadedBy: { select: uploaderSelect } },
    });
    return { status: 200, data: updated };
  } catch (error) {
    console.error("Update tech document error:", error);
    return { status: 500, message: "Failed to update tech document" };
  }
};

export const deleteTechDocument = async (
  id: number,
): Promise<ServiceResult<unknown>> => {
  try {
    const existing = await prisma.techDocument.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return { status: 404, message: "Tech document not found" };
    }

    await prisma.techDocument.delete({ where: { id } });

    return { status: 200, data: { message: "Deleted successfully" } };
  } catch (error) {
    console.error("Delete tech document error:", error);
    return { status: 500, message: "Failed to delete tech document" };
  }
};
