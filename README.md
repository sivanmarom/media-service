# NodeJS Media Service — AWS S3
![Node.js](https://img.shields.io/badge/node-%3E=18-green) 
![AWS S3](https://img.shields.io/badge/AWS-S3-blue?logo=amazon-aws) 
![AWS SDK v3](https://img.shields.io/badge/AWS%20SDK-v3-orange?logo=amazon-aws) 
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## Overview

This project is a **custom Node.js media management service** built without Express.  
It provides a minimal HTTP server that integrates directly with **AWS S3** (via the official **AWS SDK v3**) to handle file uploads, downloads, metadata (HEAD), updates, and deletions.  
The service supports **Presigned URLs** for large file uploads, includes **validation, logging, and error handling**, and is designed to showcase low-level Node.js skills (streams, routing, HTTP methods).

---

## Requirements
- Node.js (LTS recommended)
- npm or pnpm
- AWS Account with IAM user/role (least privilege)
- S3 Bucket created
- Git
- AWS SDK v3

---

## Setup

```bash
git clone https://github.com/sivanmarom/media-service.git
cd media-service
npm install

# Copy env example and fill in your AWS credentials + config
cp .env .env
```
Now edit .env and set values like:

```bash
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=your region
S3_BUCKET=your-bucket-name
PORT=3000
ALLOWED_CONTENT_TYPES=image/jpeg,image/png,application/pdf
MAX_UPLOAD_BYTES=52428800
```

Then start the server

```bash
node src/server.js
```

Server will run on `http://localhost:3000`.

---

## Project Structure
```
/src
  server.js              # HTTP server (no Express)
  router.js              # Simple router for methods & paths
  /controllers
    media.controller.js  # Business logic (CRUD for media)
  /services
    s3.service.js        # AWS S3 integration
.env                     # Example environment variables
.gitignore               # Ignore local/env files
README.md                # This file
```

---

## Environment Variables
```ini
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
S3_BUCKET=your-bucket
PORT=3000

# Validation
ALLOWED_CONTENT_TYPES=image/jpeg,image/png,application/pdf,video/mp4
MAX_UPLOAD_BYTES=52428800
```

---

## Design Decisions

### HTTP Methods
- **POST /media/presign** → Create (upload via presigned URL)  
- **GET /media/:key** → Read (download)  
- **PUT /media/:key** → Update (replace small file directly via server)  
- **DELETE /media/:key** → Delete  

### Metadata
- Passed via headers (`x-meta-*`) or in presigned request body  
- Stored directly in S3 object metadata

### Validation
- Allowlist of content types (from env)
- Max upload size (from env)
- JSON body validation for presigned requests

### Logging
- JSON structured logs for each action (upload, delete, list, error)
- Includes key, size, status, error, and timestamp

### Large Files
- Files over `MAX_UPLOAD_BYTES` → require **presigned URL upload** (client streams directly to S3)  
- Small files → direct upload handled by server

---

## Error Handling
| Status | Code                    | Meaning                                |
|--------|--------------------------|----------------------------------------|
| 400    | BAD_REQUEST              | Missing fields / invalid input         |
| 404    | NOT_FOUND                | File not found in S3                   |
| 405    | METHOD_NOT_ALLOWED       | Invalid HTTP method for route          |
| 413    | PAYLOAD_TOO_LARGE        | File exceeds `MAX_UPLOAD_BYTES`        |
| 415    | UNSUPPORTED_MEDIA_TYPE   | File type not in allowlist             |
| 500    | INTERNAL                 | Unexpected server error                |

---

## API Reference

### Health
`GET /health`  
→ `{ ok: true, data: { status: "ok" } }`

### List
`GET /media?prefix=media/2025/08`  
→ returns files under prefix

### Presign (Create / Update)
`POST /media/presign`  
Body:
```json
{
  "filename": "cat.jpg",
  "contentType": "image/jpeg",
  "metadata": { "source": "mobile" }
}
```

### Head (Metadata)
`GET /media/head/:key`

### Get (Download)
`GET /media/:key`

### Put (Update small file)
`PUT /media/:key`

### Delete
`DELETE /media/:key`

---

## Logging
All logs are structured JSON. Example:
```json
{
  "action": "UPLOAD",
  "key": "media/2025/08/file.jpg",
  "status": "success",
  "etag": ""9c46..."",
  "time": "2025-08-22T10:20:00Z"
}
```

---

## Security
- IAM policy limited to `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:ListBucket`
- Bucket name + region in `.env`
- Presigned URLs limited to 15 minutes by default

---

## Testing
provided full cURL examples covering:
- Health
- Create (presign + upload)
- Read
- Update (direct + presign)
- Delete
- Error cases (invalid JSON, too large, unsupported type, expired URL)

👉 See [`scripts/curl-examples.md`](scripts/curl-examples.md) for full commands + screenshots.

---

## Possible Improvements

This project was built to demonstrate *core Node.js + AWS S3 integration* without external frameworks.  
With more time, several improvements could be added:

- *Frontend UI*  
  Build a lightweight React/Next.js app to upload, list, preview, and delete files directly from the browser.  
  This would make the service much more user-friendly.

- *Automated Testing*  
  Add integration and unit tests (e.g., Jest + Supertest) to validate all endpoints automatically, instead of relying only on manual cURL commands.  

- *CI/CD Pipeline*  
  Use GitHub Actions to run tests on every commit, enforce linting/formatting, and deploy automatically to AWS (Elastic Beanstalk, ECS, or Lambda).  

- *Authentication & Authorization*  
  Secure endpoints with JWT tokens or AWS Cognito so that only authorized users can upload, update, or delete files.  

- *Database for Metadata*  
  Store extended metadata (beyond S3 object metadata) in DynamoDB or PostgreSQL to enable advanced queries and searching capabilities.  

---
