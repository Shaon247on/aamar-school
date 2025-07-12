'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/session';

interface AcademicYearFormData {
  startingYear: number;
  displayName: string;
  status: boolean;
  terms: any; // JSON object for terms
}

interface AcademicYearData {
  id: string;
  startingYear: number;
  displayName: string;
  status: boolean;
  terms: any;
  userId: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface AcademicYearResult {
  success: boolean;
  message: string;
  data?: AcademicYearData | AcademicYearData[] | unknown;
  error?: string;
}

// Create a new academic year
export async function createAcademicYear(formData: AcademicYearFormData): Promise<AcademicYearResult> {
  try {
    const session = await requireAuth();
    
    // Validate required fields
    if (!formData.startingYear || !formData.displayName) {
      return {
        success: false,
        error: 'Starting year and display name are required',
        message: 'Please fill in all required fields'
      };
    }

    // Check if academic year with same starting year already exists
    const existingYear = await prisma.academicYear.findFirst({
      where: {
        startingYear: formData.startingYear,
        userId: session.userId,
      },
    });

    if (existingYear) {
      return {
        success: false,
        error: 'Academic year already exists',
        message: `Academic year ${formData.displayName} already exists`,
      };
    }

    // Check if this year matches current year
    const currentYear = new Date().getFullYear();
    const isCurrentYear = formData.startingYear === currentYear;
    
    // If this is the current year, set all others to false
    if (isCurrentYear) {
      await prisma.academicYear.updateMany({
        where: {
          aamarId: session.aamarId,
        },
        data: {
          status: false,
        },
      });
    }

    const newAcademicYear = await prisma.academicYear.create({
      data: {
        aamarId: session.aamarId,
        startingYear: formData.startingYear,
        displayName: formData.displayName,
        status: isCurrentYear, // Set status based on year
        terms: formData.terms || {},
        userId: session.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    revalidatePath('/dashboard/academic-year');
    return {
      success: true,
      data: newAcademicYear,
      message: 'Academic year created successfully',
    };
  } catch (error) {
    console.error('Error creating academic year:', error);
    return {
      success: false,
      error: 'Failed to create academic year',
      message: 'An error occurred while creating the academic year',
    };
  }
}

// Get all academic years
export async function getAcademicYears(): Promise<AcademicYearResult> {
  try {
    const session = await requireAuth();
    
    const academicYears = await prisma.academicYear.findMany({
      where: {
        aamarId: session.aamarId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        startingYear: 'desc',
      },
    });

    return {
      success: true,
      data: academicYears,
      message: 'Academic years retrieved successfully',
    };
  } catch (error) {
    console.error('Error fetching academic years:', error);
    return {
      success: false,
      error: 'Failed to fetch academic years',
      message: 'An error occurred while fetching academic years',
    };
  }
}

// Get academic year by ID
export async function getAcademicYearById(id: string): Promise<AcademicYearResult> {
  try {
    const session = await requireAuth();
    
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        id: id,
        aamarId: session.aamarId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!academicYear) {
      return {
        success: false,
        error: 'Academic year not found',
        message: 'The requested academic year was not found',
      };
    }

    return {
      success: true,
      data: academicYear,
      message: 'Academic year retrieved successfully',
    };
  } catch (error) {
    console.error('Error fetching academic year:', error);
    return {
      success: false,
      error: 'Failed to fetch academic year',
      message: 'An error occurred while fetching the academic year',
    };
  }
}

// Update academic year
export async function updateAcademicYear(id: string, formData: Partial<AcademicYearFormData>): Promise<AcademicYearResult> {
  try {
    const session = await requireAuth();
    
    // Check if academic year exists and belongs to user
    const existingYear = await prisma.academicYear.findFirst({
      where: {
        id: id,
        aamarId: session.aamarId,
      },
    });

    if (!existingYear) {
      return {
        success: false,
        error: 'Academic year not found',
        message: 'The requested academic year was not found',
      };
    }

    // If updating starting year, check for duplicates
    if (formData.startingYear && formData.startingYear !== existingYear.startingYear) {
      const duplicateYear = await prisma.academicYear.findFirst({
        where: {
          startingYear: formData.startingYear,
          aamarId: session.aamarId,
          id: { not: id },
        },
      });

      if (duplicateYear) {
        return {
          success: false,
          error: 'Academic year already exists',
          message: `Academic year with starting year ${formData.startingYear} already exists`,
        };
      }
    }

    // Check if this year matches current year
    const currentYear = new Date().getFullYear();
    const isCurrentYear = formData.startingYear === currentYear;
    
    // If this is the current year, set all others to false
    if (isCurrentYear) {
      await prisma.academicYear.updateMany({
        where: {
          aamarId: session.aamarId,
          id: { not: id },
        },
        data: {
          status: false,
        },
      });
    }

    const updatedYear = await prisma.academicYear.update({
      where: {
        id: id,
      },
      data: {
        startingYear: formData.startingYear,
        displayName: formData.displayName,
        status: isCurrentYear, // Set status based on year
        terms: formData.terms,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    revalidatePath('/dashboard/academic-year');
    return {
      success: true,
      data: updatedYear,
      message: 'Academic year updated successfully',
    };
  } catch (error) {
    console.error('Error updating academic year:', error);
    return {
      success: false,
      error: 'Failed to update academic year',
      message: 'An error occurred while updating the academic year',
    };
  }
}

// Delete academic year
export async function deleteAcademicYear(id: string): Promise<AcademicYearResult> {
  try {
    const session = await requireAuth();
    
    // Check if academic year exists and belongs to user
    const existingYear = await prisma.academicYear.findFirst({
      where: {
        id: id,
        aamarId: session.aamarId,
      },
    });

    if (!existingYear) {
      return {
        success: false,
        error: 'Academic year not found',
        message: 'The requested academic year was not found',
      };
    }

    // Check if this is the only academic year
    const totalYears = await prisma.academicYear.count({
      where: {
        aamarId: session.aamarId,
      },
    });

    if (totalYears === 1) {
      return {
        success: false,
        error: 'Cannot delete last academic year',
        message: 'At least one academic year must remain in the system',
      };
    }

    // Check if academic year is being used by classes
    const classesUsingYear = await prisma.class.count({
      where: {
        academicYear: existingYear.displayName,
        aamarId: session.aamarId,
      },
    });

    if (classesUsingYear > 0) {
      return {
        success: false,
        error: 'Academic year in use',
        message: `Cannot delete academic year as it is being used by ${classesUsingYear} class(es)`,
      };
    }

    await prisma.academicYear.delete({
      where: {
        id: id,
      },
    });

    revalidatePath('/dashboard/academic-year');
    return {
      success: true,
      message: 'Academic year deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting academic year:', error);
    return {
      success: false,
      error: 'Failed to delete academic year',
      message: 'An error occurred while deleting the academic year',
    };
  }
}

// Get active academic year
export async function getActiveAcademicYear(): Promise<AcademicYearResult> {
  try {
    const session = await requireAuth();
    
    const activeYear = await prisma.academicYear.findFirst({
      where: {
        aamarId: session.aamarId,
        status: true,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return {
      success: true,
      data: activeYear,
      message: activeYear ? 'Active academic year retrieved successfully' : 'No active academic year found',
    };
  } catch (error) {
    console.error('Error fetching active academic year:', error);
    return {
      success: false,
      error: 'Failed to fetch active academic year',
      message: 'An error occurred while fetching the active academic year',
    };
  }
}



// Get academic year statistics
export async function getAcademicYearStats(): Promise<AcademicYearResult> {
  try {
    const session = await requireAuth();
    
    const academicYears = await prisma.academicYear.findMany({
      where: {
        aamarId: session.aamarId,
      },
    });

    const stats = {
      totalYears: academicYears.length,
      activeYear: academicYears.find(year => year.status),
      yearsList: academicYears.map(year => ({
        id: year.id,
        displayName: year.displayName,
        startingYear: year.startingYear,
        status: year.status,
        createdAt: year.createdAt,
      })),
    };

    return {
      success: true,
      data: stats,
      message: 'Academic year statistics retrieved successfully',
    };
  } catch (error) {
    console.error('Error fetching academic year statistics:', error);
    return {
      success: false,
      error: 'Failed to fetch academic year statistics',
      message: 'An error occurred while fetching academic year statistics',
    };
  }
} 