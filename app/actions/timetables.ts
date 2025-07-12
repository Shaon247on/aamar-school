"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface TimetableData {
  id: string;
  aamarId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  classId: string;
  subjectId: string;
  class?: {
    id: string;
    name: string;
    academicYearId: string;
    academicYear?: {
      id: string;
      displayName: string;
    };
    branch: {
      name: string;
    };
  };
  subject?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface CreateTimetableData {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  classId: string;
  subjectId: string;
}

export interface UpdateTimetableData {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  classId?: string;
  subjectId?: string;
}

export async function getTimetables(classId?: string): Promise<{
  success: boolean;
  data?: TimetableData[];
  error?: string;
}> {
  try {
    const where = classId ? { classId } : {};
    
    const timetables = await prisma.timetable.findMany({
      where: {
        ...where,
        aamarId: "AAMAR001"
      },
      include: {
        class: {
          include: {
            branch: true,
            academicYear: true
          }
        },
        subject: true
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    return {
      success: true,
      data: timetables.map(t => ({
        ...t,
        startTime: t.startTime.toISOString(),
        endTime: t.endTime.toISOString()
      }))
    };
  } catch (error) {
    console.error("Error fetching timetables:", error);
    return {
      success: false,
      error: "Failed to fetch timetables"
    };
  }
}

export async function getTimetableById(id: string): Promise<{
  success: boolean;
  data?: TimetableData;
  error?: string;
}> {
  try {
    const timetable = await prisma.timetable.findUnique({
      where: {
        id,
        aamarId: "AAMAR001"
      },
      include: {
        class: {
          include: {
            branch: true,
            academicYear: true
          }
        },
        subject: true
      }
    });

    if (!timetable) {
      return {
        success: false,
        error: "Timetable not found"
      };
    }

    return {
      success: true,
      data: {
        ...timetable,
        startTime: timetable.startTime.toISOString(),
        endTime: timetable.endTime.toISOString()
      }
    };
  } catch (error) {
    console.error("Error fetching timetable:", error);
    return {
      success: false,
      error: "Failed to fetch timetable"
    };
  }
}

export async function createTimetable(data: CreateTimetableData): Promise<{
  success: boolean;
  data?: TimetableData;
  error?: string;
  message?: string;
}> {
  try {
    // Validate required fields
    if (!data.dayOfWeek || !data.startTime || !data.endTime || !data.classId || !data.subjectId) {
      return {
        success: false,
        error: "All fields are required"
      };
    }

    // Check if class exists
    const classExists = await prisma.class.findUnique({
      where: { id: data.classId }
    });

    if (!classExists) {
      return {
        success: false,
        error: "Class not found"
      };
    }

    // Check if subject exists
    const subjectExists = await prisma.subject.findUnique({
      where: { id: data.subjectId }
    });

    if (!subjectExists) {
      return {
        success: false,
        error: "Subject not found"
      };
    }

    // Check for time conflicts
    const conflictingTimetable = await prisma.timetable.findFirst({
      where: {
        classId: data.classId,
        dayOfWeek: data.dayOfWeek,
        aamarId: "AAMAR001",
        OR: [
          {
            AND: [
              { startTime: { lte: new Date(data.startTime) } },
              { endTime: { gt: new Date(data.startTime) } }
            ]
          },
          {
            AND: [
              { startTime: { lt: new Date(data.endTime) } },
              { endTime: { gte: new Date(data.endTime) } }
            ]
          },
          {
            AND: [
              { startTime: { gte: new Date(data.startTime) } },
              { endTime: { lte: new Date(data.endTime) } }
            ]
          }
        ]
      }
    });

    if (conflictingTimetable) {
      return {
        success: false,
        error: "Time slot conflicts with existing timetable"
      };
    }

    const timetable = await prisma.timetable.create({
      data: {
        aamarId: "AAMAR001",
        dayOfWeek: data.dayOfWeek,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        classId: data.classId,
        subjectId: data.subjectId
      },
      include: {
        class: {
          include: {
            branch: true
          }
        },
        subject: true
      }
    });

    revalidatePath("/dashboard/classes");

    return {
      success: true,
      data: {
        ...timetable,
        startTime: timetable.startTime.toISOString(),
        endTime: timetable.endTime.toISOString()
      },
      message: "Timetable created successfully"
    };
  } catch (error) {
    console.error("Error creating timetable:", error);
    return {
      success: false,
      error: "Failed to create timetable"
    };
  }
}

export async function updateTimetable(
  id: string,
  data: UpdateTimetableData
): Promise<{
  success: boolean;
  data?: TimetableData;
  error?: string;
  message?: string;
}> {
  try {
    // Check if timetable exists
    const existingTimetable = await prisma.timetable.findUnique({
      where: { id }
    });

    if (!existingTimetable) {
      return {
        success: false,
        error: "Timetable not found"
      };
    }

    // Check for time conflicts if time is being updated
    if (data.startTime || data.endTime || data.dayOfWeek) {
      const conflictingTimetable = await prisma.timetable.findFirst({
        where: {
          id: { not: id },
          classId: data.classId || existingTimetable.classId,
          dayOfWeek: data.dayOfWeek || existingTimetable.dayOfWeek,
          aamarId: "AAMAR001",
          OR: [
            {
              AND: [
                { startTime: { lte: new Date(data.startTime || existingTimetable.startTime) } },
                { endTime: { gt: new Date(data.startTime || existingTimetable.startTime) } }
              ]
            },
            {
              AND: [
                { startTime: { lt: new Date(data.endTime || existingTimetable.endTime) } },
                { endTime: { gte: new Date(data.endTime || existingTimetable.endTime) } }
              ]
            },
            {
              AND: [
                { startTime: { gte: new Date(data.startTime || existingTimetable.startTime) } },
                { endTime: { lte: new Date(data.endTime || existingTimetable.endTime) } }
              ]
            }
          ]
        }
      });

      if (conflictingTimetable) {
        return {
          success: false,
          error: "Time slot conflicts with existing timetable"
        };
      }
    }

    const updateData: any = {};
    if (data.dayOfWeek !== undefined) updateData.dayOfWeek = data.dayOfWeek;
    if (data.startTime) updateData.startTime = new Date(data.startTime);
    if (data.endTime) updateData.endTime = new Date(data.endTime);
    if (data.classId) updateData.classId = data.classId;
    if (data.subjectId) updateData.subjectId = data.subjectId;

    const timetable = await prisma.timetable.update({
      where: { id },
      data: updateData,
      include: {
        class: {
          include: {
            branch: true
          }
        },
        subject: true
      }
    });

    revalidatePath("/dashboard/classes");

    return {
      success: true,
      data: {
        ...timetable,
        startTime: timetable.startTime.toISOString(),
        endTime: timetable.endTime.toISOString()
      },
      message: "Timetable updated successfully"
    };
  } catch (error) {
    console.error("Error updating timetable:", error);
    return {
      success: false,
      error: "Failed to update timetable"
    };
  }
}

export async function deleteTimetable(id: string): Promise<{
  success: boolean;
  error?: string;
  message?: string;
}> {
  try {
    const timetable = await prisma.timetable.findUnique({
      where: { id }
    });

    if (!timetable) {
      return {
        success: false,
        error: "Timetable not found"
      };
    }

    await prisma.timetable.delete({
      where: { id }
    });

    revalidatePath("/dashboard/classes");

    return {
      success: true,
      message: "Timetable deleted successfully"
    };
  } catch (error) {
    console.error("Error deleting timetable:", error);
    return {
      success: false,
      error: "Failed to delete timetable"
    };
  }
}

export async function getTimetableStats(): Promise<{
  success: boolean;
  data?: {
    totalTimetables: number;
    totalClasses: number;
    totalSubjects: number;
    averagePeriodsPerDay: number;
  };
  error?: string;
}> {
  try {
    const [totalTimetables, totalClasses, totalSubjects] = await Promise.all([
      prisma.timetable.count({
        where: { aamarId: "AAMAR001" }
      }),
      prisma.class.count({
        where: { aamarId: "AAMAR001" }
      }),
      prisma.subject.count({
        where: { aamarId: "AAMAR001" }
      })
    ]);

    // Calculate average periods per day
    const periodsPerDay = await prisma.timetable.groupBy({
      by: ['dayOfWeek'],
      where: { aamarId: "AAMAR001" },
      _count: {
        id: true
      }
    });

    const averagePeriodsPerDay = periodsPerDay.length > 0 
      ? Math.round(periodsPerDay.reduce((sum, day) => sum + day._count.id, 0) / periodsPerDay.length)
      : 0;

    return {
      success: true,
      data: {
        totalTimetables,
        totalClasses,
        totalSubjects,
        averagePeriodsPerDay
      }
    };
  } catch (error) {
    console.error("Error fetching timetable stats:", error);
    return {
      success: false,
      error: "Failed to fetch timetable statistics"
    };
  }
}

// Helper function to get day name from day number
export async function getDayName(dayOfWeek: number): Promise<string> {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[dayOfWeek] || "Unknown";
}

// Helper function to format time
export async function formatTime(timeString: string): Promise<string> {
  const date = new Date(timeString);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
} 