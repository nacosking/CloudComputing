import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// This picks up the credentials automatically from the EC2 Instance Role
const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

export async function uploadToS3(bucket: string, key: string, body: Buffer) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
  });

  try {
    await s3.send(command);
    console.log(`Successfully uploaded ${key} to ${bucket}`);
    return `https://${bucket}.s3.amazonaws.com/${key}`;
  } catch (error) {
    console.error("S3 Upload Error:", error);
    throw error;
  }
}