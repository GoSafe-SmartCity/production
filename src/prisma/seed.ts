import prisma from "../lib/prisma";

/**
 * GoSafe Production Seed
 * 
 * All coordinates and addresses are sourced from Goong Maps REST API:
 *   - Place AutoComplete: https://rsapi.goong.io/Place/AutoComplete
 *   - Place Detail:       https://rsapi.goong.io/Place/Detail
 *   - Reverse Geocoding:  https://rsapi.goong.io/Geocode?latlng=...
 * 
 * API Key: NEXT_PUBLIC_GOONG_API_KEY from .env
 */

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
      name: "Nguyễn Văn An",
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

  // ─── Real Goong API Coordinates (via Reverse Geocoding) ───────────────
  //
  // CAM_01 junction: Goong → "Đường William Shakespeare, Đông Hòa, Dĩ An, Bình Dương"
  //   lat: 10.8791999, lng: 106.7991941
  //
  // CAM_02 middle:   Goong → "Marie Curie St., Đường Marie Curie, Đông Hoà, Dĩ An, Bình Dương"
  //   lat: 10.8789166, lng: 106.8004081
  //
  // CAM_03 east:     Goong → "Khu thực hành công nghệ sinh học, Đông Hoà, Dĩ An, Bình Dương"
  //   lat: 10.8783257, lng: 106.8013148
  // ──────────────────────────────────────────────────────────────────────

  // 4. Create Active Road Incidents (Real Goong API addresses)
  const incidentsData = [
    {
      category: "FLOODING",
      riskScore: 85,
      riskLevel: "HIGH",
      latitude: 10.8791999,
      longitude: 106.7991941,
      locationName: "Đường William Shakespeare / Marie Curie, Đông Hòa",
      description: "Ngập nặng tại ngã tư Marie Curie – William Shakespeare. Mực nước đo được 45cm, xe máy chết máy hàng loạt.",
      recommendation: "CẤM ĐƯỜNG. Mực nước quá sâu. Xe máy đi vòng qua đường nội bộ ĐHQG. Ô tô chậm lại cẩn thận.",
      status: "ACTIVE",
    },
    {
      category: "FLOODING",
      riskScore: 58,
      riskLevel: "MEDIUM",
      latitude: 10.8789166,
      longitude: 106.8004081,
      locationName: "Đường Marie Curie, Đông Hoà, Dĩ An",
      description: "Đọng nước 20cm sau cơn mưa lớn. Xe vẫn lưu thông chậm được nhưng cần cẩn thận.",
      recommendation: "NGẬP VỪA. Đi chậm, giữ ga đều. Không tắt máy giữa vùng ngập.",
      status: "ACTIVE",
    },
    {
      category: "DEBRIS",
      riskScore: 25,
      riskLevel: "LOW",
      latitude: 10.8783257,
      longitude: 106.8013148,
      locationName: "Khu thực hành CNSH, Đông Hoà, Dĩ An",
      description: "Cành cây gãy chắn ngang làn phải. Ảnh hưởng nhẹ đến giao thông.",
      recommendation: "NGUY CƠ THẤP. Đường thông, lái vòng qua chướng ngại vật.",
      status: "ACTIVE",
    },
  ];

  // Clean old data to prevent seeding duplicates
  await prisma.incidentReport.deleteMany({});
  await prisma.roadIncident.deleteMany({});
  await prisma.cameraDetection.deleteMany({});
  await prisma.cameraStation.deleteMany({});
  await prisma.weatherTelemetry.deleteMany({});
  await prisma.incidentFeedback.deleteMany({});
  
  for (const inc of incidentsData) {
    await prisma.roadIncident.create({
      data: inc,
    });
  }
  console.log("Incidents seeded successfully.");

  // 5. Camera Stations (Goong API verified coordinates)
  const cameraStationsData = [
    {
      id: "CAM_01",
      name: "Đ. William Shakespeare / Marie Curie",
      latitude: 10.8791999,
      longitude: 106.7991941,
    },
    {
      id: "CAM_02",
      name: "Đường Marie Curie, Đông Hoà",
      latitude: 10.8789166,
      longitude: 106.8004081,
    },
    {
      id: "CAM_03",
      name: "Khu thực hành CNSH, Đông Hoà",
      latitude: 10.8783257,
      longitude: 106.8013148,
    },
  ];

  for (const c of cameraStationsData) {
    await prisma.cameraStation.create({
      data: c,
    });
  }
  console.log("Camera stations seeded successfully.");

  // 6. Citizen Reports with real images from CV detection pipeline
  //    Each report uses a unique flood frame captured by the AI camera system.
  const userReportsData = [
    {
      reporterId: commuter.id,
      type: "CITIZEN",
      category: "FLOODING",
      imageUrl: "/detections/cam1_raw_day_3.jpg",
      latitude: 10.8791999,
      longitude: 106.7991941,
      description: "Nước dâng cao ở ngã tư Marie Curie – Shakespeare. Xe máy không thể qua được, nhiều người phải dắt bộ.",
      confidence: 0.92,
      status: "APPROVED",
      createdAt: new Date("2026-06-25T14:30:00Z"),
    },
    {
      reporterId: commuter.id,
      type: "CITIZEN",
      category: "FLOODING",
      imageUrl: "/detections/cam2_raw_day_4.jpg",
      latitude: 10.8789166,
      longitude: 106.8004081,
      description: "Đường Marie Curie đoạn giữa ngập nặng, nhiều xe chết máy nằm giữa đường.",
      confidence: 0.95,
      status: "APPROVED",
      createdAt: new Date("2026-06-26T16:15:00Z"),
    },
    {
      reporterId: commuter.id,
      type: "CITIZEN",
      category: "FLOODING",
      imageUrl: "/detections/cam3_raw_day_6.jpg",
      latitude: 10.8783257,
      longitude: 106.8013148,
      description: "Khu vực gần Khu thực hành CNSH đọng nước, cành cây gãy chắn đường.",
      confidence: 0.88,
      status: "APPROVED",
      createdAt: new Date("2026-06-27T08:00:00Z"),
    },
    {
      reporterId: commuter.id,
      type: "CITIZEN",
      category: "FLOODING",
      imageUrl: "/detections/cam1_raw_day_5.jpg",
      latitude: 10.8790500,
      longitude: 106.7998000,
      description: "Nước bắt đầu tràn vào đoạn đường gần Shakespeare, cần cảnh báo sớm cho người đi đường.",
      confidence: 0.90,
      status: "PENDING",
      createdAt: new Date("2026-06-27T17:45:00Z"),
    },
    {
      reporterId: commuter.id,
      type: "CITIZEN",
      category: "FLOODING",
      imageUrl: "/detections/cam2_raw_day_6.jpg",
      latitude: 10.8788000,
      longitude: 106.8002000,
      description: "Đường Marie Curie vẫn ngập sau 2 tiếng mưa tạnh. Hệ thống thoát nước quá tải.",
      confidence: 0.93,
      status: "PENDING",
      createdAt: new Date("2026-06-27T19:30:00Z"),
    },
  ];

  for (const rep of userReportsData) {
    await prisma.incidentReport.create({
      data: rep,
    });

    // Add feedback votes for approved reports
    if (rep.status === "APPROVED") {
      await prisma.incidentFeedback.create({
        data: {
          userId: commuter.id,
          type: "STATUS_VOTE",
          statusVote: "STILL_ACTIVE",
          rating: 4,
          comment: "Xác nhận đường vẫn đang ngập sâu, nên đi đường tránh.",
          createdAt: new Date(rep.createdAt.getTime() + 1800000), // +30 mins
        }
      });
    }
  }
  console.log("Citizen reports and feedbacks seeded.");

  // 7. Historical Weather Telemetry (June 20 – June 27)
  //    Base position: Marie Curie / Shakespeare junction (from Goong API)
  const weatherHistory = [];
  const baseLat = 10.8791999;
  const baseLng = 106.7991941;

  for (let i = 0; i < 8; i++) {
    const date = new Date("2026-06-20T00:00:00Z");
    date.setDate(date.getDate() + i);

    // June 23 and June 26 were extreme rain days
    const isExtremeRainDay = i === 3 || i === 6;
    const rainfall = isExtremeRainDay ? 45.2 : (i % 2 === 0 ? 12.8 : 0);
    const description = isExtremeRainDay
      ? "Mưa rất to kèm dông sét"
      : (rainfall > 0 ? "Mưa rào nhẹ rải rác" : "Nhiều mây, khô ráo");
    const temperature = isExtremeRainDay ? 25.5 : 29.8;
    const windSpeed = isExtremeRainDay ? 8.4 : 3.2;

    weatherHistory.push({
      latitude: baseLat + (Math.random() - 0.5) * 0.005,
      longitude: baseLng + (Math.random() - 0.5) * 0.005,
      rainfall,
      windSpeed,
      temperature,
      pressure: 1006.5,
      description,
      createdAt: date,
    });
  }

  for (const w of weatherHistory) {
    await prisma.weatherTelemetry.create({
      data: w,
    });
  }
  console.log("Weather history seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
