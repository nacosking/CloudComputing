import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

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

export async function listObjects(bucket: string, prefix = "") {
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
    MaxKeys: 100,
  });

  try {
    const resp = await s3.send(command);
    const items = (resp.Contents || []).map((o) => ({
      key: o.Key,
      size: o.Size,
      lastModified: o.LastModified,
    }));
    return items;
  } catch (error) {
    console.error("S3 ListObjects Error:", error);
    throw error;
  }
}