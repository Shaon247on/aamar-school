'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { LessonType } from '@prisma/client';
import { requireAuth } from '@/lib/session';

export interface SubjectResult {
  success: boolean;
  message: string;
  data?: unknown;
}

// Create new subject
export async function createSubject(formData: FormData): Promise<SubjectResult> {
  const session = await requireAuth();
  const aamarId = session.aamarId;
  try {
    const data = {
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      description: formData.get('description') as string,
      schoolId: formData.get('schoolId') as string,
      classId: formData.get('classId') as string,
      aamarId: aamarId,
    };

    // Validate required fields
    if (!data.name || !data.code || !data.schoolId || !data.classId) {
      return {
        success: false,
        message: 'Required fields are missing'
      };
    }

    // Check if subject code already exists in the class
    const existingSubject = await prisma.subject.findFirst({
      where: { 
        code: data.code,
        classId: data.classId
      }
    });

    if (existingSubject) {
      return {
        success: false,
        message: 'Subject code already exists in this class'
      };
    }

    // Create subject
    const subject = await prisma.subject.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        schoolId: data.schoolId,
        classId: data.classId,
        aamarId: aamarId,
      }
    });

    revalidatePath('/dashboard/subjects');

    return {
      success: true,
      message: `Subject ${data.name} created successfully!`,
      data: {
        subjectId: subject.id,
      },
    };

  } catch (error) {
    console.error('Create subject error:', error);
    return {
      success: false,
      message: 'Failed to create subject. Please try again.',
    };
  }
}

