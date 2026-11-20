# VIDLUXE PRO Gateway

Node.js + Express backend gateway. Use only with videos you own or have permission to download.

## Deploy
1. Push these files to a GitHub repository.
2. Deploy that repository as a Node service on Railway.
3. In Railway → service → Variables, add `YOINKU_API_KEY` with your own key.
4. Redeploy. Railway provides `PORT`; the code falls back to 8080 for local testing.

## Routes
- `GET /health` — server and API-key configuration status.
- `GET /api/info?url=VIDEO_URL` — returns available formats.
- `GET /api/download?url=VIDEO_URL&format=FORMAT_ID` — returns a temporary download URL.

Call `/api/info` first. Use an exact `formats[].id` value from its response for the download route.

## Blogger frontend
Set your gateway base URL to the Railway public domain:
- `/api/info?url=${encodeURIComponent(videoUrl)}`
- `/api/download?url=${encodeURIComponent(videoUrl)}&format=${encodeURIComponent(formatId)}`

Never put your Yoinku API key in public Blogger HTML or JavaScript. Store it only in Railway Variables.
