import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  translateTranscriptText,
  detectTranscriptLanguage,
  translateTranscriptBatchWithAI,
  SupportedTranscriptLocale,
} from '@/lib/i18n/transcript-translator';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { meetingId, targetLanguage = 'ar-TN' } = body;

    if (!meetingId) {
      return NextResponse.json({ success: false, error: 'Meeting ID is required' }, { status: 400 });
    }

    const adminDb = getSupabaseAdmin();

    // 1. Fetch transcript record
    const { data: transcript, error: txErr } = await adminDb
      .from('meeting_transcripts')
      .select('*')
      .eq('meeting_id', meetingId)
      .maybeSingle();

    if (txErr || !transcript) {
      return NextResponse.json({ success: false, error: 'Transcript not found for this meeting' }, { status: 404 });
    }

    // 2. Fetch all segments
    const { data: segments, error: segErr } = await adminDb
      .from('meeting_transcript_segments')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('sequence_number', { ascending: true });

    if (segErr || !segments || segments.length === 0) {
      return NextResponse.json({ success: false, error: 'No transcript segments found' }, { status: 404 });
    }

    // 3. Check which segments need AI batch translation for targetLanguage
    const missingTarget = segments.filter(
      (s) => !s.translations || !s.translations[targetLanguage]
    );

    let aiTranslatedMap: Record<string | number, string> = {};
    if (missingTarget.length > 0) {
      aiTranslatedMap = await translateTranscriptBatchWithAI(
        missingTarget.map((s) => ({
          id: s.id,
          text: s.content || s.text || '',
          speaker: s.speaker_label,
        })),
        targetLanguage as SupportedTranscriptLocale
      );
    }

    // 4. Update segments
    const updatedSegments = [];
    for (const seg of segments) {
      const origText = seg.content || seg.text || '';
      const currentTranslations = (seg.translations || {}) as Record<string, string>;
      const detected = detectTranscriptLanguage(origText);
      const isArabic = detected === 'ar-TN' || /[\u0600-\u06FF]/.test(origText);

      // Native speech preservation: if spoken in Tunisian Arabic, ar-TN is the original speech!
      const arTnText =
        currentTranslations['ar-TN'] ||
        (isArabic ? origText : (aiTranslatedMap[seg.id] && targetLanguage === 'ar-TN' ? aiTranslatedMap[seg.id] : translateTranscriptText(origText, 'ar-TN', detected)));

      const frText =
        currentTranslations['fr'] ||
        (detected === 'fr' ? origText : (aiTranslatedMap[seg.id] && targetLanguage === 'fr' ? aiTranslatedMap[seg.id] : translateTranscriptText(origText, 'fr', detected)));

      const enText =
        currentTranslations['en'] ||
        (detected === 'en' ? origText : (aiTranslatedMap[seg.id] && targetLanguage === 'en' ? aiTranslatedMap[seg.id] : translateTranscriptText(origText, 'en', detected)));

      const newTranslations = {
        ...currentTranslations,
        'ar-TN': arTnText,
        fr: frText,
        en: enText,
      };

      await adminDb
        .from('meeting_transcript_segments')
        .update({
          translations: newTranslations,
        })
        .eq('id', seg.id);

      updatedSegments.push({
        ...seg,
        translations: newTranslations,
      });
    }

    // 5. Update full transcript translations
    const txTranslations = (transcript.translations || {}) as Record<string, string>;
    txTranslations['ar-TN'] = updatedSegments
      .map((s) => `${s.speaker_name || s.speaker_label}: ${s.translations?.['ar-TN'] || s.content}`)
      .join('\n\n');
    txTranslations['fr'] = updatedSegments
      .map((s) => `${s.speaker_name || s.speaker_label}: ${s.translations?.['fr'] || s.content}`)
      .join('\n\n');
    txTranslations['en'] = updatedSegments
      .map((s) => `${s.speaker_name || s.speaker_label}: ${s.translations?.['en'] || s.content}`)
      .join('\n\n');

    await adminDb
      .from('meeting_transcripts')
      .update({
        translations: txTranslations,
      })
      .eq('id', transcript.id);

    return NextResponse.json({
      success: true,
      targetLanguage,
      segments: updatedSegments,
      translations: txTranslations,
    });
  } catch (err: any) {
    console.error('Failed to translate transcript:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Translation failed' }, { status: 500 });
  }
}
