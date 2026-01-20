# Video Intelligence SaaS

AI-powered video sentiment and emotion analysis platform. Upload videos and get instant insights into emotional content, sentiment distribution, and escalation risk.

## Features

- **Clerk Authentication** - Secure user authentication with social logins
- **Video Upload** - Drag-and-drop video upload to Supabase Storage
- **AI Analysis** - Transcription with Whisper + emotion/sentiment classification
- **Real-time Progress** - Job status updates via callbacks
- **Beautiful Dashboard** - Modern UI with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Auth**: Clerk
- **Database**: PostgreSQL (Supabase) + Prisma ORM
- **Storage**: Supabase Storage
- **AI Worker**: Modal (serverless GPU)
- **ML Models**: Faster-Whisper, Custom BERT classifier

## Setup

### 1. Environment Variables

Create a `.env` file in `apps/web/`:

```env
# Database
DATABASE_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# Modal Worker
MODAL_URL="https://your-modal-app.modal.run"
NEXT_PUBLIC_APP_URL="http://localhost:3000"  # or your deployed URL

# Worker Authentication
WORKER_SHARED_SECRET="your-secret-key"
```

### 2. Clerk Setup

1. Create an account at [clerk.com](https://clerk.com)
2. Create a new application
3. Copy the publishable key and secret key to your `.env`
4. Configure sign-in/sign-up URLs in Clerk dashboard

### 3. Database Setup

```bash
cd apps/web
npx prisma migrate dev
npx prisma generate
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
apps/web/
├── src/
│   ├── app/
│   │   ├── (dashboard)/        # Protected dashboard routes
│   │   │   └── dashboard/
│   │   │       ├── page.tsx        # Main dashboard
│   │   │       ├── upload/         # Video upload
│   │   │       ├── jobs/           # Job list & details
│   │   │       ├── analytics/      # Analytics page
│   │   │       └── settings/       # User settings
│   │   ├── api/
│   │   │   ├── jobs/           # Job management APIs
│   │   │   ├── media/          # Upload URL generation
│   │   │   └── worker/         # Modal worker callbacks
│   │   ├── sign-in/            # Clerk sign-in
│   │   ├── sign-up/            # Clerk sign-up
│   │   └── page.tsx            # Landing page
│   ├── server/
│   │   ├── auth.ts             # Clerk auth helpers
│   │   ├── db.ts               # Prisma client
│   │   └── supabase.ts         # Supabase admin client
│   ├── lib/
│   │   └── utils.ts            # Utility functions
│   └── middleware.ts           # Clerk middleware
├── prisma/
│   └── schema.prisma           # Database schema
└── package.json

apps/worker-modal/
├── inference_api.py            # Modal worker with FastAPI
└── modal_app.py
```

## API Routes

### Internal Routes (Clerk Auth)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/media/upload-url` | POST | Get signed upload URL |
| `/api/jobs/analyze` | POST | Trigger video analysis |
| `/api/jobs/[jobId]` | GET | Get job status |
| `/api/api-keys` | GET/POST/DELETE | Manage API keys |
| `/api/worker/job-update` | POST | Worker callback for status |
| `/api/worker/signed-download` | POST | Worker callback for video URL |

### Public API (API Key Auth)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/v1/analyze` | POST | Submit video for analysis |
| `/api/v1/jobs/[jobId]` | GET | Get job status and results |

## REST API Documentation

The VideoIntel API allows you to programmatically analyze videos for emotions and sentiment.

### Authentication

All API requests require an API key passed in the `Authorization` header:

```
Authorization: Bearer vi_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Generate API keys from the dashboard at `/dashboard/api-keys`.

### Base URL

- **Local**: `http://localhost:3000`
- **Production**: `https://your-app.vercel.app`

### Endpoints

#### POST /api/v1/analyze

Submit a video for analysis.

**Request Body:**

```json
{
  "videoUrl": "https://example.com/video.mp4",
  "mimeType": "video/mp4",
  "webhookUrl": "https://your-server.com/webhook"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `videoUrl` | string | Yes* | Public URL to video file |
| `videoBase64` | string | Yes* | Base64 encoded video |
| `mimeType` | string | No | Video MIME type (default: video/mp4) |
| `webhookUrl` | string | No | URL to receive completion webhook |

*Either `videoUrl` or `videoBase64` is required.

**Response:**

```json
{
  "success": true,
  "jobId": "clxxxxxxxxxx",
  "status": "QUEUED",
  "message": "Video analysis job created successfully",
  "statusUrl": "/api/v1/jobs/clxxxxxxxxxx"
}
```

#### GET /api/v1/jobs/{jobId}

Get job status and results.

**Response (Processing):**

```json
{
  "jobId": "clxxxxxxxxxx",
  "status": "RUNNING",
  "progress": 45,
  "createdAt": "2024-01-20T10:00:00.000Z",
  "updatedAt": "2024-01-20T10:01:00.000Z",
  "error": null,
  "results": null
}
```

**Response (Completed):**

```json
{
  "jobId": "clxxxxxxxxxx",
  "status": "SUCCEEDED",
  "progress": 100,
  "results": {
    "dominant_emotion": "neutral",
    "dominant_sentiment": "positive",
    "escalation_risk": 0.15,
    "emotion_distribution": {
      "neutral": 0.45,
      "happy": 0.30,
      "sad": 0.10,
      "angry": 0.05,
      "fear": 0.05,
      "disgust": 0.03,
      "surprise": 0.02
    },
    "sentiment_distribution": {
      "positive": 0.55,
      "neutral": 0.35,
      "negative": 0.10
    },
    "utterances": [
      {
        "start": 0.0,
        "end": 2.5,
        "text": "Hello, how can I help you today?",
        "emotion": "neutral",
        "sentiment": "positive"
      }
    ]
  }
}
```

### Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad request (validation error) |
| 401 | Invalid or missing API key |
| 404 | Job not found |
| 500 | Internal server error |

### Job Statuses

| Status | Description |
|--------|-------------|
| `QUEUED` | Job is waiting to be processed |
| `RUNNING` | Job is currently being processed |
| `SUCCEEDED` | Job completed successfully |
| `FAILED` | Job failed with an error |

### Example: curl

```bash
# Submit video for analysis
curl -X POST https://your-app.vercel.app/api/v1/analyze \
  -H "Authorization: Bearer vi_xxxxxxxx_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"videoUrl": "https://example.com/video.mp4"}'

# Check job status
curl https://your-app.vercel.app/api/v1/jobs/YOUR_JOB_ID \
  -H "Authorization: Bearer vi_xxxxxxxx_your_api_key"
```

### Example: Python

```python
import requests
import time

API_KEY = "vi_xxxxxxxx_your_api_key"
BASE_URL = "https://your-app.vercel.app"

# Submit video
response = requests.post(
    f"{BASE_URL}/api/v1/analyze",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={"videoUrl": "https://example.com/video.mp4"}
)
job_id = response.json()["jobId"]

# Poll for results
while True:
    status = requests.get(
        f"{BASE_URL}/api/v1/jobs/{job_id}",
        headers={"Authorization": f"Bearer {API_KEY}"}
    ).json()
    
    if status["status"] in ["SUCCEEDED", "FAILED"]:
        print(status["results"])
        break
    
    time.sleep(5)
```

### Example: JavaScript

```javascript
const API_KEY = 'vi_xxxxxxxx_your_api_key';
const BASE_URL = 'https://your-app.vercel.app';

// Submit video
const { jobId } = await fetch(`${BASE_URL}/api/v1/analyze`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ videoUrl: 'https://example.com/video.mp4' }),
}).then(r => r.json());

// Poll for results
const pollStatus = async () => {
  const status = await fetch(`${BASE_URL}/api/v1/jobs/${jobId}`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  }).then(r => r.json());
  
  if (status.status === 'SUCCEEDED') {
    console.log(status.results);
  } else if (status.status === 'FAILED') {
    console.error(status.error);
  } else {
    setTimeout(pollStatus, 5000);
  }
};
pollStatus();
```

## Deployment

### Vercel (Frontend)

1. Connect your GitHub repo to Vercel
2. Add environment variables
3. Deploy

### Modal (Worker)

```bash
cd apps/worker-modal
modal deploy inference_api.py
```

