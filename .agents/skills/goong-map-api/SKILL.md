---
name: Goong Map API Integration
description: Use the Goong Maps REST API (Places, Geocoding, Directions) to look up real coordinates and addresses in Vietnam. This skill covers autocomplete, place detail, geocoding, and directions APIs with the project's API keys.
---

# Goong Map API Integration

This skill documents how to use the **Goong Maps REST API** for geocoding, place search, and directions in the GoSafe Smart City project.

## API Keys

The project uses two Goong keys stored in `src/.env`:

| Key | Purpose | Usage |
|-----|---------|-------|
| `NEXT_PUBLIC_GOONG_MAP_KEY` | Map Tiles rendering (goong-js SDK) | Client-side map display |
| `NEXT_PUBLIC_GOONG_API_KEY` | REST API calls (Places, Geocoding, Directions) | Server-side or curl requests |

**Current REST API Key**: `2X3t5rZDLQiFHgLAdeGC8tkz2RZdTwfwMDtyFYSm`

## API Base URL

All REST API calls use: `https://rsapi.goong.io`

## Places AutoComplete

Search for places by keyword. Returns a list of predictions with `place_id` for detail lookup.

```bash
curl -s "https://rsapi.goong.io/Place/AutoComplete?api_key=YOUR_API_KEY&input=SEARCH_QUERY&location=LAT,LNG" | python3 -m json.tool
```

### Parameters
- `api_key` (required): Your Goong API key
- `input` (required): Search text (e.g., "Marie Curie", "VNU-HCM")
- `location` (optional): Bias results to this lat,lng (e.g., `10.879,106.800`)
- `radius` (optional): Radius in meters to bias results
- `limit` (optional): Max number of results

### Response Structure
```json
{
  "predictions": [
    {
      "description": "Full address text",
      "place_id": "unique_id_for_detail_lookup",
      "structured_formatting": {
        "main_text": "Place name",
        "secondary_text": "Ward, District, Province"
      },
      "compound": {
        "district": "District name",
        "commune": "Ward name",
        "province": "Province name"
      },
      "types": ["street", "stadium", etc.]
    }
  ],
  "status": "OK"
}
```

## Place Detail

Get exact coordinates and details for a `place_id` obtained from AutoComplete.

```bash
curl -s "https://rsapi.goong.io/Place/Detail?api_key=YOUR_API_KEY&place_id=PLACE_ID" | python3 -m json.tool
```

### Response Structure
```json
{
  "result": {
    "place_id": "...",
    "formatted_address": "Full address",
    "geometry": {
      "location": {
        "lat": 10.8791999,
        "lng": 106.7991941
      }
    },
    "name": "Place name",
    "url": "https://maps.goong.io/?pid=..."
  },
  "status": "OK"
}
```

## Geocoding (Address → Coordinates)

Convert an address string to coordinates.

```bash
curl -s "https://rsapi.goong.io/Geocode?api_key=YOUR_API_KEY&address=ADDRESS_STRING" | python3 -m json.tool
```

## Reverse Geocoding (Coordinates → Address)

Convert coordinates to an address.

```bash
curl -s "https://rsapi.goong.io/Geocode?api_key=YOUR_API_KEY&latlng=LAT,LNG" | python3 -m json.tool
```

## Directions API

Get route directions between two points.

```bash
curl -s "https://rsapi.goong.io/Direction?api_key=YOUR_API_KEY&origin=LAT1,LNG1&destination=LAT2,LNG2&vehicle=car" | python3 -m json.tool
```

### Parameters
- `origin`: Start coordinates (lat,lng)
- `destination`: End coordinates (lat,lng)
- `vehicle`: `car`, `bike`, `taxi`, `truck`, `hd` (motorbike)

## Workflow: Finding Exact Location Coordinates

To find real coordinates for a specific place/intersection:

### Step 1: AutoComplete Search
```bash
curl -s "https://rsapi.goong.io/Place/AutoComplete?api_key=2X3t5rZDLQiFHgLAdeGC8tkz2RZdTwfwMDtyFYSm&input=Marie+Curie&location=10.879,106.800" | python3 -m json.tool
```

### Step 2: Get Place Detail with the `place_id`
```bash
curl -s "https://rsapi.goong.io/Place/Detail?api_key=2X3t5rZDLQiFHgLAdeGC8tkz2RZdTwfwMDtyFYSm&place_id=PLACE_ID_FROM_STEP_1" | python3 -m json.tool
```

### Step 3: Extract coordinates from `result.geometry.location`

## Project-Specific Reference Coordinates

These coordinates were obtained via Goong API and are used in the GoSafe project seed data:

| Location | Vietnamese Address (Goong) | Latitude | Longitude | API Method |
|----------|---------------------------|----------|-----------|------------|
| CAM_01 Junction | Đường William Shakespeare, Đông Hòa, Dĩ An, Bình Dương | 10.8791999 | 106.7991941 | Reverse Geocoding |
| CAM_02 Middle | Marie Curie St., Đường Marie Curie, Đông Hoà, Dĩ An, Bình Dương | 10.8789166 | 106.8004081 | Reverse Geocoding |
| CAM_03 East | Khu thực hành công nghệ sinh học, Đông Hoà, Dĩ An, Bình Dương | 10.8783257 | 106.8013148 | Reverse Geocoding |
| Marie Curie St (origin) | Marie Curie, Đông Hòa, Dĩ An, Bình Dương | 10.878372927 | 106.796130488 | Place Detail |
| William Shakespeare St | Đường William Shakespeare, Đông Hòa, Dĩ An, Bình Dương | 10.8791999 | 106.7991941 | Place Detail |

## Goong JS Map SDK (Client-Side)

The Goong JS SDK is loaded from CDN in the Next.js app:

```html
<script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"></script>
```

Initialize with the **Map Tiles key** (not the REST API key):

```javascript
goongjs.accessToken = process.env.NEXT_PUBLIC_GOONG_MAP_KEY;

const map = new goongjs.Map({
  container: "map-container-id",
  style: "https://tiles.goong.io/assets/goong_map_web.json",
  center: [106.79990, 10.87900], // [lng, lat]
  zoom: 15.8,
  pitch: 45,
  bearing: -15,
});
```

### Adding Markers
```javascript
const el = document.createElement("div");
// ... customize marker element
const marker = new goongjs.Marker(el)
  .setLngLat([106.79920, 10.87920])
  .addTo(map);
```

### Adding Route Lines
```javascript
map.addSource("route-source", {
  type: "geojson",
  data: {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [[lng1, lat1], [lng2, lat2], ...]
    }
  }
});

map.addLayer({
  id: "route-layer",
  type: "line",
  source: "route-source",
  paint: {
    "line-color": "#ef4444",
    "line-width": 10,
    "line-opacity": 0.85
  }
});
```

## Documentation Links

- Goong REST API Docs: https://docs.goong.io/rest/place/
- Goong JS Integration Guide: https://help.goong.io/kb/website-javascrip-api/mapbox/tich-hop-mapbox-tren-nen-ban-do-goong-trong-web-site/
- Goong Maps: https://maps.goong.io/
