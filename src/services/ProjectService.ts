import { ProjectStatus } from "@prisma/client";
import prisma from "../prisma";
import * as S3Service from "./S3Service";

// Valid status transitions
const STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  CREATED: [ProjectStatus.DOCK_BISQUE, ProjectStatus.DAMAGED],
  DOCK_BISQUE: [ProjectStatus.DRYING, ProjectStatus.DAMAGED],
  DRYING: [ProjectStatus.KILN_BISQUE, ProjectStatus.DAMAGED],
  KILN_BISQUE: [ProjectStatus.BISQUE_DONE, ProjectStatus.DAMAGED],
  BISQUE_DONE: [ProjectStatus.DOCK_GLAZE, ProjectStatus.PICKUP_READY, ProjectStatus.DAMAGED],
  DOCK_GLAZE: [ProjectStatus.DRYING_GLAZE, ProjectStatus.DAMAGED],
  DRYING_GLAZE: [ProjectStatus.KILN_GLAZE, ProjectStatus.DAMAGED],
  KILN_GLAZE: [ProjectStatus.GLAZE_DONE, ProjectStatus.DAMAGED],
  GLAZE_DONE: [ProjectStatus.PICKUP_READY, ProjectStatus.DAMAGED],
  PICKUP_READY: [ProjectStatus.PICKED_UP, ProjectStatus.DOCK_BISQUE, ProjectStatus.DOCK_GLAZE, ProjectStatus.DAMAGED],
  PICKED_UP: [ProjectStatus.DOCK_BISQUE, ProjectStatus.DOCK_GLAZE],
  DAMAGED: [],
};

export async function createProject(
  customerId: number,
  studioId: number,
  data: {
    name: string;
    description?: string;
    tags?: string[];
    classSessionId?: number;
    openStudioBookingId?: number;
  }
) {
  return prisma.project.create({
    data: {
      studioId,
      customerId,
      name: data.name,
      description: data.description,
      tags: data.tags || [],
      classSessionId: data.classSessionId,
      openStudioBookingId: data.openStudioBookingId,
    },
    include: {
      images: true,
      customer: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getMyProjects(
  customerId: number,
  filters?: {
    status?: ProjectStatus;
    search?: string;
    tag?: string;
    page?: number;
    limit?: number;
  }
) {
  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const where: any = { customerId };

  if (filters?.status) {
    where.status = filters.status;
  }
  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters?.tag) {
    where.tags = { has: filters.tag };
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        firings: {
          include: { firingProduct: { select: { name: true, firingType: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.project.count({ where }),
  ]);

  return { projects, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getProject(projectId: number, customerId?: number) {
  const where: any = { id: projectId };
  if (customerId) where.customerId = customerId;

  return prisma.project.findFirst({
    where,
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      firings: {
        include: { firingProduct: { select: { name: true, firingType: true, price: true } } },
        orderBy: { requestedAt: "desc" },
      },
      statusHistory: {
        include: { changedBy: { select: { id: true, name: true } } },
        orderBy: { changedAt: "asc" },
      },
      customer: { select: { id: true, name: true, email: true, picture: true } },
      classSession: {
        select: {
          id: true,
          sessionDate: true,
          class: { select: { name: true } },
        },
      },
      openStudioBooking: {
        select: { id: true, startTime: true, endTime: true },
      },
    },
  });
}

export async function updateProject(
  projectId: number,
  customerId: number,
  data: { name?: string; description?: string; tags?: string[] }
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, customerId },
  });
  if (!project) throw new Error("Project not found");

  return prisma.project.update({
    where: { id: projectId },
    data,
    include: { images: true },
  });
}

export async function deleteProject(projectId: number, customerId: number) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, customerId },
    include: { firings: true, images: true },
  });
  if (!project) throw new Error("Project not found");

  // Don't allow deletion if firings are in progress
  const activeFirings = project.firings.filter((f) => !f.completedAt);
  if (activeFirings.length > 0) {
    throw new Error("Cannot delete project with active firing requests");
  }

  // Delete S3 images
  for (const image of project.images) {
    try {
      await S3Service.deleteImage(image.s3Key);
    } catch (err) {
      console.error(`Failed to delete S3 image ${image.s3Key}:`, err);
    }
  }

  await prisma.project.delete({ where: { id: projectId } });
}

