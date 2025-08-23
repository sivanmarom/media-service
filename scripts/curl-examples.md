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
-	key → The generated S3 key for the file
-	url → The presigned PUT URL to upload your file
-	expiresIn → Expiration time (seconds)

![presigned_url](https://github.com/user-attachments/assets/ead395bb-dc95-485d-90a5-a94733fc99a7)

---

## 3. Upload via Presigned URL
Upload the file directly to S3 using the `url` returned in step 2.

```bash
curl -i -X PUT   -H "Content-Type: image/jpeg"   --upload-file ./cat.jfif   "<url_from_step_2>"
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

![list](https://github.com/user-attachments/assets/f16a1d79-1deb-4bb9-8e2b-547c23cfd0cc)

---

## 7. Update via Presigned URL
Update (replace) a file with a new one using the same key.
You can also attach new metadata (optional) that will overwrite the old metadata stored in S3.
1.	Request presigned URL for the existing key (with optional metadata):

```bash
curl -s -X POST http://localhost:3000/media/presign \
  -H "Content-Type: application/json" \
  -d '{
    "key": "<key_from_step_2>",
    "contentType": "image/jpeg",
    "metadata": {
      "source": "update",
      "owner": "sivan"
      }
```

![update_via_presigned](https://github.com/user-attachments/assets/04534e4d-571d-49f7-b29c-4252d63b0e46)

2. Upload new file to the returned `url`:
```bash
curl -i -X PUT   -H "Content-Type: image/jpeg"   --upload-file ./mice.jpg   "<url_from_update_presign>"
```
![update_presigned](https://github.com/user-attachments/assets/d05e2e1b-0faf-44d0-bc99-48ff64cdcff2)

![update_metadata_presign](https://github.com/user-attachments/assets/07aa4350-7d8b-4e75-9adf-1e5338341c57)

---

## 8. Update via Server (Direct PUT)
For small files, upload directly through the server without presign.
You can also attach metadata by sending custom headers prefixed with x-meta-.

```bash
curl -i -X PUT \
  -H "Content-Type: image/jpeg" \
  -H "x-meta-source: direct-put" \
  -H "x-meta-owner: sivan" \
  --upload-file ./dog.jpg \
  http://localhost:3000/media/<key_from_step_2>
```

![update_via_server](https://github.com/user-attachments/assets/2f5859de-b172-4967-bfde-269c814b9978)

![update_server_metadata](https://github.com/user-attachments/assets/eb9f3018-8633-4496-84cb-2477d4bb02a0)

---

## 9. Delete
Remove the file from S3.

```bash
curl -i -X DELETE http://localhost:3000/media/<key_from_step_2>
```

![delete](https://github.com/user-attachments/assets/99a8ca35-62e0-4b0f-81eb-5b44457b0105)

---

## 10. Error Cases
Here are some example failures and how the service responds.
📌 Each error is also logged in the server logs in structured JSON (with action, key, status, reason, timestamp).


### ❌ File Not Found
(Requesting a file that does not exist in S3)
```bash
curl -i http://localhost:3000/media/not-here.jpg
```

![notfound](https://github.com/user-attachments/assets/abd30395-ba8a-4d31-a435-947d271e48e1)
![notfound2](https://github.com/user-attachments/assets/b859cf24-be87-45b6-ab96-23dae46b4be7)

---

### ❌ Unsupported Content-Type
(Uploading a file with a disallowed MIME type)
```bash
curl -i -X PUT   -H "Content-Type: application/zip"   --upload-file ./cat.jpg   http://localhost:3000/media/<key_from_step_2>
```

![unsupported](https://github.com/user-attachments/assets/76c0aa00-ce10-4c7a-bdc4-1534e67f437b)

---

### ❌ Payload Too Large
(Trying to upload a file larger than MAX_UPLOAD_BYTES)
```bash
curl -i -X PUT   -H "Content-Type: image/jpeg"   --upload-file ./huge_file.jpg   http://localhost:3000/media/<key_from_step_2>
```

![toobig](https://github.com/user-attachments/assets/e3674801-b7e7-486b-9aee-58ed2357906a)
![toobig2](https://github.com/user-attachments/assets/a2224d49-0971-4523-9ef1-226a510533ea)

---

### ❌ Invalid JSON for Presign
(Sending malformed JSON in the presign request)

```bash
curl -i -X POST http://localhost:3000/media/presign   -H "Content-Type: application/json"   -d '{"filename": "bad.json", "contentType": }'
```

![invalid_json](https://github.com/user-attachments/assets/e6d93f91-7210-4caf-b967-3f85e3ee01d7)
![invalidjson2](https://github.com/user-attachments/assets/d6ce723b-1237-438d-88d0-97ebce5271ef)

---

### ❌ Expired Presigned URL
(Trying to upload after the 15-minute expiration window)
```bash
curl -i -X PUT   -H "Content-Type: image/jpeg"   --upload-file ./cat.jpg   "<expired_url>"
```

![expired](https://github.com/user-attachments/assets/bb18b4ae-48ad-408a-92c7-e33461be9d91)

---

### ❌ Missing Content-Type
(Trying to upload without Content-Type header)
```bash
curl -i -X PUT \
  --upload-file ./cat.jpg \
  http://localhost:3000/media/<key_from_step_2>
```

![missing_content_type](https://github.com/user-attachments/assets/76e91d29-f2b1-46ac-888e-6ff799a62bb9)
![missing_ct](https://github.com/user-attachments/assets/13924938-6280-4a77-9e5e-feb2745681ab)

---

### ❌  Method Not Allowed
(Sending an unsupported HTTP method to a valid route)
```bash
curl -i -X PATCH http://localhost:3000/media/<key_from_step_2>
```

![methosnotallowd](https://github.com/user-attachments/assets/0c3e6731-94d7-4d67-afb6-940d01c5d6a8)

![mtdnotallowd](https://github.com/user-attachments/assets/bb75a9cd-c658-48a9-a1b3-0ed91a71a519)


---

### ❌  Route Does Not Exist
(Requesting a non-existent endpoint)
```bash
curl -i http://localhost:3000/does-not-exist
```
![rtnotfound](https://github.com/user-attachments/assets/72e76377-aba1-45a4-87dc-b852fe2997d9)

![routnotexist](https://github.com/user-attachments/assets/0e4d9d61-7cc4-4c46-a737-7a81290a9888)


