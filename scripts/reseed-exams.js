const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ORGANIZATION_AAMAR_ID = 'AAMAR001';

async function reseedExams() {
  try {
    console.log('🔍 Checking existing data...');
    console.log(`📚 Using aamarId: ${ORGANIZATION_AAMAR_ID}`);
    
    console.log('🗑️  Deleting existing exam data only...');
    
    // Delete all exam-related data in the correct order (only exam data)
    await prisma.examResult.deleteMany({
      where: { aamarId: ORGANIZATION_AAMAR_ID }
    });
    console.log('✅ Deleted exam results');
    
    await prisma.examSubject.deleteMany({
      where: { aamarId: ORGANIZATION_AAMAR_ID }
    });
    console.log('✅ Deleted exam subjects');
    
    await prisma.exam.deleteMany({
      where: { aamarId: ORGANIZATION_AAMAR_ID }
    });
    console.log('✅ Deleted exams');
    
    console.log('📚 Creating new exam data...');
    
    // Get existing data needed for exams (keeping all other data intact)
    const school = await prisma.school.findFirst({
      where: { aamarId: ORGANIZATION_AAMAR_ID }
    });
    
    if (!school) {
      throw new Error('School not found');
    }
    
    const classes = await prisma.class.findMany({
      where: { aamarId: ORGANIZATION_AAMAR_ID },
      take: 5 // Use first 5 classes
    });
    
    const academicYears = await prisma.academicYear.findMany({
      where: { aamarId: ORGANIZATION_AAMAR_ID },
      take: 2 // Use first 2 academic years
    });
    
    const subjects = await prisma.subject.findMany({
      where: { aamarId: ORGANIZATION_AAMAR_ID },
      take: 10 // Use first 10 subjects
    });
    
    console.log(`📊 Found: ${classes.length} classes, ${academicYears.length} academic years, ${subjects.length} subjects`);
    
    if (classes.length === 0 || academicYears.length === 0 || subjects.length === 0) {
      throw new Error('Required data (classes, academic years, or subjects) not found');
    }
    
    // Create exam data with different statuses
    const examData = [
      {
        name: "Midterm Examination",
        examType: "MIDTERM",
        description: "First semester midterm examination covering all subjects",
        startDate: new Date('2024-12-15'),
        endDate: new Date('2024-12-20'),
        classId: classes[0].id,
        academicYearId: academicYears[0].id,
        subjects: [
          { subjectId: subjects[0].id, fullMarks: 100, passMarks: 40, examDate: new Date('2024-12-15'), duration: 120 },
          { subjectId: subjects[1].id, fullMarks: 100, passMarks: 40, examDate: new Date('2024-12-16'), duration: 120 },
          { subjectId: subjects[2].id, fullMarks: 100, passMarks: 40, examDate: new Date('2024-12-17'), duration: 120 }
        ]
      },
      {
        name: "Final Examination",
        examType: "FINAL",
        description: "End of year final examination",
        startDate: new Date('2024-11-01'),
        endDate: new Date('2024-11-10'),
        classId: classes[1].id,
        academicYearId: academicYears[0].id,
        subjects: [
          { subjectId: subjects[3].id, fullMarks: 100, passMarks: 40, examDate: new Date('2024-11-01'), duration: 150 },
          { subjectId: subjects[4].id, fullMarks: 100, passMarks: 40, examDate: new Date('2024-11-02'), duration: 150 }
        ]
      },
      {
        name: "Current Unit Test",
        examType: "QUIZ",
        description: "Current unit test for ongoing topics",
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-12-05'),
        classId: classes[2].id,
        academicYearId: academicYears[0].id,
        subjects: [
          { subjectId: subjects[5].id, fullMarks: 50, passMarks: 25, examDate: new Date('2024-12-01'), duration: 60 },
          { subjectId: subjects[6].id, fullMarks: 50, passMarks: 25, examDate: new Date('2024-12-02'), duration: 60 }
        ]
      },
      {
        name: "Monthly Assessment",
        examType: "QUIZ",
        description: "Monthly progress assessment",
        startDate: new Date('2024-12-10'),
        endDate: new Date('2024-12-12'),
        classId: classes[3].id,
        academicYearId: academicYears[0].id,
        subjects: [
          { subjectId: subjects[7].id, fullMarks: 75, passMarks: 30, examDate: new Date('2024-12-10'), duration: 90 },
          { subjectId: subjects[8].id, fullMarks: 75, passMarks: 30, examDate: new Date('2024-12-11'), duration: 90 }
        ]
      },
      {
        name: "Project Submission",
        examType: "PROJECT",
        description: "Final project submission and presentation",
        startDate: new Date('2024-11-20'),
        endDate: new Date('2024-11-25'),
        classId: classes[4].id,
        academicYearId: academicYears[0].id,
        subjects: [
          { subjectId: subjects[9].id, fullMarks: 100, passMarks: 50, examDate: new Date('2024-11-20'), duration: 180 }
        ]
      }
    ];
    
    // Create exams with subjects
    for (const examInfo of examData) {
      const exam = await prisma.exam.create({
        data: {
          aamarId: ORGANIZATION_AAMAR_ID,
          name: examInfo.name,
          examType: examInfo.examType,
          description: examInfo.description,
          startDate: examInfo.startDate,
          endDate: examInfo.endDate,
          classId: examInfo.classId,
          academicYearId: examInfo.academicYearId,
          schoolId: school.id,
          subjects: {
            create: examInfo.subjects.map(subject => ({
              aamarId: ORGANIZATION_AAMAR_ID,
              subjectId: subject.subjectId,
              fullMarks: subject.fullMarks,
              passMarks: subject.passMarks,
              examDate: subject.examDate,
              duration: subject.duration,
            }))
          }
        }
      });
      
      // Calculate status for display
      const now = new Date();
      const start = new Date(examInfo.startDate);
      const end = new Date(examInfo.endDate);
      let status = 'SCHEDULED';
      if (now >= start && now <= end) {
        status = 'ONGOING';
      } else if (now > end) {
        status = 'COMPLETED';
      }
      
      console.log(`✅ Created exam: ${exam.name} (${status})`);
    }
    
    console.log('🎉 Exam reseeding completed successfully!');
    console.log(`📊 Created ${examData.length} exams with different statuses:`);
    console.log(`   - Scheduled: ${examData.filter(e => {
      const now = new Date();
      const start = new Date(e.startDate);
      return now < start;
    }).length}`);
    console.log(`   - Ongoing: ${examData.filter(e => {
      const now = new Date();
      const start = new Date(e.startDate);
      const end = new Date(e.endDate);
      return now >= start && now <= end;
    }).length}`);
    console.log(`   - Completed: ${examData.filter(e => {
      const now = new Date();
      const end = new Date(e.endDate);
      return now > end;
    }).length}`);
    
  } catch (error) {
    console.error('❌ Error reseeding exams:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reseeding
if (require.main === module) {
  reseedExams()
    .then(() => {
      console.log('✅ Exam reseeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Exam reseeding failed:', error);
      process.exit(1);
    });
}

module.exports = { reseedExams }; 