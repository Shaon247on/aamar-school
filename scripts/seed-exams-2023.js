const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const ORGANIZATION_AAMAR_ID = 'AAMAR001';

async function seedExams2023() {
  try {
    console.log('🔍 Seeding exams for academic year 2023...');

    // Find the academic year 2023
    const academicYear = await prisma.academicYear.findFirst({
      where: { aamarId: ORGANIZATION_AAMAR_ID, startingYear: 2023 },
    });
    if (!academicYear) throw new Error('Academic year 2023 not found');

    // Get all classes with branch and branch.schoolId (Class 1 to Class 10)
    const classes = await prisma.class.findMany({
      where: { aamarId: ORGANIZATION_AAMAR_ID },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, branch: { select: { schoolId: true } } },
    });
    if (classes.length === 0) throw new Error('No classes found');

    // Get all subjects
    const subjects = await prisma.subject.findMany({
      where: { aamarId: ORGANIZATION_AAMAR_ID },
    });
    if (subjects.length === 0) throw new Error('No subjects found');

    // Helper to get all subjects for a class
    function getClassSubjects(cls) {
      return subjects.filter(s => s.classId === cls.id);
    }

    // Dates and time slots for the routine
    const baseDate = new Date('2023-07-12');
    const dateList = [
      new Date(baseDate),
      new Date(baseDate.getTime() + 24*60*60*1000),
      new Date(baseDate.getTime() + 2*24*60*60*1000),
    ];
    const timeSlots = [
      { startTime: '09:00', endTime: '12:00' },
      { startTime: '12:00', endTime: '15:00' },
      { startTime: '15:00', endTime: '18:00' },
    ];

    // For each class, create a "Mid Term" exam with all subjects distributed across dates and time slots
    for (const cls of classes) {
      const classSubjects = getClassSubjects(cls);
      if (classSubjects.length === 0) continue;
      const examSubjects = [];
      let subjIdx = 0;
      for (let d = 0; d < dateList.length; d++) {
        for (let t = 0; t < timeSlots.length; t++) {
          if (subjIdx >= classSubjects.length) break;
          examSubjects.push({
            aamarId: ORGANIZATION_AAMAR_ID,
            subjectId: classSubjects[subjIdx].id,
            examDate: dateList[d],
            startTime: timeSlots[t].startTime,
            endTime: timeSlots[t].endTime,
          });
          subjIdx++;
        }
      }
      if (examSubjects.length === 0) continue;
      const examDates = examSubjects.map(es => es.examDate);
      const startDate = new Date(Math.min(...examDates.map(d => d.getTime())));
      const endDate = new Date(Math.max(...examDates.map(d => d.getTime())));
      await prisma.exam.create({
        data: {
          aamarId: ORGANIZATION_AAMAR_ID,
          term: 'Mid Term',
          startDate,
          endDate,
          classId: cls.id,
          academicYearId: academicYear.id,
          schoolId: cls.branch.schoolId,
          subjects: { create: examSubjects },
        },
      });
      console.log(`✅ Created Mid Term exam for class ${cls.name}`);
    }
    console.log('🎉 Exams for 2023 Mid Term seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding exams for 2023:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedExams2023()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} 