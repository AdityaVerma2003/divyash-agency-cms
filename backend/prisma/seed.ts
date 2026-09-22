import { PrismaClient, ServiceCategory, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding demo data...");

  const passwordHash = await bcrypt.hash("Admin@123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@divyashdigital.co.in" },
    update: {},
    create: {
      name: "Divyash Admin",
      email: "admin@divyashdigital.co.in",
      passwordHash,
      role: Role.SUPER_ADMIN,
    },
  });

  const services = await Promise.all(
    [
      { name: "Search Engine Optimization", category: ServiceCategory.SEO },
      { name: "Social Media Management", category: ServiceCategory.SMM },
      { name: "Google Ads Management", category: ServiceCategory.GOOGLE_ADS },
      { name: "Meta Ads Management", category: ServiceCategory.META_ADS },
      { name: "Website Design & Development", category: ServiceCategory.WEB_DESIGN },
      { name: "Graphic Design", category: ServiceCategory.GRAPHIC_DESIGN },
    ].map((s) =>
      prisma.service.upsert({
        where: { name: s.name },
        update: {},
        create: s,
      })
    )
  );

  const client = await prisma.client.upsert({
    where: { email: "client@example.com" },
    update: {},
    create: {
      companyName: "Sample Client Pvt Ltd",
      contactPerson: "Rohan Mehta",
      email: "client@example.com",
      phone: "+91 90000 00000",
      gstin: "07ABCDE1234F1Z5",
      address: "Connaught Place, New Delhi",
      accountManagerId: admin.id,
    },
  });

  const clientPasswordHash = await bcrypt.hash("Client@123", 10);
  await prisma.user.upsert({
    where: { email: "client@example.com" },
    update: {},
    create: {
      name: "Rohan Mehta",
      email: "client@example.com",
      passwordHash: clientPasswordHash,
      role: Role.CLIENT,
      clientId: client.id,
    },
  });

  const seo = services[0];
  const smm = services[1];

  const clientServiceSeo = await prisma.clientService.create({
    data: {
      clientId: client.id,
      serviceId: seo.id,
      rate: 15000,
      startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1),
    },
  });

  const clientServiceSmm = await prisma.clientService.create({
    data: {
      clientId: client.id,
      serviceId: smm.id,
      rate: 20000,
      startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1),
    },
  });

  await prisma.post.createMany({
    data: [
      {
        clientServiceId: clientServiceSmm.id,
        platform: "Instagram",
        publishedAt: new Date(),
        reach: 4200,
        likes: 310,
        comments: 22,
        shares: 14,
      },
      {
        clientServiceId: clientServiceSmm.id,
        platform: "Facebook",
        publishedAt: new Date(),
        reach: 2100,
        likes: 140,
        comments: 9,
        shares: 5,
      },
    ],
  });

  const invoiceNumber = `INV-${new Date().getFullYear()}-0001`;
  const invoice = await prisma.invoice.upsert({
    where: { invoiceNumber },
    update: {},
    create: {
      clientId: client.id,
      invoiceNumber,
      periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
      subtotal: 35000,
      taxAmount: 6300,
      totalAmount: 41300,
      status: "SENT",
      dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 10),
    },
  });

  await prisma.invoiceItem.createMany({
    data: [
      { invoiceId: invoice.id, clientServiceId: clientServiceSeo.id, description: "SEO — monthly retainer", amount: 15000 },
      { invoiceId: invoice.id, clientServiceId: clientServiceSmm.id, description: "Social media management — monthly retainer", amount: 20000 },
    ],
  });

  console.log("Seed complete.");
  console.log("Admin login:  admin@divyashdigital.co.in / Admin@123");
  console.log("Client login: client@example.com / Client@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
