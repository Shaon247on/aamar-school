"use server";

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/session';

// Create a new school
export async function createSchool(data: any) {
  try {
    const session = await requireAuth();
    const school = await prisma.school.create({
      data: {
        ...data,
        aamarId: session.aamarId,
      },
    });
    return { success: true, data: school, message: 'School created successfully' };
  } catch (error) {
    console.error('Error creating school:', error);
    return { success: false, error: 'Failed to create school', message: 'An error occurred while creating the school' };
  }
}

// Get a single school by ID
export async function getSchool(id: string) {
  try {
    const session = await requireAuth();
    const school = await prisma.school.findFirst({
      where: { id, aamarId: session.aamarId },
    });
    if (!school) return { success: false, error: 'School not found', message: 'School not found' };
    return { success: true, data: school };
  } catch (error) {
    console.error('Error fetching school:', error);
    return { success: false, error: 'Failed to fetch school', message: 'An error occurred while fetching the school' };
  }
}

// Get all schools for the current aamarId
export async function getSchools() {
  try {
    const session = await requireAuth();
    const schools = await prisma.school.findMany({
      where: { aamarId: session.aamarId },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: schools };
  } catch (error) {
    console.error('Error fetching schools:', error);
    return { success: false, error: 'Failed to fetch schools', message: 'An error occurred while fetching schools' };
  }
}

// Update a school
export async function updateSchool(id: string, data: any) {
  try {
    const session = await requireAuth();
    const school = await prisma.school.update({
      where: { id, aamarId: session.aamarId },
      data,
    });
    return { success: true, data: school, message: 'School updated successfully' };
  } catch (error) {
    console.error('Error updating school:', error);
    return { success: false, error: 'Failed to update school', message: 'An error occurred while updating the school' };
  }
}

// Delete a school
export async function deleteSchool(id: string) {
  try {
    const session = await requireAuth();
    await prisma.school.delete({
      where: { id, aamarId: session.aamarId },
    });
    return { success: true, message: 'School deleted successfully' };
  } catch (error) {
    console.error('Error deleting school:', error);
    return { success: false, error: 'Failed to delete school', message: 'An error occurred while deleting the school' };
  }
} 