import { S3Client } from '@aws-sdk/client-s3';

const REGION = process.env.AWS_REGION;
export const BUCKET = process.env.S3_BUCKET;

// S3 client יחיד לכל האפליקציה
export const s3 = new S3Client({ region: REGION });