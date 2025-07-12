const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Specific user ID and aamarId as provided
const SAMPLE_USER_ID = 'cmc7pueos000amzbjfiz0iep6';
const AAMAR_ID = 'AAMAR001';

const academicYears = [
  {
    startingYear: 2024,
    displayName: '2024-2025',
    status: true, // This will be the active year
    terms: [
      {
        name: "Term 1",
        startDate: "2024-01-01",
        endDate: "2024-04-30"
      },
      {
        name: "Mid Term",
        startDate: "2024-05-01",
        endDate: "2024-08-31"
      },
      {
        name: "Final Term",
        startDate: "2024-09-01",
        endDate: "2024-12-15"
      }
    ]
  },
  {
    startingYear: 2023,
    displayName: '2023-2024',
    status: false,
    terms: [
      {
        name: "Term 1",
        startDate: "2023-01-01",
        endDate: "2023-04-30"
      },
      {
        name: "Mid Term",
        startDate: "2023-05-01",
        endDate: "2023-08-31"
      },
      {
        name: "Final Term",
        startDate: "2023-09-01",
        endDate: "2023-12-15"
      }
    ]
  },
  {
    startingYear: 2025,
    displayName: '2025-2026',
    status: false,
    terms: [
      {
        name: "Term 1",
        startDate: "2025-01-01",
        endDate: "2025-04-30"
      },
      {
        name: "Mid Term",
        startDate: "2025-05-01",
        endDate: "2025-08-31"
      },
      {
        name: "Final Term",
        startDate: "2025-09-01",
        endDate: "2025-12-15"
      }
    ]
  },
  {
    startingYear: 2022,
    displayName: '2022-2023',
    status: false,
    terms: [
      {
        name: "Term 1",
        startDate: "2022-01-01",
        endDate: "2022-04-30"
      },
      {
        name: "Mid Term",
        startDate: "2022-05-01",
        endDate: "2022-08-31"
      },
      {
        name: "Final Term",
        startDate: "2022-09-01",
        endDate: "2022-12-15"
      }
    ]
  }
];

async function seedAcademicYears() {
  try {
    console.log('🌱 Starting to seed academic years...');

    // Use the specific user ID provided
    console.log(`📝 Using user ID: ${SAMPLE_USER_ID}`);
    console.log(`📝 Using aamarId: ${AAMAR_ID}`);

    // Clear existing academic years for this aamarId
    await prisma.academicYear.deleteMany({
      where: {
        aamarId: AAMAR_ID
      }
    });

    console.log('🧹 Cleared existing academic years');

    // Create academic years
    for (const yearData of academicYears) {
      const academicYear = await prisma.academicYear.create({
        data: {
          aamarId: AAMAR_ID,
          startingYear: yearData.startingYear,
          displayName: yearData.displayName,
          status: yearData.status,
          terms: yearData.terms,
          userId: SAMPLE_USER_ID,
        }
      });

      console.log(`✅ Created academic year: ${academicYear.displayName} (${academicYear.status ? 'ACTIVE' : 'inactive'})`);
    }

    console.log('🎉 Academic years seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Total academic years created: ${academicYears.length}`);
    console.log(`- Active year: ${academicYears.find(y => y.status)?.displayName}`);
    console.log(`- Years: ${academicYears.map(y => y.displayName).join(', ')}`);

  } catch (error) {
    console.error('❌ Error seeding academic years:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedAcademicYears(); 