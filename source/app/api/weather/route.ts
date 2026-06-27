import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");

  if (!latStr || !lngStr) {
    return NextResponse.json({ error: "Missing lat or lng parameters" }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Invalid lat or lng parameters" }, { status: 400 });
  }

  // Try to use OpenWeatherMap API if key is present
  const openWeatherKey = process.env.OPENWEATHER_API_KEY;
  if (openWeatherKey && !openWeatherKey.includes("placeholder")) {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${openWeatherKey}&units=metric`
      );
      if (response.ok) {
        const data = await response.json();
        
        // Save to database as a log
        const telemetry = await prisma.weatherTelemetry.create({
          data: {
            latitude: lat,
            longitude: lng,
            rainfall: data.rain ? (data.rain["1h"] || data.rain["3h"] || 0) : 0,
            windSpeed: data.wind?.speed || 0,
            temperature: data.main?.temp || 0,
            pressure: data.main?.pressure || 0,
            description: data.weather?.[0]?.description || "clear sky",
          },
        });
        return NextResponse.json(telemetry);
      }
    } catch (e) {
      console.error("Failed to fetch from OpenWeather, falling back to mock: ", e);
    }
  }

  // Fully featured Mock Weather Telemetry based on geographic location and current time
  const currentHour = new Date().getHours();
  let rainfall = 0;
  let description = "Clear sky";
  
  // Create seasonal or location-based mock rain patterns (e.g. if near high-risk coordinate, trigger higher rainfall)
  // Let's check coordinates. In HCMUTE area (~10.8507 lat), we might have heavy showers.
  const isAfternoon = currentHour >= 13 && currentHour <= 18;
  const isNight = currentHour >= 21 || currentHour <= 5;
  
  if (isAfternoon) {
    rainfall = 28.5; // heavy rain simulation
    description = "heavy intensity rain";
  } else if (isNight) {
    rainfall = 5.2; // moderate rain simulation
    description = "light rain";
  } else {
    rainfall = 0;
    description = "few clouds";
  }

  const windSpeed = 3.5 + Math.sin(lat) * 2;
  const temperature = 26 + Math.cos(lng) * 4 - (isNight ? 4 : 0);
  const pressure = 1008 + Math.sin(currentHour) * 3;

  try {
    const telemetry = await prisma.weatherTelemetry.create({
      data: {
        latitude: lat,
        longitude: lng,
        rainfall,
        windSpeed,
        temperature,
        pressure,
        description,
      },
    });
    return NextResponse.json(telemetry);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
