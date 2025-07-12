'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/session';

// Remove hardcoded identifier - now using session data
// const CURRENT_AAMAR_ID = '234567';

interface ClassFormData {
  name: string;
  academicYearId: string;
  branchId: string;
  teacherId?: string;
  capacity?: number;
  description?: string;
  subjectIds?: string[];
}

interface ClassData {
  id: string;
  name: string;
  academicYearId: string;
  academicYear?: {
    id: string;
    displayName: string;
    startingYear: number;
    status: boolean;
  } | null;
  branchId: string;
  teacherId?: string | null;
  totalStudents: number;
  totalSubjects: number;
  totalTimetables: number;
  teacher?: {
    id: string;
    userId: string;
    name: string;
    email: string;
    phone: string | null;
    qualification: string | null;
    experience: number | null;
    subjects: string[];
  } | null;
  branch?: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
  } | null;
  sections?: Array<{
    id: string;
    name: string;
    displayName: string;
    capacity: number;
    students: Array<{
      id: string;
      name: string;
      rollNumber: string;
    }>;
  }>;
}

interface ClassResult {
  success: boolean;
  message: string;
  data?: ClassData | ClassData[] | unknown;
  error?: string;
}

// Create a new class
export async function createClass(formData: ClassFormData): Promise<ClassResult> {
  try {
    // Get session data for multi-tenancy
    const session = await requireAuth();
    
    // Validate required fields
    if (!formData.name || !formData.branchId || !formData.academicYearId) {
      return {
        success: false,
        error: 'Name, branch, and academic year are required',
        message: 'Please fill in all required fields'
      };
    }

    // Check if class with same name already exists in the branch
    const existingClass = await prisma.class.findFirst({
      where: {
        aamarId: session.aamarId,
        name: formData.name,
        branchId: formData.branchId,
        academicYearId: formData.academicYearId,
      },
    });

    if (existingClass) {
      return {
        success: false,
        error: 'Class already exists',
        message: `Class ${formData.name} already exists for this academic year`,
      };
    }

    // Verify branch belongs to the same aamarId
    const branch = await prisma.branch.findFirst({
      where: {
        id: formData.branchId,
        aamarId: session.aamarId,
      },
    });

    if (!branch) {
      return {
        success: false,
        error: 'Invalid branch',
        message: 'The selected branch is not valid',
      };
    }

    // If teacher is specified, verify they belong to the same aamarId
    if (formData.teacherId) {
      const teacher = await prisma.teacher.findFirst({
        where: {
          id: formData.teacherId,
          aamarId: session.aamarId,
        },
      });

      if (!teacher) {
        return {
          success: false,
          error: 'Invalid teacher',
          message: 'The selected teacher is not valid',
        };
      }
    }

    const newClass = await prisma.class.create({
      data: {
        aamarId: session.aamarId,
        name: formData.name,
        branchId: formData.branchId,
        academicYearId: formData.academicYearId,
        teacherId: formData.teacherId,
      },
      include: {
        branch: true,
        academicYear: true,
        teacher: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    revalidatePath('/dashboard/classes');
    return {
      success: true,
      data: newClass,
      message: 'Class created successfully',
    };
  } catch (error) {
    console.error('Error creating class:', error);
    return {
      success: false,
      error: 'Failed to create class',
      message: 'An error occurred while creating the class',
    };
  }
}

// Get all classes with full details
export async function getClasses(): Promise<ClassResult> {
  try {
    // Get session data for multi-tenancy
    const session = await requireAuth();
    
    const classes = await prisma.class.findMany({
      where: {
        aamarId: session.aamarId,
      },
      include: {
        branch: true,
        teacher: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        academicYear:{
          select:{
            displayName: true,
            id: true,
            startingYear: true
          }
        },
        subjects: true,
        sections: {
          include: {
            students: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            subjects: true,
            timetables: true,
          },
        },
      },
      orderBy: [
        { name: 'asc' },
      ],
    });

    // Calculate student counts from sections
    const classesWithCounts: ClassData[] = classes.map(cls => ({
      id: cls.id,
      name: cls.name,
      academicYearId: cls.academicYearId || '',
      academicYear: cls.academicYear ? {
        id: cls.academicYear.id,
        displayName: cls.academicYear.displayName,
        startingYear: cls.academicYear.startingYear,
        status: cls.academicYear.status,
      } : null,
      branchId: cls.branchId,
      teacherId: cls.teacherId,
      totalStudents: cls.sections.reduce((total, section) => total + section.students.length, 0),
      totalSubjects: cls._count.subjects,
      totalTimetables: cls._count.timetables,
      teacher: cls.teacher ? {
        id: cls.teacher.id,
        userId: cls.teacher.userId,
        name: `${cls.teacher.user.firstName} ${cls.teacher.user.lastName}`,
        email: cls.teacher.user.email,
        phone: cls.teacher.user.profile?.phone || null,
        qualification: cls.teacher.qualification,
        experience: cls.teacher.experience,
        subjects: cls.teacher.subjects,
      } : null,
      branch: cls.branch ? {
        id: cls.branch.id,
        name: cls.branch.name,
        address: cls.branch.address,
        phone: cls.branch.phone,
      } : null,
      sections: cls.sections.map(section => ({
        id: section.id,
        name: section.name,
        displayName: section.displayName,
        capacity: section.capacity,
        students: section.students.map(student => ({
          id: student.id,
          name: `${student.user.firstName} ${student.user.lastName}`,
          rollNumber: student.rollNumber,
        })),
      })),
    }));

    return {
      success: true,
      data: classesWithCounts,
      message: 'Classes retrieved successfully',
    };
  } catch (error) {
    console.error('Error fetching classes:', error);
    return {
      success: false,
      error: 'Failed to fetch classes',
      message: 'An error occurred while fetching classes',
    };
  }
}

// Get class by ID
export async function getClassById(id: string): Promise<ClassResult> {
  try {
    // Get session data for multi-tenancy
    const session = await requireAuth();
    
    const classData = await prisma.class.findFirst({
      where: {
        id,
        aamarId: session.aamarId,
      },
      include: {
        branch: true,
        teacher: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        subjects: true,
        sections: {
          include: {
            students: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            subjects: true,
            timetables: true,
          },
        },
      },
    });

    if (!classData) {
      return {
        success: false,
        error: 'Class not found',
        message: 'The specified class was not found',
      };
    }

    const classWithCounts: ClassData = {
      id: classData.id,
      name: classData.name,
      academicYear: classData.academicYear,
      branchId: classData.branchId,
      teacherId: classData.teacherId,
      totalStudents: classData.sections.reduce((total, section) => total + section.students.length, 0),
      totalSubjects: classData._count.subjects,
      totalTimetables: classData._count.timetables,
      teacher: classData.teacher ? {
        id: classData.teacher.id,
        userId: classData.teacher.userId,
        name: `${classData.teacher.user.firstName} ${classData.teacher.user.lastName}`,
        email: classData.teacher.user.email,
        phone: classData.teacher.user.profile?.phone || null,
        qualification: classData.teacher.qualification,
        experience: classData.teacher.experience,
        subjects: classData.teacher.subjects,
      } : null,
      branch: classData.branch ? {
        id: classData.branch.id,
        name: classData.branch.name,
        address: classData.branch.address,
        phone: classData.branch.phone,
      } : null,
      sections: classData.sections.map(section => ({
        id: section.id,
        name: section.name,
        displayName: section.displayName,
        capacity: section.capacity,
        students: section.students.map(student => ({
          id: student.id,
          name: `${student.user.firstName} ${student.user.lastName}`,
          rollNumber: student.rollNumber,
        })),
      })),
    };

    return {
      success: true,
      data: classWithCounts,
      message: 'Class retrieved successfully',
    };
  } catch (error) {
    console.error('Error fetching class:', error);
    return {
      success: false,
      error: 'Failed to fetch class',
      message: 'An error occurred while fetching the class',
    };
  }
}

// Update class
export async function updateClass(id: string, formData: Partial<ClassFormData>): Promise<ClassResult> {
  try {
    // Get session data for multi-tenancy
    const session = await requireAuth();
    
    // Check if class exists and belongs to the same aamarId
    const existingClass = await prisma.class.findFirst({
      where: {
        id,
        aamarId: session.aamarId,
      },
    });

    if (!existingClass) {
      return {
        success: false,
        error: 'Class not found',
        message: 'The specified class was not found',
      };
    }

    // If name, branch, or academic year is being updated, check for duplicates
    if (formData.name || formData.branchId || formData.academicYear) {
      const duplicateClass = await prisma.class.findFirst({
        where: {
          aamarId: session.aamarId,
          name: formData.name || existingClass.name,
          branchId: formData.branchId || existingClass.branchId,
          academicYear: formData.academicYear || existingClass.academicYear,
          id: { not: id },
        },
      });

      if (duplicateClass) {
        return {
          success: false,
          error: 'Class already exists',
          message: 'A class with this name already exists for the specified branch and academic year',
        };
      }
    }

    // If branch is being updated, verify it belongs to the same aamarId
    if (formData.branchId) {
      const branch = await prisma.branch.findFirst({
        where: {
          id: formData.branchId,
          aamarId: session.aamarId,
        },
      });

      if (!branch) {
        return {
          success: false,
          error: 'Invalid branch',
          message: 'The selected branch is not valid',
        };
      }
    }

    // If teacher is being updated, verify they belong to the same aamarId
    if (formData.teacherId) {
      const teacher = await prisma.teacher.findFirst({
        where: {
          id: formData.teacherId,
          aamarId: session.aamarId,
        },
      });

      if (!teacher) {
        return {
          success: false,
          error: 'Invalid teacher',
          message: 'The selected teacher is not valid',
        };
      }
    }

    const updatedClass = await prisma.class.update({
      where: { id },
      data: {
        name: formData.name,
        branchId: formData.branchId,
        academicYear: formData.academicYear,
        teacherId: formData.teacherId,
      },
      include: {
        branch: true,
        teacher: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    revalidatePath('/dashboard/classes');
    return {
      success: true,
      data: updatedClass,
      message: 'Class updated successfully',
    };
  } catch (error) {
    console.error('Error updating class:', error);
    return {
      success: false,
      error: 'Failed to update class',
      message: 'An error occurred while updating the class',
    };
  }
}

// Delete class
export async function deleteClass(id: string): Promise<ClassResult> {
  try {
    // Get session data for multi-tenancy
    const session = await requireAuth();
    
    // Check if class exists and belongs to the same aamarId
    const existingClass = await prisma.class.findFirst({
      where: {
        id,
        aamarId: session.aamarId,
      },
      include: {
        sections: {
          include: {
            students: true,
          },
        },
        subjects: true,
        timetables: true,
      },
    });

    if (!existingClass) {
      return {
        success: false,
        error: 'Class not found',
        message: 'The specified class was not found',
      };
    }

    // Check if class has students
    const totalStudents = existingClass.sections.reduce((total, section) => total + section.students.length, 0);
    if (totalStudents > 0) {
      return {
        success: false,
        error: 'Cannot delete class with students',
        message: `Cannot delete class "${existingClass.name}" because it has ${totalStudents} students enrolled. Please move all students to other classes first.`,
      };
    }

    // Check if class has subjects or timetables
    if (existingClass.subjects.length > 0 || existingClass.timetables.length > 0) {
      return {
        success: false,
        error: 'Cannot delete class with subjects or timetables',
        message: `Cannot delete class "${existingClass.name}" because it has ${existingClass.subjects.length} subjects and ${existingClass.timetables.length} timetables. Please remove all subjects and timetables first.`,
      };
    }

    await prisma.class.delete({
      where: { id },
    });

    revalidatePath('/dashboard/classes');
    return {
      success: true,
      message: 'Class deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting class:', error);
    return {
      success: false,
      error: 'Failed to delete class',
      message: 'An error occurred while deleting the class',
    };
  }
}

// Get classes by branch
export async function getClassesByBranch(branchId: string): Promise<ClassResult> {
  try {
    // Get session data for multi-tenancy
    const session = await requireAuth();
    
    const classes = await prisma.class.findMany({
      where: {
        branchId,
        aamarId: session.aamarId,
      },
      include: {
        branch: true,
        teacher: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        subjects: true,
        sections: {
          include: {
            students: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            subjects: true,
            timetables: true,
          },
        },
      },
      orderBy: [
        { name: 'asc' },
      ],
    });

    const classesWithCounts: ClassData[] = classes.map(cls => ({
      id: cls.id,
      name: cls.name,
      academicYear: cls.academicYear,
      branchId: cls.branchId,
      teacherId: cls.teacherId,
      totalStudents: cls.sections.reduce((total, section) => total + section.students.length, 0),
      totalSubjects: cls._count.subjects,
      totalTimetables: cls._count.timetables,
      teacher: cls.teacher ? {
        id: cls.teacher.id,
        userId: cls.teacher.userId,
        name: `${cls.teacher.user.firstName} ${cls.teacher.user.lastName}`,
        email: cls.teacher.user.email,
        phone: cls.teacher.user.profile?.phone || null,
        qualification: cls.teacher.qualification,
        experience: cls.teacher.experience,
        subjects: cls.teacher.subjects,
      } : null,
      branch: cls.branch ? {
        id: cls.branch.id,
        name: cls.branch.name,
        address: cls.branch.address,
        phone: cls.branch.phone,
      } : null,
      sections: cls.sections.map(section => ({
        id: section.id,
        name: section.name,
        displayName: section.displayName,
        capacity: section.capacity,
        students: section.students.map(student => ({
          id: student.id,
          name: `${student.user.firstName} ${student.user.lastName}`,
          rollNumber: student.rollNumber,
        })),
      })),
    }));

    return {
      success: true,
      data: classesWithCounts,
      message: 'Classes retrieved successfully',
    };
  } catch (error) {
    console.error('Error fetching classes by branch:', error);
    return {
      success: false,
      error: 'Failed to fetch classes',
      message: 'An error occurred while fetching classes',
    };
  }
}

// Get classes by aamarId (for external use)
export async function getClassesByAamarId(): Promise<ClassResult> {
  try {
    // This function delegates to getClasses() which already uses session data
    return await getClasses();
  } catch (error) {
    console.error('Error fetching classes by aamarId:', error);
    return {
      success: false,
      error: 'Failed to fetch classes',
      message: 'An error occurred while fetching classes',
    };
  }
}

// Assign students to class (placeholder for future implementation)
export async function assignStudentsToClass(classId: string, studentIds: string[]): Promise<ClassResult> {
  try {
    // Get session data for multi-tenancy
    const session = await requireAuth();
    
    // Verify class belongs to the same aamarId
    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        aamarId: session.aamarId,
      },
    });

    if (!classData) {
      return {
        success: false,
        error: 'Class not found',
        message: 'The specified class was not found',
      };
    }

    // This would require updating the Student model to have a direct classId relationship
    // For now, students are assigned to sections, which belong to classes
    // This function is a placeholder for future implementation
    
    // Log the studentIds for future implementation
    console.log(`Future implementation: Assign ${studentIds.length} students to class ${classId}`);
    
    // When this function is fully implemented, add revalidation here
    // revalidatePath('/dashboard/classes');
    
    return {
      success: true,
      message: 'Student assignment functionality will be implemented through sections',
    };
  } catch (error) {
    console.error('Error assigning students to class:', error);
    return {
      success: false,
      error: 'Failed to assign students',
      message: 'An error occurred while assigning students to the class',
    };
  }
}

// Get class statistics
export async function getClassStats(): Promise<ClassResult> {
  try {
    // Get session data for multi-tenancy
    const session = await requireAuth();
    
    const classes = await prisma.class.findMany({
      where: {
        aamarId: session.aamarId,
      },
      include: {
        sections: {
          include: {
            students: true,
          },
        },
        subjects: true,
        teacher: true,
      },
    });

    const totalClasses = classes.length;
    const totalStudents = classes.reduce((total, cls) => 
      total + cls.sections.reduce((sectionTotal, section) => sectionTotal + section.students.length, 0), 0);
    const classesWithTeachers = classes.filter(cls => cls.teacher).length;
    const averageStudentsPerClass = totalClasses > 0 ? Math.round(totalStudents / totalClasses) : 0;

    const stats = {
      totalClasses,
      totalStudents,
      classesWithTeachers,
      classesWithoutTeachers: totalClasses - classesWithTeachers,
      averageStudentsPerClass,
    };

    return {
      success: true,
      data: stats,
      message: 'Class statistics retrieved successfully',
    };
  } catch (error) {
    console.error('Error fetching class statistics:', error);
    return {
      success: false,
      error: 'Failed to fetch class statistics',
      message: 'An unexpected error occurred while fetching statistics',
    };
  }
}

// Get classes by academic year
export async function getClassesByAcademicYear(academicYearId: string): Promise<ClassResult> {
  try {
    // Get session data for multi-tenancy
    const session = await requireAuth();
    
    const classes = await prisma.class.findMany({
      where: {
        aamarId: session.aamarId,
        academicYearId,
      },
      include: {
        branch: true,
        teacher: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        subjects: true,
        sections: {
          include: {
            students: true,
          },
        },
        _count: {
          select: {
            subjects: true,
            timetables: true,
          },
        },
      },
      orderBy: [
        { name: 'asc' },
      ],
    });

    const classesWithCounts: ClassData[] = classes.map(cls => ({
      id: cls.id,
      name: cls.name,
      academicYear: cls.academicYear,
      branchId: cls.branchId,
      teacherId: cls.teacherId,
      totalStudents: cls.sections.reduce((total, section) => total + section.students.length, 0),
      totalSubjects: cls._count.subjects,
      totalTimetables: cls._count.timetables,
      teacher: cls.teacher ? {
        id: cls.teacher.id,
        userId: cls.teacher.userId,
        name: `${cls.teacher.user.firstName} ${cls.teacher.user.lastName}`,
        email: cls.teacher.user.email,
        phone: cls.teacher.user.profile?.phone || null,
        qualification: cls.teacher.qualification,
        experience: cls.teacher.experience,
        subjects: cls.teacher.subjects,
      } : null,
      branch: cls.branch ? {
        id: cls.branch.id,
        name: cls.branch.name,
        address: cls.branch.address,
        phone: cls.branch.phone,
      } : null,
    }));

    return {
      success: true,
      data: classesWithCounts,
      message: 'Classes retrieved successfully',
    };
  } catch (error) {
    console.error('Error fetching classes by academic year:', error);
    return {
      success: false,
      error: 'Failed to fetch classes',
      message: 'An error occurred while fetching classes',
    };
  }
}

// Search classes
export async function searchClasses(query: string): Promise<ClassResult> {
  try {
    // Get session data for multi-tenancy
    const session = await requireAuth();
    
    const classes = await prisma.class.findMany({
      where: {
        aamarId: session.aamarId,
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            academicYear: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            branch: {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
          },
          {
            teacher: {
              user: {
                firstName: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            teacher: {
              user: {
                lastName: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
            },
          },
        ],
      },
      include: {
        branch: true,
        teacher: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        subjects: true,
        sections: {
          include: {
            students: true,
          },
        },
        _count: {
          select: {
            subjects: true,
            timetables: true,
          },
        },
      },
      orderBy: [
        { name: 'asc' },
      ],
    });

    const classesWithCounts: ClassData[] = classes.map(cls => ({
      id: cls.id,
      name: cls.name,
      academicYear: cls.academicYear,
      branchId: cls.branchId,
      teacherId: cls.teacherId,
      totalStudents: cls.sections.reduce((total, section) => total + section.students.length, 0),
      totalSubjects: cls._count.subjects,
      totalTimetables: cls._count.timetables,
      teacher: cls.teacher ? {
        id: cls.teacher.id,
        userId: cls.teacher.userId,
        name: `${cls.teacher.user.firstName} ${cls.teacher.user.lastName}`,
        email: cls.teacher.user.email,
        phone: cls.teacher.user.profile?.phone || null,
        qualification: cls.teacher.qualification,
        experience: cls.teacher.experience,
        subjects: cls.teacher.subjects,
      } : null,
      branch: cls.branch ? {
        id: cls.branch.id,
        name: cls.branch.name,
        address: cls.branch.address,
        phone: cls.branch.phone,
      } : null,
    }));

    return {
      success: true,
      data: classesWithCounts,
      message: 'Classes retrieved successfully',
    };
  } catch (error) {
    console.error('Error searching classes:', error);
    return {
      success: false,
      error: 'Failed to search classes',
      message: 'An error occurred while searching classes',
    };
  }
}

// Get available teachers for class assignment
export async function getAvailableTeachers(branchId?: string): Promise<ClassResult> {
  try {
    // Get session data for multi-tenancy
    const session = await requireAuth();
    
    const teachers = await prisma.teacher.findMany({
      where: {
        aamarId: session.aamarId,
        user: {
          isActive: true,
          ...(branchId && { branchId }),
        },
      },
      include: {
        user: {
          include: {
            profile: true,
            branch: true,
          },
        },
        classes: true,
      },
      orderBy: [
        {
          user: {
            firstName: 'asc',
          },
        },
      ],
    });

    const availableTeachers = teachers.map(teacher => ({
      id: teacher.id,
      userId: teacher.userId,
      name: `${teacher.user.firstName} ${teacher.user.lastName}`,
      email: teacher.user.email,
      phone: teacher.user.profile?.phone || null,
      qualification: teacher.qualification,
      experience: teacher.experience,
      subjects: teacher.subjects,
      totalClasses: teacher.classes.length,
      branch: teacher.user.branch ? {
        id: teacher.user.branch.id,
        name: teacher.user.branch.name,
        address: teacher.user.branch.address,
        phone: teacher.user.branch.phone,
      } : null,
    }));

    return {
      success: true,
      data: availableTeachers,
      message: 'Available teachers retrieved successfully',
    };
  } catch (error) {
    console.error('Error fetching available teachers:', error);
    return {
      success: false,
      error: 'Failed to fetch teachers',
      message: 'An error occurred while fetching available teachers',
    };
  }
}

// Get subjects for class
export async function getSubjectsForClass(classId: string): Promise<ClassResult> {
  try {
    // Get session data for multi-tenancy
    const session = await requireAuth();
    const subjects = await prisma.subject.findMany({
      where: {
        aamarId: session.aamarId,
        classId: classId,
      },
      include: {
        school: true,
        class: true,
      },
      orderBy: [
        { name: 'asc' },
      ],
    });
    return {
      success: true,
      data: subjects,
      message: 'Subjects retrieved successfully',
    };
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return {
      success: false,
      error: 'Failed to fetch subjects',
      message: 'An error occurred while fetching subjects',
    };
  }
} 


