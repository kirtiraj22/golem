import { createHash } from "node:crypto";

import { badRequest } from "@/lib/errors";
import type { AssetMimeTypeDb } from "@/lib/db/database.types";

export type ImageInfo = {
  mime: AssetMimeTypeDb;
  extension: "jpg" | "png" | "webp";
  width: number | null;
  height: number | null;
  sha256Hex: string;
};

function jpegSize(buffer: Buffer): { width: number; height: number } | null {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    const isFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isFrame) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  return null;
}

function webpSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 30) return null;
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  if (chunk === "VP8 ") {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    const bits = buffer.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }
  return null;
}

export function inspectImage(buffer: Buffer): ImageInfo {
  const sha256Hex = createHash("sha256").update(buffer).digest("hex");

  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    const size = jpegSize(buffer);
    return {
      mime: "image/jpeg",
      extension: "jpg",
      width: size?.width ?? null,
      height: size?.height ?? null,
      sha256Hex,
    };
  }

  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(pngSignature)) {
    return {
      mime: "image/png",
      extension: "png",
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
      sha256Hex,
    };
  }

  if (
    buffer.length >= 16 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    const size = webpSize(buffer);
    return {
      mime: "image/webp",
      extension: "webp",
      width: size?.width ?? null,
      height: size?.height ?? null,
      sha256Hex,
    };
  }

  throw badRequest("File must be a JPEG, PNG or WebP image");
}