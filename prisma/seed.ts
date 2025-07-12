const {
  PrismaClient,
  UserRole,
  Gender,
  AttendanceStatus,
  PaymentStatus,
  LessonType,
  AudienceType,
  AnnouncementType,
  ActionType,
  ExamType,
  FeeType,
  AccountType,
  TransactionType,
} = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// Consistent aamarId for all records in this organization
const ORGANIZATION_AAMAR_ID = "AAMAR001";

async function main() {
  console.log("🌱 Starting comprehensive seed...");

  // Clear existing data in correct order
  console.log("🧹 Cleaning up existing data...");
  await prisma.activityLog.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();
  await prisma.examResult.deleteMany();
  await prisma.examSubject.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.bookBorrowing.deleteMany();
  await prisma.book.deleteMany();
  await prisma.route.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.fee.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.timetable.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.student.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.routineSlot.deleteMany();
  await prisma.classRoutine.deleteMany();
  await prisma.section.deleteMany();
  await prisma.class.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.school.deleteMany();
  console.log("✅ Database cleaned up successfully!");

  // Create School
  const school = await prisma.school.create({
    data: {
      aamarId: ORGANIZATION_AAMAR_ID,
      name: "Greenwood International School",
      code: "GIS001",
      address: "123 Education Street, Dhaka, Bangladesh",
      phone: "+880-2-123456789",
      email: "info@greenwood.edu.bd",
      website: "https://greenwood.edu.bd",
      logo: "/logos/greenwood-logo.png",
    },
  });

  // Create Multiple Branches
  const branchData = [
    {
      name: "Main Campus",
      code: "MAIN",
      address: "123 Education Street, Dhaka, Bangladesh",
      phone: "+880-2-123456789",
      email: "main@greenwood.edu.bd",
    },
    {
      name: "North Campus",
      code: "NORTH",
      address: "456 Learning Avenue, Uttara, Dhaka, Bangladesh",
      phone: "+880-2-987654321",
      email: "north@greenwood.edu.bd",
    },
    {
      name: "South Campus",
      code: "SOUTH",
      address: "789 Knowledge Street, Dhanmondi, Dhaka, Bangladesh",
      phone: "+880-2-555123456",
      email: "south@greenwood.edu.bd",
    },
    {
      name: "East Campus",
      code: "EAST",
      address: "321 Wisdom Road, Gulshan, Dhaka, Bangladesh",
      phone: "+880-2-444987654",
      email: "east@greenwood.edu.bd",
    },
  ];

  const branches = [];
  for (const branchInfo of branchData) {
    const branch = await prisma.branch.create({
      data: {
        aamarId: ORGANIZATION_AAMAR_ID,
        name: branchInfo.name,
        code: branchInfo.code,
        address: branchInfo.address,
        phone: branchInfo.phone,
        email: branchInfo.email,
        schoolId: school.id,
      },
    });
    branches.push(branch);
  }

  // Create Admin User
  const adminUser = await prisma.user.create({
    data: {
      aamarId: ORGANIZATION_AAMAR_ID,
      email: "admin@greenwood.edu.bd",
      password: await bcrypt.hash("123456", 10),
      firstName: "System",
      lastName: "Administrator",
      role: UserRole.ADMIN,
      schoolId: school.id,
      branchId: branches[0].id, // Main Campus
      profile: {
        create: {
          aamarId: ORGANIZATION_AAMAR_ID,
          email: "admin@greenwood.edu.bd",
          phone: "+8801712345678",
          address: "Dhaka, Bangladesh",
          gender: Gender.MALE,
          nationality: "Bangladeshi",
          religion: "Islam",
        },
      },
    },
  });

  // Create Academic Years first
  const academicYears = [];
  const academicYearData = [
    { startingYear: 2024, displayName: "2024-2025" },
    { startingYear: 2023, displayName: "2023-2024" },
    { startingYear: 2022, displayName: "2022-2023" },
  ];

  for (const yearData of academicYearData) {
    const currentYear = new Date().getFullYear();
    const isCurrentYear = yearData.startingYear === currentYear;
    
    const academicYear = await prisma.academicYear.create({
      data: {
        aamarId: ORGANIZATION_AAMAR_ID,
        startingYear: yearData.startingYear,
        displayName: yearData.displayName,
        status: isCurrentYear,
        terms: {
          "Term 1": {
            name: "Term 1",
            startDate: `${yearData.startingYear}-01-01`,
            endDate: `${yearData.startingYear}-04-30`,
          },
          "Term 2": {
            name: "Term 2", 
            startDate: `${yearData.startingYear}-05-01`,
            endDate: `${yearData.startingYear}-08-31`,
          },
          "Term 3": {
            name: "Term 3",
            startDate: `${yearData.startingYear}-09-01`,
            endDate: `${yearData.startingYear}-12-31`,
          },
        },
        userId: adminUser.id,
      },
    });
    academicYears.push(academicYear);
  }

  // Get the current academic year
  const currentAcademicYear = academicYears.find(ay => ay.status === true) || academicYears[0];

  // Create Classes across different branches
  const classes = [];
  const classNames = [
    "Class 1",
    "Class 2",
    "Class 3",
    "Class 4",
    "Class 5",
    "Class 6",
    "Class 7",
    "Class 8",
    "Class 9",
    "Class 10",
  ];

  // Distribute classes across branches (2-3 classes per branch)
  for (let i = 0; i < classNames.length; i++) {
    const branchIndex = Math.floor(i / 3) % branches.length; // Distribute classes across branches
    const cls = await prisma.class.create({
      data: {
        aamarId: ORGANIZATION_AAMAR_ID,
        name: classNames[i],
        branchId: branches[branchIndex].id,
        academicYearId: currentAcademicYear.id,
      },
    });
    classes.push(cls);
  }

  // Create Sections for each class
  const sections = [];
  const sectionNames = ["A", "B", "C"];

  for (const cls of classes) {
    for (const sectionName of sectionNames) {
      const section = await prisma.section.create({
        data: {
          aamarId: ORGANIZATION_AAMAR_ID,
          name: sectionName,
          displayName: `${cls.name} Section ${sectionName}`,
          capacity: 40,
          classId: cls.id,
        },
      });
      sections.push(section);
    }
  }

  // Create Subjects
  const subjectData = [
    { name: "Mathematics", code: "MATH" },
    { name: "English", code: "ENG" },
    { name: "Science", code: "SCI" },
    { name: "Social Studies", code: "SS" },
    { name: "Bengali", code: "BEN" },
    { name: "Physical Education", code: "PE" },
    { name: "Art & Craft", code: "ART" },
  ];

  const subjects = [];
  for (const cls of classes) {
    for (const subjectInfo of subjectData) {
      const subject = await prisma.subject.create({
        data: {
          aamarId: ORGANIZATION_AAMAR_ID,
          name: subjectInfo.name,
          code: `${subjectInfo.code}-${cls.name.replace(" ", "")}`,
          description: `${subjectInfo.name} curriculum for ${cls.name}`,
          schoolId: school.id,
          classId: cls.id,
        },
      });
      subjects.push(subject);
    }
  }

  // Create Teachers distributed across branches
  const teacherData = [
    // Main Campus Teachers
    {
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah.johnson@greenwood.edu.bd",
      phone: "+8801712345679",
      qualification: "M.Ed Mathematics",
      experience: 8,
      subjects: ["Mathematics"],
      branchIndex: 0,
    },
    {
      firstName: "Michael",
      lastName: "Chen",
      email: "michael.chen@greenwood.edu.bd",
      phone: "+8801712345680",
      qualification: "M.A English Literature",
      experience: 6,
      subjects: ["English"],
      branchIndex: 0,
    },
    {
      firstName: "Emily",
      lastName: "Rodriguez",
      email: "emily.rodriguez@greenwood.edu.bd",
      phone: "+8801712345681",
      qualification: "M.Sc Physics",
      experience: 10,
      subjects: ["Science"],
      branchIndex: 0,
    },

    // North Campus Teachers
    {
      firstName: "David",
      lastName: "Thompson",
      email: "david.thompson@greenwood.edu.bd",
      phone: "+8801712345682",
      qualification: "M.A History",
      experience: 7,
      subjects: ["Social Studies"],
      branchIndex: 1,
    },
    {
      firstName: "Lisa",
      lastName: "Ahmed",
      email: "lisa.ahmed@greenwood.edu.bd",
      phone: "+8801712345683",
      qualification: "M.A Bengali Literature",
      experience: 9,
      subjects: ["Bengali"],
      branchIndex: 1,
    },
    {
      firstName: "Robert",
      lastName: "Wilson",
      email: "robert.wilson@greenwood.edu.bd",
      phone: "+8801712345684",
      qualification: "M.Sc Computer Science",
      experience: 5,
      subjects: ["Science"],
      branchIndex: 1,
    },

    // South Campus Teachers
    {
      firstName: "Maria",
      lastName: "Garcia",
      email: "maria.garcia@greenwood.edu.bd",
      phone: "+8801712345685",
      qualification: "M.A Art Education",
      experience: 8,
      subjects: ["Art & Craft"],
      branchIndex: 2,
    },
    {
      firstName: "Ahmed",
      lastName: "Rahman",
      email: "ahmed.rahman@greenwood.edu.bd",
      phone: "+8801712345686",
      qualification: "B.Ed Physical Education",
      experience: 6,
      subjects: ["Physical Education"],
      branchIndex: 2,
    },

    // East Campus Teachers
    {
      firstName: "Fatima",
      lastName: "Khan",
      email: "fatima.khan@greenwood.edu.bd",
      phone: "+8801712345687",
      qualification: "M.Ed Mathematics",
      experience: 7,
      subjects: ["Mathematics"],
      branchIndex: 3,
    },
    {
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@greenwood.edu.bd",
      phone: "+8801712345688",
      qualification: "M.A English",
      experience: 9,
      subjects: ["English"],
      branchIndex: 3,
    },
  ];

  const teachers = [];
  for (let i = 0; i < teacherData.length; i++) {
    const teacherInfo = teacherData[i];
    const user = await prisma.user.create({
      data: {
        aamarId: ORGANIZATION_AAMAR_ID,
        email: teacherInfo.email,
        password: await bcrypt.hash("teacher123", 10),
        firstName: teacherInfo.firstName,
        lastName: teacherInfo.lastName,
        role: UserRole.TEACHER,
        schoolId: school.id,
        branchId: branches[teacherInfo.branchIndex].id,
        profile: {
          create: {
            aamarId: ORGANIZATION_AAMAR_ID,
            email: teacherInfo.email,
            phone: teacherInfo.phone,
            gender: i % 2 === 0 ? Gender.FEMALE : Gender.MALE,
            nationality: "Bangladeshi",
            religion: "Islam",
          },
        },
        teacher: {
          create: {
            aamarId: ORGANIZATION_AAMAR_ID,
            qualification: teacherInfo.qualification,
            experience: teacherInfo.experience,
            specialization: teacherInfo.subjects[0], // First subject as specialization
            joiningDate: new Date("2024-01-01"),
            salary: 50000 + teacherInfo.experience * 2000, // Base salary + experience bonus
            emergencyContact: `+88017123456${90 + i}`,
            subjects: teacherInfo.subjects,
          },
        },
      },
    });
    teachers.push(user);
  }

  // Get teacher records for class assignment
  const teacherRecords = await prisma.teacher.findMany();

  // Assign class teachers
  for (let i = 0; i < Math.min(classes.length, teacherRecords.length); i++) {
    await prisma.class.update({
      where: { id: classes[i].id },
      data: { teacherId: teacherRecords[i].id },
    });
  }

  // Create Parents and Students distributed across branches
  const students = [];
  const parents = [];

  for (let i = 0; i < 60; i++) {
    // 60 students across 4 branches
    const branchIndex = i % branches.length; // Distribute students across branches
    const sectionIndex = i % sections.length;
    const classIndex = Math.floor(sectionIndex / 3); // 3 sections per class

    // Create Parent
    const parentUser = await prisma.user.create({
      data: {
        aamarId: ORGANIZATION_AAMAR_ID,
        email: `parent${i + 1}@example.com`,
        password: await bcrypt.hash("parent123", 10),
        firstName: `Parent${i + 1}`,
        lastName: "Guardian",
        role: UserRole.PARENT,
        schoolId: school.id,
        branchId: branches[branchIndex].id,
        profile: {
          create: {
            aamarId: ORGANIZATION_AAMAR_ID,
            email: `parent${i + 1}@example.com`,
            phone: `+88017123456${84 + i}`,
            gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
            nationality: "Bangladeshi",
            religion: "Islam",
          },
        },
        parent: {
          create: {
            aamarId: ORGANIZATION_AAMAR_ID,
            relation: i % 2 === 0 ? "Father" : "Mother",
          },
        },
      },
    });
    parents.push(parentUser);

    // Get parent record
    const parentRecord = await prisma.parent.findFirst({
      where: { userId: parentUser.id },
    });

    // Create Student
    const studentUser = await prisma.user.create({
      data: {
        aamarId: ORGANIZATION_AAMAR_ID,
        email: `student${i + 1}@example.com`,
        password: await bcrypt.hash("student123", 10),
        firstName: `Student${i + 1}`,
        lastName: "Learner",
        role: UserRole.STUDENT,
        schoolId: school.id,
        branchId: branches[branchIndex].id,
        profile: {
          create: {
            aamarId: ORGANIZATION_AAMAR_ID,
            email: `student${i + 1}@example.com`,
            phone: `+88017123457${14 + i}`,
            dateOfBirth: new Date(
              2010 + Math.floor(i / 3),
              Math.floor(Math.random() * 12),
              Math.floor(Math.random() * 28) + 1,
            ),
            gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
            bloodGroup: ["A+", "B+", "O+", "AB+"][i % 4],
            nationality: "Bangladeshi",
            religion: "Islam",
          },
        },
        student: {
          create: {
            aamarId: ORGANIZATION_AAMAR_ID,
            rollNumber: `2024${String(i + 1).padStart(3, "0")}`,
            admissionDate: new Date("2024-01-01"),
            sectionId: sections[sectionIndex].id,
            classId: classes[classIndex].id, // Fixed: Add classId assignment
            parentId: parentRecord?.id,
          },
        },
      },
    });
    students.push(studentUser);
  }

  // Create Settings
  await prisma.settings.create({
    data: {
      aamarId: ORGANIZATION_AAMAR_ID,
      schoolId: school.id,
      weeklySchedule: [
        { day: "Friday", open: true, start: "08:00", end: "14:00" },
        { day: "Saturday", open: true, start: "08:00", end: "14:00" },
        { day: "Sunday", open: true, start: "08:00", end: "14:00" },
        { day: "Monday", open: true, start: "08:00", end: "14:00" },
        { day: "Tuesday", open: true, start: "08:00", end: "14:00" },
        { day: "Wednesday", open: true, start: "08:00", end: "14:00" },
        { day: "Thursday", open: true, start: "08:00", end: "14:00" },
      ],
      subjectDuration: 45, // 45 minutes per subject
    },
  });

  // Create Sample Exams
  const examData = [
    {
      name: "Mid Term Examination",
      examType: "MIDTERM",
      description: "Mid-term examination for all classes",
      startDate: new Date("2024-03-15"),
      endDate: new Date("2024-03-20"),
    },
    {
      name: "Final Examination",
      examType: "FINAL",
      description: "Final examination for all classes",
      startDate: new Date("2024-06-15"),
      endDate: new Date("2024-06-25"),
    },
    {
      name: "Unit Test 1",
      examType: "UNIT_TEST",
      description: "First unit test of the semester",
      startDate: new Date("2024-02-01"),
      endDate: new Date("2024-02-05"),
    },
  ];

  const exams = [];
  for (const examInfo of examData) {
    // Create exam for each class
    for (const cls of classes) {
      const exam = await prisma.exam.create({
        data: {
          aamarId: ORGANIZATION_AAMAR_ID,
          name: `${examInfo.name} - ${cls.name}`,
          examType: examInfo.examType,
          description: examInfo.description,
          startDate: examInfo.startDate,
          endDate: examInfo.endDate,
          classId: cls.id,
          academicYearId: currentAcademicYear.id,
          schoolId: school.id,
          subjects: {
            create: subjects
              .filter(subject => subject.classId === cls.id)
              .slice(0, 3) // Limit to 3 subjects per exam
              .map(subject => ({
                aamarId: ORGANIZATION_AAMAR_ID,
                subjectId: subject.id,
                fullMarks: 100,
                passMarks: 40,
                examDate: new Date(examInfo.startDate.getTime() + Math.random() * (examInfo.endDate.getTime() - examInfo.startDate.getTime())),
                duration: 120, // 2 hours
              }))
          }
        }
      });
      exams.push(exam);
    }
  }

  console.log("✅ Basic setup completed!");
  console.log(`📊 Created:
  - 1 School: ${school.name}
  - ${branches.length} Branches: ${branches.map((b) => b.name).join(", ")}
  - ${academicYears.length} Academic Years: ${academicYears.map((ay) => ay.displayName).join(", ")}
  - ${classes.length} Classes with ${sections.length} Sections
  - ${subjects.length} Subjects
  - ${teachers.length} Teachers
  - ${students.length} Students with ${parents.length} Parents
  - ${exams.length} Exams with subjects
  - 1 Admin User: ${adminUser.firstName} ${adminUser.lastName}
  - School Settings configured`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
