export type CompressedImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
  targetBytes?: number;
  minQuality?: number;
};

const DEFAULT_OPTIONS: Required<CompressedImageOptions> = {
  maxWidth: 1600,
  maxHeight: 1600,
  targetBytes: 450 * 1024,
  minQuality: 0.55
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read selected image"));
    };

    image.src = objectUrl;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Image compression failed"));
          return;
        }

        resolve(blob);
      },
      type,
      quality
    );
  });
}

export async function compressImageFile(file: File, options?: CompressedImageOptions): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selected file is not an image");
  }

  const settings = { ...DEFAULT_OPTIONS, ...(options ?? {}) };
  const image = await loadImage(file);

  const ratio = Math.min(settings.maxWidth / image.width, settings.maxHeight / image.height, 1);
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Image compression is not supported in this browser");
  }

  context.drawImage(image, 0, 0, width, height);

  let quality = 0.86;
  let compressedBlob = await toBlob(canvas, "image/webp", quality);

  while (compressedBlob.size > settings.targetBytes && quality > settings.minQuality) {
    quality = Math.max(settings.minQuality, quality - 0.07);
    compressedBlob = await toBlob(canvas, "image/webp", quality);
  }

  const originalName = file.name.replace(/\.[^.]+$/, "");
  const compressedName = `${originalName}.webp`;

  return new File([compressedBlob], compressedName, {
    type: "image/webp",
    lastModified: Date.now()
  });
}
