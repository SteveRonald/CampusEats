import { compressImageFile } from "@/lib/imageCompression";

type UploadCategory = "menu-items" | "vendor-logos" | "vendor-location-proof";

type UploadResult = {
  url: string;
  size: number;
};

function resolveApiUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }

  return "http://localhost:4000";
}

function getAuthToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("campuseats_token");
}

function sanitizeFilename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export async function uploadCompressedImage(
  file: File,
  category: UploadCategory,
  resourceId: string
): Promise<UploadResult> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Please login again to upload images.");
  }

  const compressed = await compressImageFile(file);
  const baseName = sanitizeFilename(compressed.name || "image.webp");

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Failed to encode image payload"));
        return;
      }

      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("Failed to read compressed image"));
    reader.readAsDataURL(compressed);
  });

  const response = await fetch(`${resolveApiUrl()}/api/uploads/image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      category,
      resourceId,
      fileName: baseName,
      dataUrl
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || "Failed to upload image to storage");
  }

  const payload = await response.json().catch(() => ({}));
  return {
    url: payload.url,
    size: typeof payload.size === "number" ? payload.size : compressed.size
  };
}
