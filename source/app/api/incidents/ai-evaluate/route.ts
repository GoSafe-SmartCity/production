import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { category, latitude, longitude, description, confidence } = await req.json();

    if (!category || !latitude || !longitude) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const conf = parseFloat(confidence || "1.0");

    // Fetch the latest weather telemetry near this location (within 5km/0.05 degrees)
    const latestWeather = await prisma.weatherTelemetry.findFirst({
      where: {
        latitude: { gte: lat - 0.05, lte: lat + 0.05 },
        longitude: { gte: lng - 0.05, lte: lng + 0.05 },
      },
      orderBy: { createdAt: "desc" },
    });

    // If no weather telemetry is found, generate standard mock weather properties
    const rainfall = latestWeather?.rainfall || 0;
    const windSpeed = latestWeather?.windSpeed || 3.0;

    // AI Risk Scoring Algorithm (Deterministic Local Model)
    let baseScore = 20;
    switch (category) {
      case "FLOODING":
        baseScore = 55;
        break;
      case "ACCIDENT":
        baseScore = 45;
        break;
      case "DEBRIS":
        baseScore = 25;
        break;
      case "POTHOLES":
        baseScore = 15;
        break;
    }

    // Weather impact multipliers
    let weatherMultiplier = 1.0;
    if (category === "FLOODING") {
      // High rainfall drastically increases flood risk
      if (rainfall > 20) {
        weatherMultiplier = 1.6;
      } else if (rainfall > 5) {
        weatherMultiplier = 1.3;
      }
    } else if (category === "DEBRIS") {
      // High winds increase risks of falling trees/debris
      if (windSpeed > 8) {
        weatherMultiplier = 1.5;
      } else if (windSpeed > 4) {
        weatherMultiplier = 1.2;
      }
    } else if (category === "ACCIDENT") {
      // Slippery roads from rain increase accident severity index
      if (rainfall > 10) {
        weatherMultiplier = 1.25;
      }
    }

    // Apply confidence factor and weather multiplier
    const calculatedScore = Math.min(100, Math.round(baseScore * weatherMultiplier * conf));

    // Determine Risk Level
    let riskLevel = "LOW";
    if (calculatedScore >= 70) {
      riskLevel = "HIGH";
    } else if (calculatedScore >= 40) {
      riskLevel = "MEDIUM";
    }

    // Generate Natural AI Recommendation Output based on score & weather
    let aiRecommendation = "";
    switch (category) {
      case "FLOODING":
        if (riskLevel === "HIGH") {
          aiRecommendation = `CRITICAL FLOOD RISK (Score: ${calculatedScore}%). Rainfall is currently at ${rainfall.toFixed(1)}mm. Water level is estimated to exceed 40cm. Immediatelly detour. Small vehicles will stall. Re-route via high-elevation highways.`;
        } else if (riskLevel === "MEDIUM") {
          aiRecommendation = `MODERATE FLOOD ALERT (Score: ${calculatedScore}%). Rainfall is ${rainfall.toFixed(1)}mm. Minor lane flooding. Drive in the center lane and maintain slow speeds. Impassable for motorcycles soon.`;
        } else {
          aiRecommendation = `LOW FLOOD RISK (Score: ${calculatedScore}%). Puddling detected. Road remains fully passable. Exercise standard caution during rain.`;
        }
        break;
      case "ACCIDENT":
        if (riskLevel === "HIGH") {
          aiRecommendation = `CRITICAL COLLISION OBSTRUCTION (Score: ${calculatedScore}%). Multi-vehicle blockage. Both lanes completely shut. emergency response on scene. Reroute via nearest exit immediately to avoid gridlock.`;
        } else if (riskLevel === "MEDIUM") {
          aiRecommendation = `MODERATE ACCIDENT DELAY (Score: ${calculatedScore}%). Minor collision restricting traffic to single-lane flow. Expect 10-15 min delay. Slow down when approaching the area.`;
        } else {
          aiRecommendation = `LOW ACCIDENT NOTICE (Score: ${calculatedScore}%). Vehicles moved to emergency shoulder lane. Normal traffic speed remains. No detour required.`;
        }
        break;
      case "DEBRIS":
        if (riskLevel === "HIGH") {
          aiRecommendation = `MAJOR ROAD OBSTRUCTION (Score: ${calculatedScore}%). Fallen tree/obstacle blocking lanes. Wind speeds are ${windSpeed.toFixed(1)}m/s. Completely impassable. Seek alternative routing immediately.`;
        } else if (riskLevel === "MEDIUM") {
          aiRecommendation = `SCATTERED DEBRIS WARNING (Score: ${calculatedScore}%). Small branches/cargo debris in right lane. Maintain high alertness and change lanes early to avoid tire punctures.`;
        } else {
          aiRecommendation = `MINOR DEBRIS NOTE (Score: ${calculatedScore}%). Small branch or gravel on side shoulder. Drive normally.`;
        }
        break;
      case "POTHOLES":
        if (riskLevel === "HIGH") {
          aiRecommendation = `SEVERE CRATER RISK (Score: ${calculatedScore}%). Deep potholes and asphalt cracks. Extreme hazard of tire bursts or rim deformation. Reduce speed under 20km/h and bypass manually.`;
        } else if (riskLevel === "MEDIUM") {
          aiRecommendation = `MODERATE POTHOLES (Score: ${calculatedScore}%). Active road degradation. Avoid tailgating to ensure enough visibility to steer around road holes.`;
        } else {
          aiRecommendation = `MINOR ROAD BUMP (Score: ${calculatedScore}%). Small cracks forming. Safe for standard speeds.`;
        }
        break;
    }

    return NextResponse.json({
      success: true,
      category,
      riskScore: calculatedScore,
      riskLevel,
      weatherContext: {
        rainfall,
        windSpeed,
        description: latestWeather?.description || "Stable conditions",
      },
      recommendation: aiRecommendation,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
