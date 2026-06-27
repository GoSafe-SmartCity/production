export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeUrl(url: string): string {
  // Add https:// if no protocol specified
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return "https://" + url;
  }
  return url;
}

export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  error?: string;
}

export function validateUrl(url: string): UrlValidationResult {
  if (!url || url.trim() === "") {
    return { valid: false, error: "URL không được để trống" };
  }

  const normalized = normalizeUrl(url.trim());

  if (!isValidUrl(normalized)) {
    return { valid: false, error: "URL không hợp lệ" };
  }

  // Check URL length (max 2048 characters is standard)
  if (normalized.length > 2048) {
    return { valid: false, error: "URL quá dài (tối đa 2048 ký tự)" };
  }

  return { valid: true, normalizedUrl: normalized };
}

export function validateShortCode(code: string): { valid: boolean; error?: string } {
  if (!code || code.trim() === "") {
    return { valid: true }; // Empty is valid (will auto-generate)
  }

  const trimmed = code.trim();

  if (trimmed.length < 3) {
    return { valid: false, error: "Mã rút gọn phải có ít nhất 3 ký tự" };
  }

  if (trimmed.length > 20) {
    return { valid: false, error: "Mã rút gọn tối đa 20 ký tự" };
  }

  // Allow uppercase, lowercase, numbers, dashes and underscores
  if (!/^[a-zA-Z0-9-_]+$/.test(trimmed)) {
    return { 
      valid: false, 
      error: "Mã rút gọn chỉ được chứa chữ cái, số, dấu gạch ngang và gạch dưới" 
    };
  }

  // Reserved words (case insensitive)
  const reserved = ["api", "admin", "login", "logout", "auth", "dashboard", "settings"];
  if (reserved.includes(trimmed.toLowerCase())) {
    return { valid: false, error: "Mã rút gọn này đã được đặt trước" };
  }

  return { valid: true };
}
