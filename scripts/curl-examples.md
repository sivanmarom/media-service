# cURL Examples – Media Service

This file contains tested **cURL commands** for each endpoint of the media service.  
Each block includes a short explanation + the exact command you can run.

---

## 1. Health Check
Verify that the server is up and running.

```bash
curl -i http://localhost:3000/health
```

---

## 2. Create – Get a Presigned URL
Request a presigned URL for uploading a new file.
This returns a JSON with "url" (for uploading) and "key" (for referencing later).
You can also pass optional "metadata" that will be stored in S3 along with the object.

```bash
curl -s -X POST http://localhost:3000/media/presign \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "cat.jpg",
    "contentType": "image/jpeg",
    "metadata": {
      "source": "cli",
      "owner": "sivan"
    }
  }'
```
📌 Response includes:
	•	key → The generated S3 key for the file
	•	url → The presigned PUT URL…
---

## 3. Upload via Presigned URL
Upload the file directly to S3 using the `url` returned in step 2.

```bash
curl -i -X PUT   -H "Content-Type: image/jpeg"   --upload-file ./cat.jpg   "<url_from_step_2>"
```

---

## 4. Read – Download a File
Fetch the uploaded file back from the server using the `key`.

```bash
curl -i http://localhost:3000/media/<key_from_step_2>
```

---

## 5. Metadata (HEAD)
Retrieve metadata about a file (content type, size, last modified, metadata).

```bash
curl -i http://localhost:3000/media/head/<key_from_step_2>
```

---

## 6. List Files
List all files under the given prefix.

```bash
curl -i "http://localhost:3000/media?prefix=media/2025/08"
```

---

## 7. Update via Presigned URL
Update (replace) a file with a new one using the same `key`.

1. Request presigned URL for the existing key:
```bash
curl -s -X POST http://localhost:3000/media/presign   -H "Content-Type: application/json"   -d '{"key":"<key_from_step_2>","contentType":"image/jpeg"}'
```

2. Upload new file to the returned `url`:
```bash
curl -i -X PUT   -H "Content-Type: image/jpeg"   --upload-file ./mice.jpg   "<url_from_update_presign>"
```

---

## 8. Update via Server (Direct PUT)
For small files, upload directly through the server without presign.

```bash
curl -i -X PUT   -H "Content-Type: image/jpeg"   --upload-file ./dog.jpg   http://localhost:3000/media/<key_from_step_2>
```

---

## 9. Delete
Remove the file from S3.

```bash
curl -i -X DELETE http://localhost:3000/media/<key_from_step_2>
```

---

## 10. Error Cases

### ❌ File Not Found
```bash
curl -i http://localhost:3000/media/not-here.jpg
```

### ❌ Unsupported Content-Type
```bash
curl -i -X PUT   -H "Content-Type: application/zip"   --upload-file ./cat.jpg   http://localhost:3000/media/<key_from_step_2>
```

### ❌ Payload Too Large
(if you have a file larger than `MAX_UPLOAD_BYTES`)
```bash
curl -i -X PUT   -H "Content-Type: image/jpeg"   --upload-file ./huge_file.jpg   http://localhost:3000/media/<key_from_step_2>
```

### ❌ Invalid JSON for Presign
```bash
curl -i -X POST http://localhost:3000/media/presign   -H "Content-Type: application/json"   -d '{"filename": "bad.json", "contentType": }'
```

### ❌ Expired Presigned URL
(wait 15 minutes, then try:)
```bash
curl -i -X PUT   -H "Content-Type: image/jpeg"   --upload-file ./cat.jpg   "<expired_url>"
```
