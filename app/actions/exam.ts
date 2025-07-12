"use server";

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/session';
import { ExamType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export interface ExamFormData {
  name: string;
  examType: ExamType;
  description?: string;
  startDate: string;
  endDate: string;
  classId: string;
  academicYearId: string;
  subjects: {
    subjectId: string;
    fullMarks: number;
    passMarks: number;
    examDate: string;
    duration: number;
  }[];
}

export interface ExamData {
  id: string;
  name: string;
  examType: ExamType;
  description?: string;
  startDate: Date;
  endDate: Date;
  classId: string;
  academicYearId: string;
  schoolId: string;
  class: {
    id: string;
    name: string;
  };
  academicYear: {
    id: string;
    displayName: string;
  };
  subjects: {
    id: string;
    subjectId: string;
    fullMarks: number;
    passMarks: number;
    examDate: Date;
    duration: number;
    subject: {
      id: string;
      name: string;
      code: string;
    };
  }[];
  results: {
    id: string;
    studentId: string;
    subjectId: string;
    obtainedMarks: number;
    fullMarks: number;
    grade: string;
    gpa?: number;
  }[];
  _count: {
    subjects: number;
    results: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ExamResult {
  success: boolean;
  message: string;
  data?: ExamData | ExamData[];
  error?: string;
}

// Create a new exam
export async function createExam(formData: ExamFormData): Promise<ExamResult> {
  try {
    const session = await requireAuth();
    
    // Validate required fields
    if (!formData.name || !formData.examType || !formData.classId || !formData.academicYearId) {
      return {
        success: false,
        error: 'Required fields are missing',
        message: 'Please fill in all required fields'
      };
    }

    // Validate dates
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    
    if (startDate >= endDate) {
      return {
        success: false,
        error: 'Invalid date range',
        message: 'End date must be after start date'
      };
    }

    // Validate class ownership
    const classObj = await prisma.class.findFirst({
      where: { 
        id: formData.classId, 
        aamarId: session.aamarId 
      },
      include: { 
        branch: {
          include: {
            school: true
          }
        }
      }
    });

    if (!classObj) {
      return {
        success: false,
        error: 'Invalid class',
        message: 'The specified class does not exist or does not belong to your school'
      };
    }

    // Validate academic year ownership
    const academicYear = await prisma.academicYear.findFirst({
      where: { 
        id: formData.academicYearId, 
        aamarId: session.aamarId 
      }
    });

    if (!academicYear) {
      return {
        success: false,
        error: 'Invalid academic year',
        message: 'The specified academic year does not exist or does not belong to your school'
      };
    }

    // Create exam with subjects
    const exam = await prisma.exam.create({
      data: {
        aamarId: session.aamarId,
        name: formData.name,
        examType: formData.examType,
        description: formData.description,
        startDate,
        endDate,
        classId: formData.classId,
        academicYearId: formData.academicYearId,
        schoolId: classObj.branch.school.id,
        subjects: {
          create: formData.subjects.map(subject => ({
            aamarId: session.aamarId,
            subjectId: subject.subjectId,
            fullMarks: subject.fullMarks,
            passMarks: subject.passMarks,
            examDate: new Date(subject.examDate),
            duration: subject.duration,
          }))
        }
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
          }
        },
        academicYear: {
          select: {
            id: true,
            displayName: true,
          }
        },
        subjects: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
              }
            }
          }
        },
        results: {
          select: {
            id: true,
            studentId: true,
            subjectId: true,
            obtainedMarks: true,
            fullMarks: true,
            grade: true,
            gpa: true,
          }
        },
        _count: {
          select: {
            subjects: true,
            results: true,
          }
        }
      }
    });

    revalidatePath('/dashboard/exams');
    return {
      success: true,
      data: exam as ExamData,
      message: 'Exam created successfully'
    };
  } catch (error) {
    console.error('Error creating exam:', error);
    return {
      success: false,
      error: 'Failed to create exam',
      message: 'An error occurred while creating the exam'
    };
  }
}

// Get all exams
export async function getExams(): Promise<ExamResult> {
  try {
    const session = await requireAuth();
    
    const exams = await prisma.exam.findMany({
      where: {
        aamarId: session.aamarId,
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
          }
        },
        academicYear: {
          select: {
            id: true,
            displayName: true,
          }
        },
        subjects: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
              }
            }
          }
        },
        results: {
          select: {
            id: true,
            studentId: true,
            subjectId: true,
            obtainedMarks: true,
            fullMarks: true,
            grade: true,
            gpa: true,
          }
        },
        _count: {
          select: {
            subjects: true,
            results: true,
          }
        }
      },
      orderBy: [
        { startDate: 'desc' },
        { name: 'asc' }
      ]
    });

    return {
      success: true,
      data: exams as ExamData[],
      message: 'Exams retrieved successfully'
    };
  } catch (error) {
    console.error('Error fetching exams:', error);
    return {
      success: false,
      error: 'Failed to fetch exams',
      message: 'An error occurred while fetching the exams'
    };
  }
}

// Get exam by ID
export async function getExamById(id: string): Promise<ExamResult> {
  try {
    const session = await requireAuth();
    
    const exam = await prisma.exam.findFirst({
      where: {
        id,
        aamarId: session.aamarId,
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
          }
        },
        academicYear: {
          select: {
            id: true,
            displayName: true,
          }
        },
        subjects: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
              }
            }
          }
        },
        results: {
          include: {
            student: {
              select: {
                id: true,
                rollNumber: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  }
                }
              }
            },
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
              }
            }
          }
        },
        _count: {
          select: {
            subjects: true,
            results: true,
          }
        }
      }
    });

    if (!exam) {
      return {
        success: false,
        error: 'Exam not found',
        message: 'The requested exam was not found'
      };
    }

    return {
      success: true,
      data: exam as ExamData,
      message: 'Exam retrieved successfully'
    };
  } catch (error) {
    console.error('Error fetching exam:', error);
    return {
      success: false,
      error: 'Failed to fetch exam',
      message: 'An error occurred while fetching the exam'
    };
  }
}