// Get all subjects by aamarId
export async function getSubjects() {
  const session = await requireAuth();

  try {
    const subjects = await prisma.subject.findMany({
      where: {
        school: {
          aamarId: session.aamarId
        }
      },
      include: {
        school: true,
        class: {
          include: {
            branch: true,
            sections: {
              include: {
                _count: {
                  select: {
                    students: true
                  }
                }
              }
            }
          }
        },
        chapters: {
          include: {
            lessons: true,
            _count: {
              select: {
                lessons: true
              }
            }
          },
          orderBy: {
            orderIndex: 'asc'
          }
        },
        timetables: true,
        _count: {
          select: {
            timetables: true,
            chapters: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    const formattedSubjects = subjects.map(subject => {
      // Calculate total students from class sections
      const totalStudents = subject.class.sections.reduce((total, section) => 
        total + section._count.students, 0);

      return {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        description: subject.description || '',
        school: {
          id: subject.school.id,
          name: subject.school.name,
        },
        class: {
          id: subject.class.id,
          name: subject.class.name,
          displayName: subject.class.name,
          studentCount: totalStudents,
          branch: subject.class.branch.name,
        },
        sections: subject.class.sections.map(section => ({
          id: section.id,
          name: section.name,
          displayName: section.displayName,
          capacity: section.capacity,
          studentCount: section._count.students,
        })),
        chapters: subject.chapters.map(chapter => ({
          id: chapter.id,
          name: chapter.name,
          description: chapter.description,
          orderIndex: chapter.orderIndex,
          lessonsCount: chapter._count.lessons,
          lessons: chapter.lessons.map(lesson => ({
            id: lesson.id,
            name: lesson.name,
            description: lesson.description,
            orderIndex: lesson.orderIndex,
            duration: lesson.duration,
            lessonType: lesson.lessonType,
            type: lesson.lessonType,
            status: 'Active'
          }))
        })),
        totalSections: subject.class.sections.length,
        totalChapters: subject._count.chapters,
        totalTimetables: subject._count.timetables,
        totalStudents: totalStudents,
        status: 'Active',
      };
    });

    return {
      success: true,
      data: formattedSubjects
    };

  } catch (error) {
    console.error('Error fetching subjects:', error);
    return {
      success: false,
      error: 'Failed to fetch subjects'
    };
  }
}

// Get subjects by class ID
export async function getSubjectsForClass(classId: string) {
  const session = await requireAuth();

  try {
    const subjects = await prisma.subject.findMany({
      where: {
        classId: classId,
        school: {
          aamarId: session.aamarId
        }
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
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
    console.error('Error fetching subjects for class:', error);
    return {
      success: false,
      error: 'Failed to fetch subjects for class'
    };
  }
}

// Get subject by ID
export async function getSubjectById(subjectId: string) {
  try {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        school: true,
        class: {
          include: {
            branch: true,
            teacher: {
              include: {
                user: true
              }
            }
          }
        },
        timetables: true
      }
    });

    if (!subject) {
      return {
        success: false,
        error: 'Subject not found'
      };
    }

    const subjectDetails = {
      id: subject.id,
      name: subject.name,
      code: subject.code,
      description: subject.description,
      
      // School information
      school: {
        name: subject.school.name,
        address: subject.school.address,
        phone: subject.school.phone,
        email: subject.school.email
      },

      // Class assigned to this subject
      class: {
        id: subject.class.id,
        name: subject.class.name,
        displayName: subject.class.name,
        academicYear: subject.class.academicYear,
        branch: subject.class.branch.name,
        teacher: subject.class.teacher ? {
          name: `${subject.class.teacher.user.firstName} ${subject.class.teacher.user.lastName}`,
          email: subject.class.teacher.user.email
        } : null
      },

      // Empty chapters array since chapters don't exist in current schema
      chapters: [],
      
      // Timetables
      timetables: subject.timetables.map(timetable => ({
        id: timetable.id,
        dayOfWeek: timetable.dayOfWeek,
        startTime: timetable.startTime,
        endTime: timetable.endTime,
      })),
    };

    return {
      success: true,
      data: subjectDetails
    };

  } catch (error) {
    console.error('Error fetching subject details:', error);
    return {
      success: false,
      error: 'Failed to fetch subject details'
    };
  }
}

// Update subject
export async function updateSubject(subjectId: string, formData: FormData): Promise<SubjectResult> {
  try {
    const data = {
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      description: formData.get('description') as string,
    };

    // Validate required fields
    if (!data.name || !data.code) {
      return {
        success: false,
        message: 'Required fields are missing'
      };
    }

    // Update subject
    await prisma.subject.update({
      where: { id: subjectId },
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
      }
    });

    revalidatePath('/dashboard/subjects');

    return {
      success: true,
      message: `Subject ${data.name} updated successfully!`,
    };

  } catch (error) {
    console.error('Update subject error:', error);
    return {
      success: false,
      message: 'Failed to update subject. Please try again.',
    };
  }
}

// Delete subject
export async function deleteSubject(subjectId: string): Promise<SubjectResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Get subject with relations
      const subject = await tx.subject.findUnique({
        where: { id: subjectId },
        include: {
          chapters: {
            include: {
              lessons: true
            }
          },
          timetables: true
        }
      });

      if (!subject) {
        throw new Error('Subject not found');
      }

      // Delete in proper order: lessons -> chapters -> timetables -> subject
      // Delete all lessons first
      for (const chapter of subject.chapters) {
        await tx.lesson.deleteMany({
          where: { chapterId: chapter.id }
        });
      }

      // Delete all chapters
      await tx.chapter.deleteMany({
        where: { subjectId }
      });

      // Delete timetables
      await tx.timetable.deleteMany({
        where: { subjectId }
      });

      // Finally delete subject
      await tx.subject.delete({
        where: { id: subjectId }
      });

      return { 
        subjectName: subject.name,
        chaptersDeleted: subject.chapters.length,
        lessonsDeleted: subject.chapters.reduce((total, chapter) => total + chapter.lessons.length, 0),
        timetablesDeleted: subject.timetables.length
      };
    });

    revalidatePath('/dashboard/subjects');

    return {
      success: true,
      message: `Subject ${result.subjectName} deleted successfully! (${result.chaptersDeleted} chapters, ${result.lessonsDeleted} lessons, ${result.timetablesDeleted} timetables)`,
    };

  } catch (error) {
    console.error('Delete subject error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete subject. Please try again.',
    };
  }
}

