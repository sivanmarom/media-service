# cURL Examples – Media Service

This file contains tested **cURL commands** for each endpoint of the media service.  
Each block includes a short explanation + the exact command you can run.

---

## 1. Health Check
Verify that the server is up and running.

```bash
curl -i http://localhost:3000/health
```

![health_check](https://github.com/user-attachments/assets/f3e1781d-9049-4161-8763-4de1b020652d)

---

## 2. Create – Get a Presigned URL
Request a presigned URL for uploading a new file.  
This returns a JSON with `"url"` (for uploading) and `"key"` (for referencing later).

```bash
curl -s -X POST http://localhost:3000/media/presign   -H "Content-Type: application/json"   -d '{"filename":"cat.jpg","contentType":"image/jpeg"}'
```

![presigned_url](https://github.com/user-attachments/assets/69e5fb5b-14d8-4dd8-8512-17d0fe4449f0)

---

## 3. Upload via Presigned URL
Upload the file directly to S3 using the `url` returned in step 2.

```bash
curl -i -X PUT   -H "Content-Type: image/jpeg"   --upload-file ./cat.jpg   "<url_from_step_2>"
```

![upload_via_presigned](https://github.com/user-attachments/assets/d3f8b24d-7c69-4141-ac1c-eae1b8656abc)

![upload_s3](https://github.com/user-attachments/assets/b6642276-f240-4f04-a446-20117a2eb0b9)

---

## 4. Read – Download a File
Fetch the uploaded file back from the server using the `key`.

```bash
curl -i http://localhost:3000/media/<key_from_step_2>
```

![read_file](https://github.com/user-attachments/assets/bb3c2e6f-2d22-455f-bde1-d667af773e57)

---

## 5. Metadata (HEAD)
Retrieve metadata about a file (content type, size, last modified, metadata).

```bash
curl -i http://localhost:3000/media/head/<key_from_step_2>
```

![read_metadata](https://github.com/user-attachments/assets/e3d83e5f-c104-4e3c-88c5-4075fbe92925)

![metadata_s3](https://github.com/user-attachments/assets/54b74ec6-98a6-45f8-ab37-8d7862108125)

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

![update_via_presigned](https://github.com/user-attachments/assets/04534e4d-571d-49f7-b29c-4252d63b0e46)

2. Upload new file to the returned `url`:
```bash
curl -i -X PUT   -H "Content-Type: image/jpeg"   --upload-file ./mice.jpg   "<url_from_update_presign>"
```
![update_presigned](https://github.com/user-attachments/assets/d05e2e1b-0faf-44d0-bc99-48ff64cdcff2)

![update_metadata_presign](https://github.com/user-attachments/assets/07aa4350-7d8b-4e75-9adf-1e5338341c57)

![update_presign_s3](https://github.com/user-attachments/assets/7068674e-0d62-43ce-81a1-d86dc7103217)

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
