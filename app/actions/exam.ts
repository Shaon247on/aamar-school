"use server";

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/session';
import { revalidatePath } from 'next/cache';

// Function to calculate exam status based on dates
function calculateExamStatus(startDate: Date, endDate: Date): 'SCHEDULED' | 'ONGOING' | 'COMPLETED' {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (now < start) {
    return 'SCHEDULED';
  } else if (now >= start && now <= end) {
    return 'ONGOING';
  } else {
    return 'COMPLETED';
  }
}

export interface ExamSubjectData {
  subjectId: string;
  examDate: string;
  startTime: string;
  endTime: string;
}

export interface ExamFormData {
  term: string;
  classId: string;
  academicYearId: string;
  subjects: ExamSubjectData[];
}

export interface ExamData {
  id: string;
  term: string;
  startDate: Date;
  endDate: Date;
  status: 'SCHEDULED' | 'ONGOING' | 'COMPLETED';
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
    examDate: Date;
    startTime: string;
    endTime: string;
    subject: {
      id: string;
      name: string;
      code: string;
    };
  }[];
  results: {
    id: string;
    studentId: string;
    subjectName: string;
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
    if (!formData.term || !formData.classId || !formData.academicYearId || !formData.subjects.length) {
      return {
        success: false,
        error: 'Required fields are missing',
        message: 'Please fill in all required fields and add at least one subject'
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

    // Calculate start and end dates from exam subjects
    const examDates = formData.subjects.map(s => new Date(s.examDate));
    const startDate = new Date(Math.min(...examDates.map(d => d.getTime())));
    const endDate = new Date(Math.max(...examDates.map(d => d.getTime())));

    // Create exam with subjects
    const exam = await prisma.exam.create({
      data: {
        aamarId: session.aamarId,
        term: formData.term,
        startDate,
        endDate,
        classId: formData.classId,
        academicYearId: formData.academicYearId,
        schoolId: classObj.branch.school.id,
        subjects: {
          create: formData.subjects.map(subject => ({
            aamarId: session.aamarId,
            subjectId: subject.subjectId,
            examDate: new Date(subject.examDate),
            startTime: subject.startTime,
            endTime: subject.endTime,
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
            subjectName: true,
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
      data: {
        ...exam,
        status: calculateExamStatus(exam.startDate, exam.endDate)
      } as ExamData,
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
            subjectName: true,
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
        { term: 'asc' }
      ]
    });

    return {
      success: true,
      data: exams.map(exam => ({
        ...exam,
        status: calculateExamStatus(exam.startDate, exam.endDate)
      })) as ExamData[],
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
      data: {
        ...exam,
        status: calculateExamStatus(exam.startDate, exam.endDate)
      } as ExamData,
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

    // Prepare update data
    const updateData: any = {};
    if (formData.term) updateData.term = formData.term;
    if (formData.classId) updateData.classId = formData.classId;
    if (formData.academicYearId) updateData.academicYearId = formData.academicYearId;

    // If subjects are provided, recalculate start and end dates
    if (formData.subjects && formData.subjects.length > 0) {
      const examDates = formData.subjects.map(s => new Date(s.examDate));
      const startDate = new Date(Math.min(...examDates.map(d => d.getTime())));
      const endDate = new Date(Math.max(...examDates.map(d => d.getTime())));
      updateData.startDate = startDate;
      updateData.endDate = endDate;
    }

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
            subjectName: true,
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
      data: {
        ...updatedExam,
        status: calculateExamStatus(updatedExam.startDate, updatedExam.endDate)
      } as ExamData,
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

    // Delete all related ExamSubject and ExamResult records first, then the exam
    await prisma.$transaction([
      prisma.examSubject.deleteMany({ where: { examId: id } }),
      prisma.examResult.deleteMany({ where: { examId: id } }),
      prisma.exam.delete({ where: { id } }),
    ]);

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
            subjectName: true,
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
        { term: 'asc' }
      ]
    });

    return {
      success: true,
      data: exams.map(exam => ({
        ...exam,
        status: calculateExamStatus(exam.startDate, exam.endDate)
      })) as ExamData[],
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
            subjectName: true,
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
        { term: 'asc' }
      ]
    });

    return {
      success: true,
      data: exams.map(exam => ({
        ...exam,
        status: calculateExamStatus(exam.startDate, exam.endDate)
      })) as ExamData[],
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

// Get terms from academic year
export async function getTermsFromAcademicYear(academicYearId: string): Promise<{ success: boolean; data?: string[]; error?: string }> {
  try {
    const session = await requireAuth();
    
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        id: academicYearId,
        aamarId: session.aamarId,
      },
      select: {
        terms: true,
      }
    });

    if (!academicYear) {
      return {
        success: false,
        error: 'Academic year not found'
      };
    }

    // Handle both old object format and new array format
    let terms: string[] = [];
    if (Array.isArray(academicYear.terms)) {
      // New format: array of objects
      terms = academicYear.terms.map((term: any) => term.name);
    } else if (academicYear.terms && typeof academicYear.terms === 'object') {
      // Old format: object with keys
      terms = Object.keys(academicYear.terms as Record<string, any>);
    }

    return {
      success: true,
      data: terms
    };
  } catch (error) {
    console.error('Error fetching terms:', error);
    return {
      success: false,
      error: 'Failed to fetch terms'
    };
  }
}

// Get subjects by class
export async function getSubjectsByClass(classId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const session = await requireAuth();
    
    const subjects = await prisma.subject.findMany({
      where: {
        classId,
        aamarId: session.aamarId,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: {
        name: 'asc'
      }
    });

    return {
      success: true,
      data: subjects
    };
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return {
      success: false,
      error: 'Failed to fetch subjects'
    };
  }
} 