// Get subject statistics
export async function getSubjectStats() {
  const session = await requireAuth();
  const aamarId = session.aamarId;
  try {
    const totalSubjects = await prisma.subject.count({
      where: {
        school: {
          aamarId: aamarId
        }
      }
    });

    const totalChapters = await prisma.chapter.count({
      where: {
        subject: {
          school: {
            aamarId: aamarId
          }
        }
      }
    });

    const totalLessons = await prisma.lesson.count({
      where: {
        chapter: {
          subject: {
            school: {
              aamarId: aamarId
            }
          }
        }
      }
    });

    const newThisMonth = await prisma.subject.count({
      where: {
        school: {
          aamarId: aamarId
        },
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    });

    // Get class-wise distribution
    const classWiseCount = await prisma.subject.groupBy({
      by: ['classId'],
      where: {
        school: {
          aamarId: aamarId
        }
      },
      _count: {
        id: true
      }
    });

    // Get school-wise distribution
    const schoolWiseCount = await prisma.subject.groupBy({
      by: ['schoolId'],
      where: {
        school: {
          aamarId: aamarId
        }
      },
      _count: {
        id: true
      }
    });

    return {
      success: true,
      data: {
        totalSubjects,
        totalChapters,
        totalLessons,
        newThisMonth,
        classWiseCount,
        schoolWiseCount,
      }
    };

  } catch (error) {
    console.error('Error fetching subject stats:', error);
    return {
      success: false,
      error: 'Failed to fetch subject statistics'
    };
  }
}

// Search subjects
export async function searchSubjects(query: string) {
  const session = await requireAuth();
  const aamarId = session.aamarId
  try {
    const subjects = await prisma.subject.findMany({
      where: {
        school: {
          aamarId: aamarId
        },
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            code: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            description: {
              contains: query,
              mode: 'insensitive'
            }
          }
        ]
      },
      include: {
        school: true,
        class: {
          include: {
            branch: true
          }
        },
        chapters: {
          include: {
            _count: {
              select: {
                lessons: true
              }
            }
          }
        },
        _count: {
          select: {
            timetables: true,
            chapters: true
          }
        }
      },
      take: 20
    });

    const formattedSubjects = subjects.map(subject => ({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      description: subject.description || '',
      school: {
        id: subject.school.id,
        name: subject.school.name,
      },
      class: {
        id: subject.class.id,
        name: subject.class.name,
        displayName: subject.class.name,
        branch: subject.class.branch.name,
      },
      chapters: subject.chapters.map(chapter => ({
        id: chapter.id,
        name: chapter.name,
        description: chapter.description,
        orderIndex: chapter.orderIndex,
        lessonsCount: chapter._count.lessons,
      })),
      totalChapters: subject._count.chapters,
      totalTimetables: subject._count.timetables,
      status: 'Active',
    }));

    return {
      success: true,
      data: formattedSubjects
    };

  } catch (error) {
    console.error('Error searching subjects:', error);
    return {
      success: false,
      error: 'Failed to search subjects'
    };
  }
}

// ============= CHAPTER ACTIONS =============

// Create new chapter
export async function createChapter(formData: FormData): Promise<SubjectResult> {
  const session = await requireAuth();
  const aamarId = session.aamarId;
  try {
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      orderIndex: parseInt(formData.get('orderIndex') as string),
      subjectId: formData.get('subjectId') as string,
      aamarId: aamarId,
    };

    // Validate required fields
    if (!data.name || !data.subjectId || isNaN(data.orderIndex)) {
      return {
        success: false,
        message: 'Required fields are missing or invalid'
      };
    }

    // Create chapter
    const chapter = await prisma.chapter.create({
      data: {
        name: data.name,
        description: data.description,
        orderIndex: data.orderIndex,
        subjectId: data.subjectId,
        aamarId: aamarId,
      }
    });

    revalidatePath('/dashboard/subjects');

    return {
      success: true,
      message: `Chapter ${data.name} created successfully!`,
      data: {
        chapterId: chapter.id,
      },
    };

  } catch (error) {
    console.error('Create chapter error:', error);
    return {
      success: false,
      message: 'Failed to create chapter. Please try again.',
    };
  }
}

// Get chapters by subject
export async function getChaptersBySubject(subjectId: string) {
  try {
    const chapters = await prisma.chapter.findMany({
      where: {
        subjectId: subjectId,
      },
      include: {
        lessons: {
          orderBy: {
            orderIndex: 'asc'
          }
        },
        _count: {
          select: {
            lessons: true
          }
        }
      },
      orderBy: {
        orderIndex: 'asc'
      }
    });

    return {
      success: true,
      data: chapters
    };

  } catch (error) {
    console.error('Error fetching chapters:', error);
    return {
      success: false,
      error: 'Failed to fetch chapters'
    };
  }
}

