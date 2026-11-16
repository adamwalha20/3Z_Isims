# Meeting BaaS API v2 & AI Meeting Intelligence Setup Guide
**3ZERO Club ISIMS — Zero Exclusion Carbon Poverty**

This document describes how to configure, deploy, and verify the Meeting BaaS API v2 and AI Meeting Intelligence engine for the ZEC Campus Hub platform.

---

## 1. Architectural Overview

The meeting intelligence system operates as follows:

```
+-------------------+      +-------------------+      +-------------------------+
| Google Meet URL   | ---> | Meeting BaaS API  | ---> | ZEC Recorder Bot        |
| (Scheduled/Live)  |      | v2 (/v2/bots)     |      | (Joins & Captures)      |
+-------------------+      +-------------------+      +-------------------------+
                                                               |
                                                               v
+-------------------+      +-------------------+      +-------------------------+
| Meeting Detail UI | <--- | Supabase Database | <--- | Webhook / Pipeline      |
| & Task Review     |      | & Private Storage |      | (SVIX Cryptographic)    |
+-------------------+      +-------------------+      +-------------------------+
                                     ^
                                     |
                           +-------------------+
                           | OpenAI / Gemini   |
                           | 8-Dimension Model |
                           +-------------------+
```

---

## 2. Environment Variables Configuration

Ensure the following variables are configured in `.env.local` (local) and Vercel Project Settings (Production):

```env
# Meeting BaaS API v2 Configuration
MEETING_BAAS_API_KEY=your_meeting_baas_api_key_here
MEETING_BAAS_WEBHOOK_SECRET=your_meeting_baas_svix_secret_here

# AI Meeting Intelligence Provider (openai or gemini)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-your_openai_api_key_here
# Alternative: GEMINI_API_KEY=your_gemini_api_key_here

# Model Selection
AI_MODEL=gpt-4o-mini
# Alternative for Gemini: AI_MODEL=gemini-2.5-flash

# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=https://zplvfgfmurgghezoyjxh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Private Storage Bucket for Recordings
MEETING_RECORDINGS_BUCKET=meeting-recordings

# Site URL for Callbacks
NEXT_PUBLIC_SITE_URL=https://3-z-isims.vercel.app
```

---

## 3. Webhook Configuration in Meeting BaaS Dashboard

1. Log in to the [Meeting BaaS Dashboard](https://dashboard.meetingbaas.com/).
2. Navigate to **Webhooks** and click **Create Webhook Endpoint**.
3. Set the endpoint URL:
   ```
   https://3-z-isims.vercel.app/api/webhooks/meeting-baas
   ```
4. Subscribe to all bot lifecycle events:
   - `bot.status_change`
   - `complete`
   - `failed`
5. Copy the generated **Signing Secret** and assign it to `MEETING_BAAS_WEBHOOK_SECRET`.

---

## 4. Supabase Storage Setup

The system stores all MP4 recordings and audio feeds inside a private bucket called `meeting-recordings`.

To verify or create the bucket:
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'meeting-recordings',
  'meeting-recordings',
  false,
  524288000, -- 500MB
  ARRAY['video/mp4', 'video/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'application/json']
)
ON CONFLICT (id) DO NOTHING;
```

---

## 5. Security & Verification Rules

1. **SVIX Cryptographic Verification**: Every webhook payload is verified using `svix-id`, `svix-timestamp`, and `svix-signature`. Unsigned or tampered requests are immediately rejected with HTTP 400.
2. **Confidentiality & Access Control**: Only authenticated members of 3ZERO Club can view meeting details. Confidential meetings are strictly restricted to invited participants and executive bureau members.
3. **Private Video Playback**: Recording URLs are never published directly. The frontend calls `/api/meetings/recording/stream?meetingId=...` which returns a signed URL valid for 30 minutes.
4. **Anti-Hallucination Schema**: If the transcript does not explicitly name an assignee or deadline, the AI engine strictly outputs `"Unassigned"` and `"Not specified"`.
5. **Human-in-the-Loop Task Approval**: AI extracted action items remain in a pending review state. Only an organizer clicking "Confirm" creates an official ZEC Hub task.
