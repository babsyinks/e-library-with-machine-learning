import {
  PrismaClient,
  ResourceStatus,
  ResourceType,
  Role,
} from "@prisma/client";
import * as bcrypt from "bcrypt";

const categories = [
  ["Computer Science", "computer-science"],
  ["Education", "education"],
  ["Engineering", "engineering"],
  ["Business & Economics", "business-economics"],
  ["Health Sciences", "health-sciences"],
  ["Social Sciences", "social-sciences"],
] as const;

export async function runSeed(prisma: PrismaClient) {
  const passwordHash = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD ?? "AdminPass123!",
    12,
  );
  const admin = await prisma.user.upsert({
    where: {
      email: (
        process.env.SEED_ADMIN_EMAIL ?? "admin@example.edu"
      ).toLowerCase(),
    },
    update: {},
    create: {
      name: "System Administrator",
      email: (
        process.env.SEED_ADMIN_EMAIL ?? "admin@example.edu"
      ).toLowerCase(),
      passwordHash,
      role: Role.ADMIN,
      department: "Library Services",
      emailVerifiedAt: new Date(),
    },
  });

  const createdCategories = new Map<string, string>();
  for (const [name, slug] of categories) {
    const category = await prisma.category.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
    createdCategories.set(slug, category.id);
  }

  if (process.env.SEED_DEMO_DATA === "false") return;

  const student = await prisma.user.upsert({
    where: { email: "student@example.edu" },
    update: {},
    create: {
      name: "Ada Okafor",
      email: "student@example.edu",
      passwordHash: await bcrypt.hash("StudentPass123!", 12),
      role: Role.STUDENT,
      department: "Computer Science",
      emailVerifiedAt: new Date(),
    },
  });

  const demoResources = [
    {
      title: "Introduction to Machine Learning for Education",
      author: "Dr. Helen Mensah",
      abstract:
        "An accessible introduction to supervised learning, recommender systems, evaluation metrics and responsible educational data use.",
      tags: ["machine learning", "education", "recommendation"],
      publicationYear: 2025,
      resourceType: ResourceType.EBOOK,
      categoryId: createdCategories.get("computer-science")!,
      department: "Computer Science",
    },
    {
      title: "Research Methods and Thesis Writing",
      author: "Prof. Samuel Adeyemi",
      abstract:
        "A practical guide to research design, literature reviews, quantitative analysis and presenting a defensible final-year thesis.",
      tags: ["research", "thesis", "methodology"],
      publicationYear: 2024,
      resourceType: ResourceType.COURSE_MATERIAL,
      categoryId: createdCategories.get("education")!,
      department: "Education",
    },
    {
      title: "Database Systems Past Questions",
      author: "Department of Computer Science",
      abstract:
        "A curated set of database design, SQL, normalization and transaction management examination questions.",
      tags: ["database", "sql", "examination"],
      publicationYear: 2025,
      resourceType: ResourceType.PAST_QUESTION,
      categoryId: createdCategories.get("computer-science")!,
      department: "Computer Science",
    },
  ];

  for (const resource of demoResources) {
    const exists = await prisma.resource.findFirst({
      where: { title: resource.title },
    });
    if (!exists) {
      await prisma.resource.create({
        data: {
          ...resource,
          status: ResourceStatus.APPROVED,
          uploadedById: admin.id,
          reviewedById: admin.id,
          reviewedAt: new Date(),
        },
      });
    }
  }

  const first = await prisma.resource.findFirst({
    where: { status: ResourceStatus.APPROVED },
  });
  if (first) {
    await prisma.savedResource.upsert({
      where: {
        userId_resourceId: { userId: student.id, resourceId: first.id },
      },
      update: {},
      create: { userId: student.id, resourceId: first.id },
    });
  }
}