// Update chapter
export async function updateChapter(chapterId: string, formData: FormData): Promise<SubjectResult> {
  try {
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      orderIndex: parseInt(formData.get('orderIndex') as string),
    };

    // Validate required fields
    if (!data.name || isNaN(data.orderIndex)) {
      return {
        success: false,
        message: 'Required fields are missing or invalid'
      };
    }

    // Update chapter
    await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        name: data.name,
        description: data.description,
        orderIndex: data.orderIndex,
      }
    });

    revalidatePath('/dashboard/subjects');

    return {
      success: true,
      message: `Chapter ${data.name} updated successfully!`,
    };

  } catch (error) {
    console.error('Update chapter error:', error);
    return {
      success: false,
      message: 'Failed to update chapter. Please try again.',
    };
  }
}

// Delete chapter
export async function deleteChapter(chapterId: string): Promise<SubjectResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Get chapter with lessons
      const chapter = await tx.chapter.findUnique({
        where: { id: chapterId },
        include: {
          lessons: true
        }
      });

      if (!chapter) {
        throw new Error('Chapter not found');
      }

      // Delete all lessons first
      await tx.lesson.deleteMany({
        where: { chapterId }
      });

      // Delete chapter
      await tx.chapter.delete({
        where: { id: chapterId }
      });

      return { 
        chapterName: chapter.name,
        lessonsDeleted: chapter.lessons.length
      };
    });

    revalidatePath('/dashboard/subjects');

    return {
      success: true,
      message: `Chapter ${result.chapterName} deleted successfully! (${result.lessonsDeleted} lessons)`,
    };

  } catch (error) {
    console.error('Delete chapter error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete chapter. Please try again.',
    };
  }
}

// ============= LESSON ACTIONS =============

// Create lesson
export async function createLesson(formData: FormData): Promise<SubjectResult> {
  const session = await requireAuth();
  const aamarId = session.aamarId;
  try {
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      orderIndex: parseInt(formData.get('orderIndex') as string),
      duration: formData.get('duration') as string,
      lessonType: formData.get('lessonType') as string,
      chapterId: formData.get('chapterId') as string,
    };

    // Validate required fields
    if (!data.name || !data.chapterId) {
      return {
        success: false,
        message: 'Required fields are missing'
      };
    }

    // Create lesson
    await prisma.lesson.create({
      data: {
        name: data.name,
        description: data.description,
        orderIndex: data.orderIndex,
        duration: data.duration,
        lessonType: data.lessonType as LessonType,
        chapterId: data.chapterId,
        aamarId: aamarId, // Default aamarId
      }
    });

    revalidatePath('/dashboard/subjects');

    return {
      success: true,
      message: 'Lesson created successfully!',
    };

  } catch (error) {
    console.error('Create lesson error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create lesson. Please try again.',
    };
  }
}

// Get lessons by chapter
export async function getLessonsByChapter(chapterId: string) {
  try {
    const lessons = await prisma.lesson.findMany({
      where: {
        chapterId: chapterId
      },
      orderBy: {
        orderIndex: 'asc'
      }
    });

    return {
      success: true,
      data: lessons
    };

  } catch (error) {
    console.error('Error fetching lessons:', error);
    return {
      success: false,
      error: 'Failed to fetch lessons'
    };
  }
}

// Update lesson
export async function updateLesson(lessonId: string, formData: FormData): Promise<SubjectResult> {
  try {
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      orderIndex: parseInt(formData.get('orderIndex') as string),
      duration: formData.get('duration') as string,
      lessonType: formData.get('lessonType') as string,
    };

    // Validate required fields
    if (!data.name) {
      return {
        success: false,
        message: 'Required fields are missing'
      };
    }

    // Update lesson
    await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        name: data.name,
        description: data.description,
        orderIndex: data.orderIndex,
        duration: data.duration,
        lessonType: data.lessonType as LessonType,
      }
    });

    revalidatePath('/dashboard/subjects');

    return {
      success: true,
      message: 'Lesson updated successfully!',
    };

  } catch (error) {
    console.error('Update lesson error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update lesson. Please try again.',
    };
  }
}

// Delete lesson
export async function deleteLesson(lessonId: string): Promise<SubjectResult> {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId }
    });

    if (!lesson) {
      return {
        success: false,
        message: 'Lesson not found'
      };
    }

    await prisma.lesson.delete({
      where: { id: lessonId }
    });

    revalidatePath('/dashboard/subjects');

    return {
      success: true,
      message: `Lesson ${lesson.name} deleted successfully!`,
    };

  } catch (error) {
    console.error('Delete lesson error:', error);
    return {
      success: false,
      message: 'Failed to delete lesson. Please try again.',
    };
  }
} 