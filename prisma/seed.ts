import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // console.log("Seeding database...");

  // Create default categories
  const categories = [
    {
      name: "Food & Dining",
      description: "Restaurants, groceries, and food delivery",
      color: "#F59E0B",
    },
    {
      name: "Transportation",
      description: "Gas, public transport, taxi, car maintenance",
      color: "#3B82F6",
    },
    {
      name: "Shopping",
      description: "Clothing, electronics, and general shopping",
      color: "#EC4899",
    },
    {
      name: "Entertainment",
      description: "Movies, games, subscriptions, and hobbies",
      color: "#8B5CF6",
    },
    {
      name: "Bills & Utilities",
      description: "Electricity, water, internet, phone bills",
      color: "#EF4444",
    },
    {
      name: "Healthcare",
      description: "Medical expenses, insurance, pharmacy",
      color: "#10B981",
    },
    {
      name: "Education",
      description: "Books, courses, school fees",
      color: "#F97316",
    },
    {
      name: "Travel",
      description: "Flights, hotels, vacation expenses",
      color: "#06B6D4",
    },
    {
      name: "Personal Care",
      description: "Haircuts, cosmetics, gym membership",
      color: "#84CC16",
    },
    {
      name: "Other",
      description: "Miscellaneous expenses",
      color: "#6B7280",
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  // console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    // console.error(e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