// Update exam
export async function updateExam(id: string, formData: Partial<ExamFormData>): Promise<ExamResult> {
  try {
    const session = await requireAuth();
    
    // Check if exam exists and belongs to user
    const existingExam = await prisma.exam.findFirst({
      where: {
        id,
        aamarId: session.aamarId,
      }
    });

    if (!existingExam) {
      return {
        success: false,
        error: 'Exam not found',
        message: 'The requested exam was not found'
      };
    }

    // Validate dates if provided
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      if (startDate >= endDate) {
        return {
          success: false,
          error: 'Invalid date range',
          message: 'End date must be after start date'
        };
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (formData.name) updateData.name = formData.name;
    if (formData.examType) updateData.examType = formData.examType;
    if (formData.description !== undefined) updateData.description = formData.description;
    if (formData.startDate) updateData.startDate = new Date(formData.startDate);
    if (formData.endDate) updateData.endDate = new Date(formData.endDate);
    if (formData.classId) updateData.classId = formData.classId;
    if (formData.academicYearId) updateData.academicYearId = formData.academicYearId;

    // Update exam
    const updatedExam = await prisma.exam.update({
      where: {
        id,
      },
      data: updateData,
      include: {
        class: {
          select: {
            id: true,
            name: true,
          }
        },
        academicYear: {
          select: {
            id: true,
            displayName: true,
          }
        },
        subjects: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
              }
            }
          }
        },
        results: {
          select: {
            id: true,
            studentId: true,
            subjectId: true,
            obtainedMarks: true,
            fullMarks: true,
            grade: true,
            gpa: true,
          }
        },
        _count: {
          select: {
            subjects: true,
            results: true,
          }
        }
      }
    });

    revalidatePath('/dashboard/exams');
    return {
      success: true,
      data: updatedExam as ExamData,
      message: 'Exam updated successfully'
    };
  } catch (error) {
    console.error('Error updating exam:', error);
    return {
      success: false,
      error: 'Failed to update exam',
      message: 'An error occurred while updating the exam'
    };
  }
}

// Delete exam
export async function deleteExam(id: string): Promise<ExamResult> {
  try {
    const session = await requireAuth();
    
    // Check if exam exists and belongs to user
    const existingExam = await prisma.exam.findFirst({
      where: {
        id,
        aamarId: session.aamarId,
      }
    });

    if (!existingExam) {
      return {
        success: false,
        error: 'Exam not found',
        message: 'The requested exam was not found'
      };
    }

    // Delete related records first to avoid foreign key constraint violations
    await prisma.$transaction(async (tx) => {
      // Delete exam results first
      await tx.examResult.deleteMany({
        where: {
          examId: id,
        }
      });

      // Delete exam subjects
      await tx.examSubject.deleteMany({
        where: {
          examId: id,
        }
      });

      // Finally delete the exam
      await tx.exam.delete({
        where: {
          id,
        }
      });
    });

    revalidatePath('/dashboard/exams');
    return {
      success: true,
      message: 'Exam deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting exam:', error);
    return {
      success: false,
      error: 'Failed to delete exam',
      message: 'An error occurred while deleting the exam'
    };
  }
}

// Get exams by academic year
export async function getExamsByAcademicYear(academicYearId: string): Promise<ExamResult> {
  try {
    const session = await requireAuth();
    
    const exams = await prisma.exam.findMany({
      where: {
        academicYearId,
        aamarId: session.aamarId,
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
          }
        },
        academicYear: {
          select: {
            id: true,
            displayName: true,
          }
        },
        subjects: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
              }
            }
          }
        },
        results: {
          select: {
            id: true,
            studentId: true,
            subjectId: true,
            obtainedMarks: true,
            fullMarks: true,
            grade: true,
            gpa: true,
          }
        },
        _count: {
          select: {
            subjects: true,
            results: true,
          }
        }
      },
      orderBy: [
        { startDate: 'desc' },
        { name: 'asc' }
      ]
    });

    return {
      success: true,
      data: exams as ExamData[],
      message: 'Exams retrieved successfully'
    };
  } catch (error) {
    console.error('Error fetching exams by academic year:', error);
    return {
      success: false,
      error: 'Failed to fetch exams',
      message: 'An error occurred while fetching the exams'
    };
  }
}

// Get exams by class
export async function getExamsByClass(classId: string): Promise<ExamResult> {
  try {
    const session = await requireAuth();
    
    const exams = await prisma.exam.findMany({
      where: {
        classId,
        aamarId: session.aamarId,
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
          }
        },
        academicYear: {
          select: {
            id: true,
            displayName: true,
          }
        },
        subjects: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
              }
            }
          }
        },
        results: {
          select: {
            id: true,
            studentId: true,
            subjectId: true,
            obtainedMarks: true,
            fullMarks: true,
            grade: true,
            gpa: true,
          }
        },
        _count: {
          select: {
            subjects: true,
            results: true,
          }
        }
      },
      orderBy: [
        { startDate: 'desc' },
        { name: 'asc' }
      ]
    });

    return {
      success: true,
      data: exams as ExamData[],
      message: 'Exams retrieved successfully'
    };
  } catch (error) {
    console.error('Error fetching exams by class:', error);
    return {
      success: false,
      error: 'Failed to fetch exams',
      message: 'An error occurred while fetching the exams'
    };
  }
} 