export async function addImages(
  projectId: number,
  studioId: number,
  files: Express.Multer.File[],
  stage?: string
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId },
  });
  if (!project) throw new Error("Project not found");

  const maxOrder = await prisma.projectImage.findFirst({
    where: { projectId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  let sortOrder = (maxOrder?.sortOrder || 0) + 1;

  const images = [];
  for (const file of files) {
    const { url, key } = await S3Service.uploadImage(file, studioId, projectId);
    const image = await prisma.projectImage.create({
      data: {
        projectId,
        imageUrl: url,
        s3Key: key,
        stage,
        sortOrder: sortOrder++,
      },
    });
    images.push(image);
  }

  return images;
}

export async function removeImage(imageId: number, customerId?: number) {
  const image = await prisma.projectImage.findUnique({
    where: { id: imageId },
    include: { project: { select: { customerId: true } } },
  });
  if (!image) throw new Error("Image not found");
  if (customerId && image.project.customerId !== customerId) {
    throw new Error("Unauthorized");
  }

  try {
    await S3Service.deleteImage(image.s3Key);
  } catch (err) {
    console.error(`Failed to delete S3 image ${image.s3Key}:`, err);
  }

  await prisma.projectImage.delete({ where: { id: imageId } });
}

// Admin functions

export async function getProjectsByStatus(filters?: {
  status?: ProjectStatus;
  customerId?: number;
  search?: string;
}) {
  const where: any = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.customerId) where.customerId = filters.customerId;
  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { customer: { name: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  return prisma.project.findMany({
    where,
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      customer: { select: { id: true, name: true, email: true, picture: true } },
      firings: {
        include: { firingProduct: { select: { name: true, firingType: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getProjectsBoard() {
  const statuses: ProjectStatus[] = [
    ProjectStatus.DOCK_BISQUE,
    ProjectStatus.DRYING,
    ProjectStatus.KILN_BISQUE,
    ProjectStatus.BISQUE_DONE,
    ProjectStatus.DOCK_GLAZE,
    ProjectStatus.DRYING_GLAZE,
    ProjectStatus.KILN_GLAZE,
    ProjectStatus.GLAZE_DONE,
    ProjectStatus.PICKUP_READY,
  ];

  const board: Record<string, any[]> = {};

  for (const status of statuses) {
    board[status] = await prisma.project.findMany({
      where: { status },
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        customer: { select: { id: true, name: true, picture: true } },
      },
      orderBy: { updatedAt: "asc" },
    });
  }

  return board;
}

export async function updateProjectStatus(
  projectId: number,
  newStatus: ProjectStatus,
  changedById?: number,
  note?: string
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId },
  });
  if (!project) throw new Error("Project not found");

  const validTransitions = STATUS_TRANSITIONS[project.status];
  if (!validTransitions.includes(newStatus)) {
    throw new Error(
      `Invalid status transition from ${project.status} to ${newStatus}`
    );
  }

  const [updated] = await prisma.$transaction([
    prisma.project.update({
      where: { id: projectId },
      data: { status: newStatus },
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        customer: { select: { id: true, name: true } },
      },
    }),
    prisma.projectStatusHistory.create({
      data: {
        projectId,
        fromStatus: project.status,
        toStatus: newStatus,
        changedById,
        note,
      },
    }),
  ]);

  return updated;
}

export async function batchUpdateStatus(
  projectIds: number[],
  newStatus: ProjectStatus,
  changedById?: number
) {
  const results = [];
  for (const projectId of projectIds) {
    try {
      const updated = await updateProjectStatus(
        projectId,
        newStatus,
        changedById
      );
      results.push({ projectId, success: true, project: updated });
    } catch (err: any) {
      results.push({ projectId, success: false, error: err.message });
    }
  }
  return results;
}
