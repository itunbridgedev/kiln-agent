import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import crypto from "crypto";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET = process.env.AWS_S3_BUCKET || "";

function generateKey(
  studioId: number,
  projectId: number,
  filename: string
): string {
  const ext = filename.split(".").pop() || "jpg";
  const uuid = crypto.randomUUID();
  return `studios/${studioId}/projects/${projectId}/${uuid}.${ext}`;
}

function getPublicUrl(key: string): string {
  return `https://${BUCKET}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;
}

export async function uploadImage(
  file: { buffer: Buffer; originalname: string; mimetype: string },
  studioId: number,
  projectId: number
): Promise<{ url: string; key: string }> {
  const key = generateKey(studioId, projectId, file.originalname);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  return { url: getPublicUrl(key), key };
}

export async function deleteImage(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}
