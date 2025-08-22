import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,   
  GetObjectCommand,  
  DeleteObjectCommand,
  HeadObjectCommand   //
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'; 

// region +bucket come from env vars
const REGION = process.env.AWS_REGION;
export const BUCKET = process.env.S3_BUCKET;

// create S3 client
export const s3 = new S3Client({ region: REGION });

// list objects 
export async function listObjects(prefix, maxKeys = 100) {
  const res = await s3.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix || undefined,
    MaxKeys: maxKeys,
  }));
  return res.Contents || [];
}

// generate presigned PUT URL  (client can upload directly to S3)
export async function createPresignedPutUrl({ key, contentType, metadata = {}, expiresIn = 900 }) {
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    Metadata: metadata, 
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn }); 
  return { url, key, expiresIn };
}

// get object
export async function getObject(key) {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return s3.send(cmd); 
}

// head object - just metadata
export async function headObject(key) {
  const cmd = new HeadObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  const res = await s3.send(cmd);
  return {
    contentType: res.ContentType,
    size: res.ContentLength,
    lastModified: res.LastModified,
    metadata: res.Metadata || {}
  };
}

//delete file by key
export async function deleteObject(key) {
  const cmd = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  await s3.send(cmd); 
}

// upload file via server
export async function putObjectStream({ key, body, contentType, metadata = {} }) {
  const upload = new Upload({
    client: s3,
    params: { Bucket: BUCKET, Key: key, Body: body, ContentType: contentType, Metadata: metadata },
  });
  const out = await upload.done();
  return { etag: out.ETag };
}