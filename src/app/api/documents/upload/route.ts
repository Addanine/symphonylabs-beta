import { type NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import {
  rateLimiter,
  RateLimitPresets,
} from "~/lib/security/rate-limiter";
import {
  logApiRequest,
  logRateLimitExceeded,
  logSecurityEvent,
  SecurityEventType,
} from "~/lib/security/logger";

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const clientId = rateLimiter.getClientId(request);

  try {
    // Rate limiting - moderate for document upload
    const rateLimit = rateLimiter.check(
      clientId,
      RateLimitPresets.ORDER_CREATE
    );

    if (!rateLimit.isAllowed) {
      logRateLimitExceeded(
        "/api/documents/upload",
        clientId,
        RateLimitPresets.ORDER_CREATE.maxRequests
      );
      return NextResponse.json(
        {
          error:
            "Too many upload attempts. Please wait before trying again.",
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(
              (rateLimit.resetTime - Date.now()) / 1000
            ).toString(),
          },
        }
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      logSecurityEvent(
        SecurityEventType.VALIDATION_ERROR,
        "Invalid file type uploaded",
        {
          clientId,
          fileType: file.type,
          fileName: file.name,
        }
      );
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.",
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      logSecurityEvent(
        SecurityEventType.VALIDATION_ERROR,
        "File size exceeds limit",
        {
          clientId,
          fileSize: file.size,
          fileName: file.name,
        }
      );
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Generate safe filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${timestamp}-${originalName}`;

    // Ensure documents directory exists
    const documentsDir = join(process.cwd(), "public", "documents");
    if (!existsSync(documentsDir)) {
      await mkdir(documentsDir, { recursive: true });
    }

    // Save file
    const filePath = join(documentsDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return public URL
    const publicUrl = `/documents/${fileName}`;

    logApiRequest(
      "POST",
      "/api/documents/upload",
      clientId,
      200,
      Date.now() - startTime,
      { fileName, fileSize: file.size }
    );

    return NextResponse.json(
      {
        url: publicUrl,
        fileName: file.name,
        size: file.size,
      },
      {
        headers: {
          "X-RateLimit-Limit":
            RateLimitPresets.ORDER_CREATE.maxRequests.toString(),
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        },
      }
    );
  } catch (error) {
    console.error("Error uploading document:", error);
    logSecurityEvent(SecurityEventType.API_ERROR, "Document upload error", {
      clientId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
