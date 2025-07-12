"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { AttendanceStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type AttendanceInput = {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
  date: string; // ISO string
};

export async function upsertStudentAttendance(
  attendanceList: AttendanceInput[],
  classId: string,
  sectionId: string,
  date: string
) {
  // Only teachers or admins can submit attendance
  const session = await requireAuth();
  if (!session || !["TEACHER", "ADMIN"].includes(session.role)) {
    return { success: false, error: "Unauthorized" };
  }

  // Find teacherId if user is a teacher, else null for admin
  let teacherId: string | null = null;
  if (session.role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });
    teacherId = teacher ? teacher.id : null;
  }

  try {
    await Promise.all(
      attendanceList.map(async (att) => {
        // Check if an attendance record exists for this student and date
        const existing = await prisma.attendance.findUnique({
          where: {
            studentId_date: {
              studentId: att.studentId,
              date: new Date(date),
            },
          },
        });
        if (existing) {
          // Only update if the date matches exactly
          if (existing.date.toISOString().slice(0, 10) === date) {
            await prisma.attendance.update({
              where: {
                studentId_date: {
                  studentId: att.studentId,
                  date: new Date(date),
                },
              },
              data: {
                status: att.status,
                remarks: att.remarks || null,
                teacherId: teacherId,
                updatedAt: new Date(),
              },
            });
          } else {
            // Create a new record if the date does not match
            await prisma.attendance.create({
              data: {
                aamarId: session.aamarId,
                studentId: att.studentId,
                teacherId: teacherId,
                date: new Date(date),
                status: att.status,
                remarks: att.remarks || null,
              },
            });
          }
        } else {
          // No record found, create new
          await prisma.attendance.create({
            data: {
              aamarId: session.aamarId,
              studentId: att.studentId,
              teacherId: teacherId,
              date: new Date(date),
              status: att.status,
              remarks: att.remarks || null,
            },
          });
        }
      })
    );
    revalidatePath("/dashboard/attendance");
    return { success: true };
  } catch (error) {
    console.error("Attendance upsert error:", error);
    return { success: false, error: "Failed to save attendance" };
  }
}

export async function getSectionAttendanceByDate(sectionId: string, date: string) {
  const session = await requireAuth();
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    // Get all students in the section
    const students = await prisma.student.findMany({
      where: {
        sectionId,
        aamarId: session.aamarId,
      },
      include: {
        user: true,
        attendance: {
          where: {
            date: new Date(date),
          },
        },
      },
      orderBy: { rollNumber: "asc" },
    });

    // Map to include attendance status for the date
    const result = students.map((student) => ({
      id: student.id,
      rollNumber: student.rollNumber,
      user: student.user,
      attendanceStatus: student.attendance[0]?.status || null,
    }));

    return { success: true, data: result };
  } catch (error) {
    console.error("getSectionAttendanceByDate error:", error);
    return { success: false, error: "Failed to fetch attendance" };
  }
} 