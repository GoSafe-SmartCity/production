import prisma from "../lib/prisma";

async function main() {
  console.log("Seeding database...");

  // 1. Create Admin User
  const admin = await prisma.user.upsert({
    where: { email: "admin@gmail.com" },
    update: {},
    create: {
      email: "admin@gmail.com",
      name: "GoSafe Admin",
      role: "ADMIN",
      points: 100,
      consent: true,
    },
  });
  console.log("Admin seeded: ", admin.email);

  // 2. Create Commuter User
  const commuter = await prisma.user.upsert({
    where: { email: "commuter@gmail.com" },
    update: {},
    create: {
      email: "commuter@gmail.com",
      name: "Safe Commuter",
      role: "USER",
      points: 45,
      consent: true,
    },
  });
  console.log("Commuter seeded: ", commuter.email);

  // 3. Create Vouchers
  const vouchersData = [
    {
      code: "FREECOFFEE",
      title: "☕ Free Highlands Coffee",
      description: "Redeem 1 free Vietnamese Traditional Blend Coffee at any Highlands store.",
      pointsRequired: 25,
      quantity: 50,
    },
    {
      code: "PETROL50",
      title: "⛽ 50,000 VND Petrol Voucher",
      description: "Get a 50k discount on petrol refill at Petrolimex gas stations.",
      pointsRequired: 80,
      quantity: 20,
    },
    {
      code: "BUSTRIP",
      title: "🚌 Free Green Bus Ticket",
      description: "1 free single-ride ticket for VinBus electric bus service in Saigon.",
      pointsRequired: 15,
      quantity: 100,
    },
    {
      code: "GRABBIKE",
      title: "🏍️ 20,000 VND GrabBike Discount",
      description: "Save 20k on your next GrabBike trip within Thu Duc city.",
      pointsRequired: 30,
      quantity: 15,
    },
  ];

  for (const v of vouchersData) {
    await prisma.voucher.upsert({
      where: { code: v.code },
      update: {
        pointsRequired: v.pointsRequired,
        quantity: v.quantity,
      },
      create: v,
    });
  }
  console.log("Vouchers seeded successfully.");

  // 4. Create Active Road Incidents (Coordinates near HCMUTE campus in Thu Duc)
  const incidentsData = [
    {
      category: "FLOODING",
      riskScore: 78,
      riskLevel: "HIGH",
      latitude: 10.8507,
      longitude: 106.7719,
      locationName: "Vo Van Ngan St (near HCMUTE Gate 1)",
      description: "Deep water accumulation up to 35cm due to sudden heavy afternoon rain. Motorbikes stalling.",
      recommendation: "HIGH RISK. Water levels are rising. Cars can pass with caution. Motorbikes detour via Le Van Viet St.",
      status: "ACTIVE",
    },
    {
      category: "ACCIDENT",
      riskScore: 48,
      riskLevel: "MEDIUM",
      latitude: 10.8530,
      longitude: 106.7735,
      locationName: "Hanoi Highway (under Thu Duc Overpass)",
      description: "Minor fender bender between two passenger cars blocking the right-most lane. Traffic is congested.",
      recommendation: "MODERATE DELAY. Slow down on approach. Change to the middle lane early.",
      status: "ACTIVE",
    },
    {
      category: "DEBRIS",
      riskScore: 35,
      riskLevel: "LOW",
      latitude: 10.8495,
      longitude: 106.7750,
      locationName: "Le Van Viet St (near Vincom Plaza)",
      description: "Small tree branch fell onto the side motor lane. Drive path slightly obstructed.",
      recommendation: "LOW HAZARD. Easily passable. Change lane slightly to steer around the branch.",
      status: "ACTIVE",
    },
  ];

  // Clean old active incidents to prevent seeding duplicates
  await prisma.roadIncident.deleteMany({});
  
  for (const inc of incidentsData) {
    await prisma.roadIncident.create({
      data: inc,
    });
  }
  console.log("Incidents seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
