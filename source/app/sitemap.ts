import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const rawUrl = process.env.NEXTAUTH_URL || "https://link.hcmute.edu.vn";
  const baseUrl = rawUrl.replace(/^["']|["']$/g, "");

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
