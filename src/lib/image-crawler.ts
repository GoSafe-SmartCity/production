/**
 * Google Images Crawler Utility
 * Performs a search request to Google Images and parses thumbnail URLs.
 */
export async function crawlGoogleImage(category: string): Promise<string> {
    const queries: Record<string, string> = {
        FLOODING: "ngập lụt đường phố Sài Gòn ảnh thực tế",
        DEBRIS: "chướng ngại vật trên đường giao thông Việt Nam",
        POTHOLES: "ổ gà trên đường giao thông Việt Nam",
        ACCIDENT: "tai nạn giao thông thực tế đường bộ"
    };

    const query = queries[category.toUpperCase()] || "đường phố Việt Nam";
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`;

    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
            }
        });

        if (res.ok) {
            const html = await res.text();
            // Find gstatic image search thumbnail URLs
            const matches = html.match(/https:\/\/encrypted-tbn0.gstatic.com\/images\?q=tbn:[^"'\s]+/g);
            if (matches && matches.length > 0) {
                // Return a random one from the first 5 results to keep it dynamic and fresh
                const randomIdx = Math.floor(Math.random() * Math.min(5, matches.length));
                return matches[randomIdx];
            }
        }
    } catch (e) {
        console.error("Google image crawl failed, falling back:", e);
    }

    // High quality fallbacks from Unsplash if crawling fails or gets blocked
    const fallbacks: Record<string, string> = {
        FLOODING: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80",
        DEBRIS: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80",
        POTHOLES: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80",
        ACCIDENT: "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=600&q=80"
    };

    return fallbacks[category.toUpperCase()] || "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=600&q=80";
}
