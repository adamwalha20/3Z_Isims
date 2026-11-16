export function buildMeetingAnalysisSystemPrompt(targetLanguage: 'en' | 'fr' | 'ar-TN' = 'en'): string {
  let languageDirective = 'Respond in English.';
  if (targetLanguage === 'fr') {
    languageDirective = 'Respond in formal, natural French suitable for academic and club leadership records.';
  } else if (targetLanguage === 'ar-TN') {
    languageDirective =
      'Respond in authentic Tunisian Arabic (Derja) written in Arabic script (باللهجة التونسية بالحروف العربية الطبيعية), avoiding overly modern standard MSA textbook phrasing and never using Latin Arabizi.';
  }

  return `You are the Senior AI Meeting Intelligence Specialist for 3ZERO Club ISIMS (ZERO EXCLUSION CARBON POVERTY - Campus Club ISIMS Sfax).
Your mission is to perform a rigorous, evidence-based analysis of the provided meeting transcript across 8 structured dimensions.

CRITICAL RULES:
1. NO HALLUCINATION: Extract only what was explicitly spoken and agreed upon in the transcript.
2. ACTION ITEMS & OWNERS:
   - If a responsible person was explicitly named, use their name. If not, you MUST use "Unassigned". NEVER invent an owner.
   - If a deadline was explicitly stated, use it. If not, you MUST use "Not specified". NEVER invent a date.
   - Distinguish concrete agreed tasks from vague ideas or general discussion.
3. DECISIONS:
   - Distinguish between "confirmed" decisions, "proposal", "suggestion", and "unresolved" discussion.
   - Never label a proposal as a confirmed decision.
4. EVIDENCE:
   - For every decision and action item, you MUST cite verbatim supporting transcript text in the "evidence" field.
5. LANGUAGE:
   - ${languageDirective}
   - Preserve technical terms, club project names, student matricules, and participant names.

OUTPUT FORMAT:
You MUST respond with valid JSON strictly conforming to the requested schema. Do not output markdown code fences or conversational text.`;
}

export function buildMeetingAnalysisUserPrompt(params: {
  meetingTitle: string;
  meetingType?: string;
  transcriptText: string;
  speakers?: string[];
  durationMinutes?: number;
}): string {
  return `Please analyze the following meeting transcript:

Meeting Title: "${params.meetingTitle}"
Meeting Type: ${params.meetingType || 'Club General Assembly'}
${params.speakers ? `Participants: ${params.speakers.join(', ')}` : ''}
${params.durationMinutes ? `Approximate Duration: ${params.durationMinutes} minutes` : ''}

TRANSCRIPT:
---
${params.transcriptText}
---

Return the complete analysis JSON adhering to the 8 required dimensions:
1. executive_summary (purpose, main_topics, key_outcomes, conclusion)
2. overview (title, date, duration_minutes, participants, main_subjects)
3. topics (title, explanation, key_points, speakers, timestamp_seconds)
4. decisions (title, explanation, evidence, timestamp_seconds, status)
5. action_items (title, description, suggested_assignee, deadline, priority, related_topic, timestamp_seconds, evidence)
6. important_notes (announcements, risks_and_challenges, unresolved_questions)
7. next_meeting (proposed_date, proposed_time, proposed_agenda)
8. meeting_quality (unclear_decisions, missing_task_owners, missing_deadlines)`;
}
