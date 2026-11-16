import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

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
    const {
      itemType, // 'decision' | 'action_item'
      itemId,
      action, // 'approve' | 'reject' | 'edit'
      updates = {},
      createOfficialTask = false,
    } = body;

    if (!itemType || !itemId) {
      return NextResponse.json({ success: false, error: 'itemType and itemId are required' }, { status: 400 });
    }

    const adminDb = getSupabaseAdmin();

    // 1. Fetch item & meeting
    let meetingId: string | null = null;
    let existingItem: any = null;

    if (itemType === 'decision') {
      const { data: dec } = await adminDb
        .from('meeting_decisions')
        .select('*, meeting:meetings(id, title, organizer_id, created_by)')
        .eq('id', itemId)
        .single();
      existingItem = dec;
      meetingId = dec?.meeting_id;
    } else {
      const { data: act } = await adminDb
        .from('meeting_action_items')
        .select('*, meeting:meetings(id, title, organizer_id, created_by, department_id)')
        .eq('id', itemId)
        .single();
      existingItem = act;
      meetingId = act?.meeting_id;
    }

    if (!existingItem || !meetingId) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }

    // 2. Permission check: Admin, Bureau, or Meeting Organizer
    const isSuperAdmin = (user.email?.toLowerCase() || '') === 'adamwalha20@gmail.com';
    const isOrganizer =
      existingItem.meeting?.organizer_id === user.id || existingItem.meeting?.created_by === user.id;

    const { data: roleRecords } = await supabase
      .from('user_roles')
      .select('roles(key)')
      .eq('user_id', user.id);
    const isBureauOrAdmin =
      isSuperAdmin ||
      isOrganizer ||
      roleRecords?.some((r: any) => ['admin', 'bureau'].includes(r.roles?.key));

    if (!isBureauOrAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Only organizers and bureau officers can review AI extractions.' },
        { status: 403 }
      );
    }

    // 3. Process Decision Review
    if (itemType === 'decision') {
      const reviewStatus = action === 'reject' ? 'rejected' : action === 'approve' ? 'approved' : existingItem.review_status;

      const updateData: any = {
        title: updates.title || existingItem.title,
        description: updates.description !== undefined ? updates.description : existingItem.description,
        decision_type: updates.decision_type || existingItem.decision_type,
        review_status: updates.review_status || reviewStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: updatedDec, error: updateErr } = await adminDb
        .from('meeting_decisions')
        .update(updateData)
        .eq('id', itemId)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        item: updatedDec,
        message: `Decision marked as ${updateData.review_status}.`,
      });
    }

    // 4. Process Action Item Review
    const reviewStatus = action === 'reject' ? 'rejected' : action === 'approve' ? 'approved' : existingItem.review_status;

    let createdTaskId = existingItem.created_task_id;
    let officialTaskRecord: any = null;

    // 5. Official Task Creation (if approved or requested, and not already created)
    if (createOfficialTask && !createdTaskId) {
      const taskTitle = updates.title || existingItem.title;
      const taskDesc =
        updates.description ||
        existingItem.description ||
        `Action item agreed upon during meeting "${existingItem.meeting?.title || 'Club Meeting'}".\n\nEvidence quote: "${existingItem.evidence || 'Spoken in session'}"`;
      const taskPriority = updates.priority || existingItem.priority || 'medium';
      const taskDue = updates.deadline || (existingItem.deadline && existingItem.deadline !== 'Not specified' ? existingItem.deadline : null);
      const assigneeId = updates.confirmed_assignee_id || existingItem.confirmed_assignee_id || user.id;

      // Insert official task into public.tasks
      const { data: newTask, error: taskErr } = await adminDb
        .from('tasks')
        .insert({
          title: taskTitle,
          description: taskDesc,
          status: 'todo',
          priority: taskPriority,
          creator_id: user.id,
          due_at: taskDue,
          department_id: existingItem.meeting?.department_id || null,
          requires_verification: true,
          xp_awarded: false,
        })
        .select()
        .single();

      if (taskErr) {
        return NextResponse.json({ success: false, error: `Failed to create official task: ${taskErr.message}` }, { status: 500 });
      }

      createdTaskId = newTask.id;
      officialTaskRecord = newTask;

      // Link in public.task_assignees
      if (assigneeId) {
        await adminDb.from('task_assignees').insert({
          task_id: newTask.id,
          user_id: assigneeId,
          assigned_by: user.id,
        });

        // Send in-app notification to assignee
        if (assigneeId !== user.id) {
          await adminDb.from('notifications').insert({
            recipient_user_id: assigneeId,
            recipient_id: assigneeId,
            type: 'task_assigned',
            title: `Task Assigned: ${taskTitle}`,
            description: `You have been assigned an official task from meeting "${existingItem.meeting?.title}".`,
            body: `You have been assigned an official task from meeting "${existingItem.meeting?.title}".`,
            category: 'tasks',
            priority: taskPriority === 'urgent' || taskPriority === 'high' ? 'high' : 'normal',
            destination_url: '/tasks',
            related_entity_type: 'tasks',
            related_entity_id: newTask.id,
            is_read: false,
          });
        }
      }
    }

    const actionItemUpdates: any = {
      title: updates.title || existingItem.title,
      description: updates.description !== undefined ? updates.description : existingItem.description,
      suggested_assignee: updates.suggested_assignee || existingItem.suggested_assignee,
      confirmed_assignee_id: updates.confirmed_assignee_id || existingItem.confirmed_assignee_id,
      deadline: updates.deadline || existingItem.deadline,
      priority: updates.priority || existingItem.priority,
      review_status: createOfficialTask ? 'approved' : (updates.review_status || reviewStatus),
      created_task_id: createdTaskId,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: updatedAct, error: actErr } = await adminDb
      .from('meeting_action_items')
      .update(actionItemUpdates)
      .eq('id', itemId)
      .select()
      .single();

    if (actErr) {
      return NextResponse.json({ success: false, error: actErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      item: updatedAct,
      task: officialTaskRecord,
      message: createOfficialTask
        ? 'Official ZEC task created and assigned successfully.'
        : `Action item marked as ${actionItemUpdates.review_status}.`,
    });
  } catch (err: any) {
    console.error('Review action failed:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Review operation failed' },
      { status: 500 }
    );
  }
}
