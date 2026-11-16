# AI Meeting Intelligence Workflow Specification
**3ZERO Club ISIMS — Zero Exclusion Carbon Poverty**

This document specifies the end-to-end operational pipeline for intelligent meeting capture, transcription, diarization, AI summarization, decision registration, and task creation.

---

## 1. Complete Workflow Lifecycle

```
[Organizer: Schedule Meeting]
         │
         ▼
[Dispatch Bot (Meeting BaaS v2)] ───► Bot enters Google Meet room as "ZEC Hub Recorder"
         │
         ▼
[Session Ends] ─────────────────────► Webhook triggered with SVIX signature
         │
         ▼
[Webhook Handler: /api/webhooks/meeting-baas]
         │
         ├─► Validates cryptographic SVIX headers (`svix-id`, `svix-timestamp`, `svix-signature`)
         ├─► Enforces idempotency via `meeting_webhook_events`
         └─► Queues asynchronous processing job (`meeting_processing_jobs`)
         │
         ▼
[Pipeline Execution: executeMeetingProcessingPipeline]
         │
         ├─► Downloads video & audio artifacts into private Supabase bucket `meeting-recordings`
         ├─► Normalizes JSON transcription from Meeting BaaS v2 schema (`output_transcription.json`)
         ├─► Ingests diarized segments into `meeting_transcript_segments`
         │
         ▼
[AI Analysis: analyzeMeetingTranscript]
         │
         ├─► Passes transcript to OpenAI (gpt-4o-mini) or Gemini (gemini-2.5-flash)
         ├─► Enforces strict Zod JSON schema across 8 structured dimensions:
         │   1. Executive Summary (purpose, topics, outcomes, conclusion)
         │   2. Meeting Overview (duration, attendees, subjects)
         │   3. Key Topics (explanation, speakers, timestamps)
         │   4. Decisions Made (rationale, evidence, status)
         │   5. Action Items (task, unassigned/assignee, deadline, priority)
         │   6. Important Notes (announcements, risks, unresolved)
         │   7. Next Meeting Agenda (proposed date, subjects)
         │   8. Meeting Quality & Follow-ups (missing owners, deadlines)
         │
         ▼
[Data Persistence & Realtime Notification]
         │
         ├─► Stores structured analysis in `meeting_summaries`
         ├─► Seeds proposed decisions in `meeting_decisions`
         ├─► Seeds action items in `meeting_action_items` (Status: `pending_review`)
         └─► Emits in-app notification to organizer: "AI Summary Ready"
         │
         ▼
[Organizer Review & Hub Task Creation]
         │
         ├─► Organizer navigates to `/meetings/[id]` -> "Decisions & Tasks"
         ├─► Selects member assignee from registered club roster
         └─► Clicks "Confirm & Create Hub Task"
                 │
                 ▼
         Official task created in `tasks` table with XP and notifications!
```

---

## 2. Anti-Hallucination Guardrails

To preserve strict institutional integrity:
- **Zero Inferred Assignees**: If a participant did not explicitly accept or receive a task assignment during the meeting, the AI model sets `suggested_assignee: "Unassigned"`.
- **Zero Inferred Deadlines**: If a date was not verbally committed to, the AI model sets `deadline: "Not specified"`.
- **Diarization Attribution**: Every utterance links to its speaker and exact timestamp in seconds. Clicking any sentence in the **Smart Transcript** instantly seeks the private video player to that moment.

---

## 3. Trilingual Support

AI summaries and transcripts support:
1. **English (`en`)**
2. **French (`fr`)**
3. **Tunisian Arabic (`ar-TN`)** in authentic Arabic script.

Organizers can toggle summary language directly in the UI or request dynamic regeneration.
