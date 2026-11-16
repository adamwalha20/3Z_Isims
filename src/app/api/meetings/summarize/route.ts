import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { analyzeMeetingTranscript } from '@/lib/ai/meeting-analysis';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const meetingId = body.meetingId || body.meeting_id;
    const targetLanguage = (body.language || body.targetLanguage || 'en') as 'en' | 'fr' | 'ar-TN';

    if (!meetingId) {
      return NextResponse.json({ success: false, error: 'Missing meetingId' }, { status: 400 });
    }

    const adminDb = getSupabaseAdmin();

    // 1. Fetch meeting
    const { data: meeting, error: meetErr } = await adminDb
      .from('meetings')
      .select('*, organizer:profiles!meetings_organizer_id_fkey(id, email, full_name, preferred_language)')
      .eq('id', meetingId)
      .single();

    if (meetErr || !meeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });
    }

    // 2. Fetch transcript
    let transcriptText = body.transcriptText || body.full_text || '';
    let transcriptId: string | null = null;
    let detectedLanguage = 'en';

    if (!transcriptText) {
      const { data: tx } = await adminDb
        .from('meeting_transcripts')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tx) {
        transcriptText = tx.full_text || tx.content || '';
        transcriptId = tx.id;
        detectedLanguage = tx.original_language || tx.language || 'en';
      }
    }

    if (!transcriptText || transcriptText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'No transcript text is available to analyze for this meeting.' },
        { status: 400 }
      );
    }

    // 3. Execute AI Meeting Analysis
    const aiResponse = await analyzeMeetingTranscript({
      meetingTitle: meeting.title,
      meetingType: meeting.meeting_type,
      transcriptText,
      targetLanguage,
    });

    const analysis = aiResponse.analysis;

    // 4. Transform for legacy compatibility format
    const summaryContentForLegacy = {
      overview: analysis.executive_summary.purpose,
      key_topics: analysis.topics.map((t: any) => t.title),
      important_updates: analysis.important_notes.announcements,
      decisions: analysis.decisions.map((d: any) => d.title),
      challenges: analysis.important_notes.risks_and_challenges,
      questions: analysis.important_notes.unresolved_questions,
      action_items: analysis.action_items.map((a: any) => ({
        title: a.title,
        task: a.title,
        assignee: a.suggested_assignee,
        deadline: a.deadline,
        transcript_timestamp: `${Math.floor(a.timestamp_seconds / 60)}:${String(Math.floor(a.timestamp_seconds % 60)).padStart(2, '0')}`,
      })),
      next_steps: analysis.next_meeting.proposed_agenda,
    };

    // 5. Save structured summary in Supabase
    const { data: summaryRecord, error: sumErr } = await adminDb
      .from('meeting_summaries')
      .upsert(
        {
          meeting_id: meetingId,
          transcript_id: transcriptId,
          summary_content: summaryContentForLegacy,
          summary_json: analysis,
          original_language: detectedLanguage,
          summary_language: targetLanguage,
          ai_provider: aiResponse.provider,
          ai_model: aiResponse.model,
          processing_status: 'completed',
          review_status: 'pending',
          generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'meeting_id' }
      )
      .select()
      .single();

    if (sumErr) {
      console.error('Error saving summary record:', sumErr);
    }

    const summaryId = summaryRecord?.id;

    // 6. Refresh pending decisions and action items
    if (summaryId) {
      await adminDb
        .from('meeting_decisions')
        .delete()
        .eq('meeting_id', meetingId)
        .eq('review_status', 'pending');

      await adminDb
        .from('meeting_action_items')
        .delete()
        .eq('meeting_id', meetingId)
        .eq('review_status', 'pending');

      if (analysis.decisions.length > 0) {
        const decisionRows = analysis.decisions.map((d: any) => ({
          meeting_id: meetingId,
          summary_id: summaryId,
          title: d.title,
          description: d.explanation,
          evidence: d.evidence,
          source_timestamp: d.timestamp_seconds,
          decision_type: d.status,
          review_status: 'pending',
        }));
        await adminDb.from('meeting_decisions').insert(decisionRows);
      }

      if (analysis.action_items.length > 0) {
        const actionRows = analysis.action_items.map((a: any) => ({
          meeting_id: meetingId,
          summary_id: summaryId,
          title: a.title,
          description: a.description,
          suggested_assignee: a.suggested_assignee,
          deadline: a.deadline && a.deadline !== 'Not specified' ? a.deadline : null,
          priority: a.priority,
          evidence: a.evidence,
          source_timestamp: a.timestamp_seconds,
          review_status: 'pending',
        }));
        await adminDb.from('meeting_action_items').insert(actionRows);
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        meeting_id: meetingId,
        content: summaryContentForLegacy,
        summary_json: analysis,
        review_status: 'pending',
        ai_provider: aiResponse.provider,
        ai_model: aiResponse.model,
      },
      message: `AI Meeting Summary successfully generated across 8 dimensions in ${targetLanguage.toUpperCase()}.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal summarization error';
    console.error('Summarization route failed:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
