import 'dotenv/config';
import prisma from "../lib/prisma";
import { crawlGoogleImage } from "../lib/image-crawler";

function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push([lng / 1e5, lat / 1e5]);
  }
  return points;
}

async function fetchGoongRoute(startLat: number, startLng: number, endLat: number, endLng: number): Promise<[number, number][]> {
  const apiKey = process.env.NEXT_PUBLIC_GOONG_API_KEY || "2X3t5rZDLQiFHgLAdeGC8tkz2RZdTwfwMDtyFYSm";
  const url = `https://rsapi.goong.io/direction?origin=${startLat},${startLng}&destination=${endLat},${endLng}&vehicle=car&api_key=${apiKey}`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const polyline = data.routes?.[0]?.overview_polyline?.points;
      if (polyline) {
        return decodePolyline(polyline);
      }
    }
  } catch (e) {
    console.error("Failed to fetch Goong route for seed:", e);
  }
  return [[startLng, startLat], [endLng, endLat]];
}


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

  // 3. Create Vouchers with hash codes and no emojis
  const vouchersData = [
    {
      code: "VCH-8F2A-9D4B",
      title: "Free Highlands Coffee",
      description: "Redeem 1 free Vietnamese Traditional Blend Coffee at any Highlands store.",
      pointsRequired: 25,
      quantity: 50,
    },
    {
      code: "VCH-3C7E-5A1D",
      title: "50,000 VND Petrol Voucher",
      description: "Get a 50k discount on petrol refill at Petrolimex gas stations.",
      pointsRequired: 80,
      quantity: 20,
    },
    {
      code: "VCH-9B4F-2E8C",
      title: "Free Green Bus Ticket",
      description: "1 free single-ride ticket for VinBus electric bus service in Saigon.",
      pointsRequired: 15,
      quantity: 100,
    },
    {
      code: "VCH-1A6D-7B5E",
      title: "20,000 VND GrabBike Discount",
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
        title: v.title,
        description: v.description,
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
      startLat: 10.8791999,
      startLng: 106.7991941,
      endLat: 10.8783257,
      endLng: 106.8013148
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
      startLat: 10.8791999,
      startLng: 106.7991941,
      endLat: 10.8789166,
      endLng: 106.8004081
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
      startLat: 10.8783257,
      startLng: 106.8013148,
      endLat: 10.8778,
      endLng: 106.8021
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
    const coords = await fetchGoongRoute(inc.startLat, inc.startLng, inc.endLat, inc.endLng);
    const streetCoordsStr = JSON.stringify(coords);
    await prisma.roadIncident.create({
      data: {
        category: inc.category,
        riskScore: inc.riskScore,
        riskLevel: inc.riskLevel,
        latitude: inc.latitude,
        longitude: inc.longitude,
        locationName: inc.locationName,
        description: inc.description,
        recommendation: inc.recommendation,
        status: inc.status,
        streetCoords: streetCoordsStr,
        geom: streetCoordsStr
      },
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

  // 5b. Camera Detections — spread across June 25-27 for timeline slider
  const cameraDetectionsData = [
    // CAM_01 — June 25 detections
    { stationId: "CAM_01", timestamp: new Date("2026-06-25T08:00:00Z"), waterDepthCm: 5, vehiclesCount: 0, severity: "LOW", rawFramePath: "/detections/cam1_raw_day_0.jpg", segmentPath: "/detections/cam1_segment_day_0.jpg", floodedAreaPct: 8 },
    { stationId: "CAM_01", timestamp: new Date("2026-06-25T12:00:00Z"), waterDepthCm: 12, vehiclesCount: 1, severity: "LOW", rawFramePath: "/detections/cam1_raw_day_1.jpg", segmentPath: "/detections/cam1_segment_day_1.jpg", floodedAreaPct: 18 },
    { stationId: "CAM_01", timestamp: new Date("2026-06-25T14:30:00Z"), waterDepthCm: 22, vehiclesCount: 2, severity: "MEDIUM", rawFramePath: "/detections/cam1_raw_day_2.jpg", segmentPath: "/detections/cam1_segment_day_2.jpg", floodedAreaPct: 35 },
    { stationId: "CAM_01", timestamp: new Date("2026-06-25T17:00:00Z"), waterDepthCm: 38, vehiclesCount: 3, severity: "HIGH", rawFramePath: "/detections/cam1_raw_day_3.jpg", segmentPath: "/detections/cam1_segment_day_3.jpg", floodedAreaPct: 55 },
    // CAM_01 — June 26 detections
    { stationId: "CAM_01", timestamp: new Date("2026-06-26T09:00:00Z"), waterDepthCm: 15, vehiclesCount: 1, severity: "LOW", rawFramePath: "/detections/cam1_raw_day_4.jpg", segmentPath: "/detections/cam1_segment_day_4.jpg", floodedAreaPct: 22 },
    { stationId: "CAM_01", timestamp: new Date("2026-06-26T14:00:00Z"), waterDepthCm: 28, vehiclesCount: 2, severity: "MEDIUM", rawFramePath: "/detections/cam1_raw_day_5.jpg", segmentPath: "/detections/cam1_segment_day_5.jpg", floodedAreaPct: 40 },
    { stationId: "CAM_01", timestamp: new Date("2026-06-26T16:30:00Z"), waterDepthCm: 42, vehiclesCount: 4, severity: "HIGH", rawFramePath: "/detections/cam1_raw_day_6.jpg", segmentPath: "/detections/cam1_segment_day_6.jpg", floodedAreaPct: 62 },
    // CAM_01 — June 27 detections (today)
    { stationId: "CAM_01", timestamp: new Date("2026-06-27T07:00:00Z"), waterDepthCm: 8, vehiclesCount: 0, severity: "LOW", rawFramePath: "/detections/cam1_raw_day_7.jpg", segmentPath: "/detections/cam1_segment_day_7.jpg", floodedAreaPct: 12 },
    { stationId: "CAM_01", timestamp: new Date("2026-06-27T11:00:00Z"), waterDepthCm: 20, vehiclesCount: 1, severity: "MEDIUM", rawFramePath: "/detections/cam1_raw_day_0.jpg", segmentPath: "/detections/cam1_segment_day_0.jpg", floodedAreaPct: 30 },
    { stationId: "CAM_01", timestamp: new Date("2026-06-27T14:00:00Z"), waterDepthCm: 35, vehiclesCount: 3, severity: "HIGH", rawFramePath: "/detections/cam1_raw_day_1.jpg", segmentPath: "/detections/cam1_segment_day_1.jpg", floodedAreaPct: 52 },
    { stationId: "CAM_01", timestamp: new Date("2026-06-27T17:00:00Z"), waterDepthCm: 48, vehiclesCount: 5, severity: "HIGH", rawFramePath: "/detections/cam1_raw_day_3.jpg", segmentPath: "/detections/cam1_segment_day_3.jpg", floodedAreaPct: 70 },
    { stationId: "CAM_01", timestamp: new Date("2026-06-27T19:30:00Z"), waterDepthCm: 52, vehiclesCount: 6, severity: "HIGH", rawFramePath: "/detections/cam1_raw_day_5.jpg", segmentPath: "/detections/cam1_segment_day_5.jpg", floodedAreaPct: 78 },

    // CAM_02 — June 26-27 detections
    { stationId: "CAM_02", timestamp: new Date("2026-06-26T10:00:00Z"), waterDepthCm: 5, vehiclesCount: 0, severity: "LOW", rawFramePath: "/detections/cam2_raw_day_0.jpg", segmentPath: "/detections/cam2_segment_day_0.jpg", floodedAreaPct: 6 },
    { stationId: "CAM_02", timestamp: new Date("2026-06-26T14:00:00Z"), waterDepthCm: 18, vehiclesCount: 1, severity: "MEDIUM", rawFramePath: "/detections/cam2_raw_day_2.jpg", segmentPath: "/detections/cam2_segment_day_2.jpg", floodedAreaPct: 28 },
    { stationId: "CAM_02", timestamp: new Date("2026-06-26T16:00:00Z"), waterDepthCm: 30, vehiclesCount: 3, severity: "HIGH", rawFramePath: "/detections/cam2_raw_day_4.jpg", segmentPath: "/detections/cam2_segment_day_4.jpg", floodedAreaPct: 45 },
    { stationId: "CAM_02", timestamp: new Date("2026-06-27T08:00:00Z"), waterDepthCm: 10, vehiclesCount: 0, severity: "LOW", rawFramePath: "/detections/cam2_raw_day_5.jpg", segmentPath: "/detections/cam2_segment_day_5.jpg", floodedAreaPct: 15 },
    { stationId: "CAM_02", timestamp: new Date("2026-06-27T13:00:00Z"), waterDepthCm: 25, vehiclesCount: 2, severity: "MEDIUM", rawFramePath: "/detections/cam2_raw_day_6.jpg", segmentPath: "/detections/cam2_segment_day_6.jpg", floodedAreaPct: 38 },
    { stationId: "CAM_02", timestamp: new Date("2026-06-27T17:30:00Z"), waterDepthCm: 40, vehiclesCount: 4, severity: "HIGH", rawFramePath: "/detections/cam2_raw_day_7.jpg", segmentPath: "/detections/cam2_segment_day_7.jpg", floodedAreaPct: 60 },

    // CAM_03 — June 27 detections
    { stationId: "CAM_03", timestamp: new Date("2026-06-27T09:00:00Z"), waterDepthCm: 3, vehiclesCount: 0, severity: "LOW", rawFramePath: "/detections/cam3_raw_day_0.jpg", segmentPath: "/detections/cam3_segment_day_0.jpg", floodedAreaPct: 4 },
    { stationId: "CAM_03", timestamp: new Date("2026-06-27T14:00:00Z"), waterDepthCm: 12, vehiclesCount: 1, severity: "LOW", rawFramePath: "/detections/cam3_raw_day_3.jpg", segmentPath: "/detections/cam3_segment_day_3.jpg", floodedAreaPct: 18 },
    { stationId: "CAM_03", timestamp: new Date("2026-06-27T18:00:00Z"), waterDepthCm: 22, vehiclesCount: 2, severity: "MEDIUM", rawFramePath: "/detections/cam3_raw_day_5.jpg", segmentPath: "/detections/cam3_segment_day_5.jpg", floodedAreaPct: 32 },
  ];

  for (const det of cameraDetectionsData) {
    await prisma.cameraDetection.create({ data: det });
  }
  console.log("Camera detections seeded successfully.");

  // 6. Citizen Reports with real citizen-submitted flood photos
  //    Each report uses a unique flood photo from the Marie Curie street area.
  const userReportsData = [
    {
      reporterId: commuter.id,
      type: "CITIZEN",
      category: "FLOODING",
      imageUrl: "/detections/citizen_report_1.png",
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
      imageUrl: "/detections/citizen_report_2.png",
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
      imageUrl: "/detections/citizen_report_3.png",
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
      imageUrl: "/detections/citizen_report_4.png",
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
      imageUrl: "/detections/citizen_report_5.png",
      latitude: 10.8788000,
      longitude: 106.8002000,
      description: "Đường Marie Curie vẫn ngập sau 2 tiếng mưa tạnh. Hệ thống thoát nước quá tải.",
      confidence: 0.93,
      status: "PENDING",
      createdAt: new Date("2026-06-27T19:30:00Z"),
    },
  ];

  console.log("Crawling real Google images for citizen reports...");
  for (const rep of userReportsData) {
    try {
      rep.imageUrl = await crawlGoogleImage(rep.category);
    } catch (err) {
      console.warn("Image crawl fallback used", err);
    }
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

  // 8. Create Voucher Exchanges (Simulating user claims)
  const coffeeVoucher = await prisma.voucher.findUnique({ where: { code: "VCH-8F2A-9D4B" } });
  const petrolVoucher = await prisma.voucher.findUnique({ where: { code: "VCH-3C7E-5A1D" } });
  const busVoucher = await prisma.voucher.findUnique({ where: { code: "VCH-9B4F-2E8C" } });

  if (coffeeVoucher && petrolVoucher && busVoucher) {
    await prisma.voucherExchange.deleteMany({});
    
    // Seed ACTIVE and USED claims with timestamps
    await prisma.voucherExchange.create({
      data: {
        userId: commuter.id,
        voucherId: coffeeVoucher.id,
        status: "ACTIVE",
        exchangedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      }
    });

    await prisma.voucherExchange.create({
      data: {
        userId: commuter.id,
        voucherId: petrolVoucher.id,
        status: "USED",
        exchangedAt: new Date(Date.now() - 26 * 60 * 60 * 1000), // 26 hours ago
      }
    });

    await prisma.voucherExchange.create({
      data: {
        userId: commuter.id,
        voucherId: busVoucher.id,
        status: "ACTIVE",
        exchangedAt: new Date(Date.now() - 23 * 60 * 60 * 1000), // 23 hours ago (1 hour left)
      }
    });
    console.log("Voucher exchanges seeded successfully.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
