"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

// Fetch all branches for the current school
export async function getBranches() {
  try {
    const session = await requireAuth();
    
    const branches = await prisma.branch.findMany({
      where: { aamarId: session.aamarId },
      include: {
        school: true,
        classes: {
          include: {
            students: true,
            teacher: true,
          }
        },
        users: {
          include: {
            profile: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate statistics for each branch
    const branchesWithStats = branches.map(branch => {
      const totalStudents = branch.classes.reduce((acc, cls) => acc + cls.students.length, 0);
      const totalTeachers = branch.users.filter(user => user.role === 'TEACHER').length;
      const totalClasses = branch.classes.length;
      
      return {
        ...branch,
        totalStudents,
        totalTeachers,
        totalClasses,
      };
    });

    return { success: true, data: branchesWithStats };
  } catch (error) {
    console.error('Error fetching branches:', error);
    return { success: false, message: "Error fetching branches" };
  }
}

// Fetch a single branch by ID
export async function getBranchById(id: string) {
  try {
    const session = await requireAuth();
    
    const branch = await prisma.branch.findFirst({
      where: { 
        id,
        aamarId: session.aamarId 
      },
      include: {
        school: true,
        classes: {
          include: {
            students: true,
            teacher: true,
            subjects: true,
          }
        },
        users: {
          include: {
            profile: true,
          }
        }
      }
    });

    if (!branch) {
      return { success: false, message: "Branch not found" };
    }

    // Calculate statistics
    const totalStudents = branch.classes.reduce((acc, cls) => acc + cls.students.length, 0);
    const totalTeachers = branch.users.filter(user => user.role === 'TEACHER').length;
    const totalClasses = branch.classes.length;

    return { 
      success: true, 
      data: {
        ...branch,
        totalStudents,
        totalTeachers,
        totalClasses,
      }
    };
  } catch (error) {
    console.error('Error fetching branch:', error);
    return { success: false, message: "Error fetching branch" };
  }
}

// Create a new branch
export async function createBranch(data: {
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
}) {
  try {
    const session = await requireAuth();
    
    // Validate required fields
    if (!data.name || !data.code || !data.address || !data.phone || !data.email) {
      return { success: false, message: "All fields are required" };
    }

    // Check if branch code already exists for this school
    const existingBranch = await prisma.branch.findFirst({
      where: {
        code: data.code,
        aamarId: session.aamarId,
      }
    });

    if (existingBranch) {
      return { success: false, message: "Branch code already exists" };
    }

    // Create the branch
    const branch = await prisma.branch.create({
      data: {
        name: data.name,
        code: data.code,
        address: data.address,
        phone: data.phone,
        email: data.email,
        aamarId: session.aamarId,
        schoolId: session.schoolId,
      },
      include: {
        school: true,
      }
    });

    return { success: true, data: branch, message: "Branch created successfully" };
  } catch (error) {
    console.error('Error creating branch:', error);
    return { success: false, message: "Error creating branch" };
  }
}

// Update an existing branch
export async function updateBranch(id: string, data: {
  name?: string;
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}) {
  try {
    const session = await requireAuth();
    
    // Check if branch exists and belongs to the current school
    const existingBranch = await prisma.branch.findFirst({
      where: {
        id,
        aamarId: session.aamarId,
      }
    });

    if (!existingBranch) {
      return { success: false, message: "Branch not found" };
    }

    // If code is being updated, check for uniqueness
    if (data.code && data.code !== existingBranch.code) {
      const codeExists = await prisma.branch.findFirst({
        where: {
          code: data.code,
          aamarId: session.aamarId,
          id: { not: id }
        }
      });

      if (codeExists) {
        return { success: false, message: "Branch code already exists" };
      }
    }

    // Update the branch
    const updatedBranch = await prisma.branch.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        school: true,
      }
    });

    return { success: true, data: updatedBranch, message: "Branch updated successfully" };
  } catch (error) {
    console.error('Error updating branch:', error);
    return { success: false, message: "Error updating branch" };
  }
}

// Delete a branch
export async function deleteBranch(id: string) {
  try {
    const session = await requireAuth();
    
    // Check if branch exists and belongs to the current school
    const existingBranch = await prisma.branch.findFirst({
      where: {
        id,
        aamarId: session.aamarId,
      },
      include: {
        classes: true,
        users: true,
      }
    });

    if (!existingBranch) {
      return { success: false, message: "Branch not found" };
    }

    // Check if branch has associated data
    if (existingBranch.classes.length > 0) {
      return { success: false, message: "Cannot delete branch with existing classes" };
    }

    if (existingBranch.users.length > 0) {
      return { success: false, message: "Cannot delete branch with existing users" };
    }

    // Delete the branch
    await prisma.branch.delete({
      where: { id }
    });

    return { success: true, message: "Branch deleted successfully" };
  } catch (error) {
    console.error('Error deleting branch:', error);
    return { success: false, message: "Error deleting branch" };
  }
}

// Get branch statistics
export async function getBranchStats() {
  try {
    const session = await requireAuth();
    
    const branches = await prisma.branch.findMany({
      where: { aamarId: session.aamarId },
      include: {
        classes: {
          include: {
            students: true,
          }
        },
        users: true,
      }
    });

    const totalBranches = branches.length;
    const activeBranches = branches.filter(b => b.isActive).length;
    const totalStudents = branches.reduce((acc, branch) => 
      acc + branch.classes.reduce((clsAcc, cls) => clsAcc + cls.students.length, 0), 0
    );
    const totalTeachers = branches.reduce((acc, branch) => 
      acc + branch.users.filter(user => user.role === 'TEACHER').length, 0
    );

    return {
      success: true,
      data: {
        totalBranches,
        activeBranches,
        totalStudents,
        totalTeachers,
      }
    };
  } catch (error) {
    console.error('Error fetching branch stats:', error);
    return { success: false, message: "Error fetching branch statistics" };
  }
}

// Fetch a single branch by aamarId (legacy function)
export async function getBranchByAamarId(id: string, aamarId: string) {
  try {
    const branch = await prisma.branch.findUnique({
      where: { id, aamarId },
    });
    if (!branch) {
      return { success: false, message: "Branch not found" };
    }
    return { success: true, data: branch };
  } catch (error) {
    return { success: false, message: "Error fetching branch" };
  }
}

// Fetch multiple branches by aamarId (legacy function)
export async function getBranchesByAamarId() {
  try {
    const session = await requireAuth();
    
    const branches = await prisma.branch.findMany({
      where: { aamarId: session.aamarId },
    });
    return { success: true, data: branches };
  } catch (error) {
    return { success: false, message: "Error fetching branches" };
  }
} 