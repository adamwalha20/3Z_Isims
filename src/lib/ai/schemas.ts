import { z } from 'zod';

export const MeetingTopicSchema = z.object({
  title: z.string(),
  explanation: z.string(),
  key_points: z.array(z.string()),
  speakers: z.array(z.string()).default([]),
  timestamp_seconds: z.number().default(0),
});

export const MeetingDecisionSchema = z.object({
  title: z.string(),
  explanation: z.string(),
  evidence: z.string(),
  timestamp_seconds: z.number().default(0),
  status: z.enum(['confirmed', 'proposal', 'suggestion', 'unresolved']).default('confirmed'),
});

export const MeetingActionItemSchema = z.object({
  title: z.string(),
  description: z.string().default(''),
  suggested_assignee: z.string().default('Unassigned'),
  deadline: z.string().default('Not specified'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  related_topic: z.string().optional(),
  timestamp_seconds: z.number().default(0),
  evidence: z.string(),
});

export const MeetingAnalysisResultSchema = z.object({
  executive_summary: z.object({
    purpose: z.string(),
    main_topics: z.array(z.string()),
    key_outcomes: z.array(z.string()),
    conclusion: z.string(),
  }),
  overview: z.object({
    title: z.string(),
    date: z.string().optional(),
    duration_minutes: z.number().default(0),
    participants: z.array(z.string()).default([]),
    main_subjects: z.array(z.string()),
  }),
  topics: z.array(MeetingTopicSchema),
  decisions: z.array(MeetingDecisionSchema),
  action_items: z.array(MeetingActionItemSchema),
  important_notes: z.object({
    announcements: z.array(z.string()).default([]),
    risks_and_challenges: z.array(z.string()).default([]),
    unresolved_questions: z.array(z.string()).default([]),
  }),
  next_meeting: z.object({
    proposed_date: z.string().nullable().default(null),
    proposed_time: z.string().nullable().default(null),
    proposed_agenda: z.array(z.string()).default([]),
  }),
  meeting_quality: z.object({
    unclear_decisions: z.array(z.string()).default([]),
    missing_task_owners: z.array(z.string()).default([]),
    missing_deadlines: z.array(z.string()).default([]),
  }),
  detected_language: z.string().default('en'),
});

export type MeetingAnalysisResult = z.infer<typeof MeetingAnalysisResultSchema>;
