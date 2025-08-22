import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,   
  GetObjectCommand,  
  DeleteObjectCommand,
  HeadObjectCommand   //
} from '@aws-sdk/client-s3';

import { getSignedUrl } from '@aws-sdk/s3-request-presigner'; 

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

export async function createPresignedPutUrl({ key, contentType, metadata = {}, expiresIn = 900 }) {
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    Metadata: metadata, // x-amz-meta-*
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn }); // שניות
  return { url, key, expiresIn };
}


export async function getObject(key) {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return s3.send(cmd); 
}