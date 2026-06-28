import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const rawUrl = process.env.NEXTAUTH_URL || "https://gosafe-smartcity.vercel.app/";
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
