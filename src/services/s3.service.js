import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const REGION = process.env.AWS_REGION;
export const BUCKET = process.env.S3_BUCKET;
export const s3 = new S3Client({ region: REGION });

export async function listObjects(prefix, maxKeys = 100) {
  const res = await s3.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix || undefined,
    MaxKeys: maxKeys,
  }));
  return res.Contents || [];
}