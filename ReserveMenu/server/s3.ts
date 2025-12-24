import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const REGION = process.env.AWS_REGION || "us-east-1";
const BUCKET = process.env.S3_BUCKET_NAME || "";

const s3 = new S3Client({ region: REGION });

export async function uploadQrImageToS3(imageBuffer: Buffer, contentType: string): Promise<string> {
    const key = `qr-images/${uuidv4()}.png`;
    const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: imageBuffer,
        ContentType: contentType,
        ACL: "public-read"
    });
    await s3.send(command);
    return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}
