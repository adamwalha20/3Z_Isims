'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Profile,
  GlobalRoleKey,
  Task,
  Project,
  EventItem,
  Meeting,
  MeetingAction,
  MeetingRecording,
  MeetingTranscript,
  MeetingTranscriptSegment,
  MeetingSummary,
  MeetingSummaryContent,
  MeetingRecordingJob,
  TaskPriority,
  Announcement,
  NotificationItem,
  DocumentItem,
  Department,
  AuditLog,
  BureauPositionKey,
  FinancialTransaction,
  Budget,
  Partner,
  MarketingCampaign,
  SustainabilityInitiative,
  Decision,
  RecruitmentApplication,
  MemberXp,
  XpTransaction,
  XpRule,
  MemberAchievement,
} from '@/types/database.types';
import {
  INITIAL_USER,
  INITIAL_TASKS,
  INITIAL_PROJECTS,
  INITIAL_EVENTS,
  INITIAL_MEETINGS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_DOCUMENTS,
  INITIAL_DEPARTMENTS,
  INITIAL_MEMBERS,
  INITIAL_AUDIT_LOGS,
  OFFICIAL_BUREAU_MEMBERS,
  INITIAL_FINANCIAL_TRANSACTIONS,
  INITIAL_BUDGETS,
  INITIAL_PARTNERS,
  INITIAL_MARKETING_CAMPAIGNS,
  INITIAL_SUSTAINABILITY_INITIATIVES,
  INITIAL_DECISIONS,
  INITIAL_RECRUITMENT_APPLICATIONS,
  INITIAL_MEMBER_XP,
  INITIAL_XP_RULES,
  INITIAL_XP_TRANSACTIONS,
  INITIAL_MEMBER_ACHIEVEMENTS,
  BureauMemberAssignment,
} from '@/lib/mock-data';
import { createClient } from '@/lib/supabase/client';

export type ActiveRole = 'admin' | 'bureau' | 'lead' | 'member';
export type ActiveBureauPosition = 'all' | BureauPositionKey;

const isUuid = (id?: string | null): boolean =>
  typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

interface AuthContextType {
  user: Profile | null;
  activeRole: ActiveRole;
  setActiveRole: (role: ActiveRole) => void;
  activeBureauPosition: ActiveBureauPosition;
  setActiveBureauPosition: (pos: ActiveBureauPosition) => void;
  userBureauPositions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isLiveSupabase: boolean;
  isAdmin: boolean;

  // Data store state
  tasks: Task[];
  projects: Project[];
  events: EventItem[];
  meetings: Meeting[];
  announcements: Announcement[];
  notifications: NotificationItem[];
  documents: DocumentItem[];
  departments: Department[];
  members: Profile[];
  auditLogs: AuditLog[];

  // XP & Member Ranking Architecture
  memberXpList: MemberXp[];
  currentUserXp: MemberXp | null;
  xpTransactions: XpTransaction[];
  xpRules: XpRule[];
  userAchievements: MemberAchievement[];

  // Role-Specific Bureau Workspaces
  bureauMembers: BureauMemberAssignment[];
  transactions: FinancialTransaction[];
  budgets: Budget[];
  partners: Partner[];
  campaigns: MarketingCampaign[];
  initiatives: SustainabilityInitiative[];
  decisions: Decision[];
  recruitmentApps: RecruitmentApplication[];

  // Core interactive mutations
  toggleTaskDone: (taskId: string) => void;
  submitTaskForVerification: (taskId: string) => Promise<{ success: boolean; status?: string; error?: string }>;
  verifyTask: (taskId: string, approved: boolean, reason?: string) => Promise<{ success: boolean; status?: string; points?: number; error?: string }>;
  adminAdjustXp: (userId: string, points: number, reason: string) => Promise<{ success: boolean; error?: string }>;
  updateXpRule: (ruleId: string, points: number, isActive: boolean, requiresVerification: boolean) => Promise<{ success: boolean; error?: string }>;
  refreshXpData: () => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  addProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => void;
  registerEvent: (eventId: string) => void;
  toggleChecklistItem: (eventId: string, itemIndex: number) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'created_at'>) => void;
  addDocument: (doc: Omit<DocumentItem, 'id' | 'created_at' | 'updated_at'>) => void;
  addMeeting: (meeting: Omit<Meeting, 'id' | 'created_at' | 'updated_at'>) => Promise<{ success: boolean; meeting?: Meeting; error?: string }>;
  updateMeeting: (meetingId: string, updates: Partial<Meeting>) => Promise<{ success: boolean; error?: string }>;
  addMeetingRecording: (meetingId: string, recording: Omit<MeetingRecording, 'id' | 'created_at'>) => Promise<{ success: boolean; recording?: MeetingRecording; error?: string }>;
  addMeetingTranscript: (meetingId: string, transcript: Omit<MeetingTranscript, 'id' | 'created_at' | 'updated_at'>) => Promise<{ success: boolean; error?: string }>;
  updateMeetingSummary: (
    meetingId: string,
    summaryContent: MeetingSummaryContent,
    approve?: boolean | 'draft' | 'approved' | 'rejected',
    notes?: string
  ) => Promise<{ success: boolean; error?: string }>;
  createTaskFromMeetingAction: (
    meetingId: string,
    actionItem: {
      title?: string;
      task?: string;
      description?: string;
      responsible?: string;
      assignee?: string;
      assigned_user_id?: string;
      due_at?: string;
      deadline?: string;
      priority?: TaskPriority;
    }
  ) => Promise<{ success: boolean; task?: Task; error?: string }>;
  dispatchMeetingRecordingBot: (meetingId: string) => Promise<{ success: boolean; status?: string; message?: string; error?: string }>;

  // Role-Specific Workspaces mutations
  addTransaction: (tx: Omit<FinancialTransaction, 'id' | 'created_at' | 'updated_at'>) => void;
  approveTransaction: (id: string, status: 'approved' | 'rejected') => void;
  addBudget: (bgt: Omit<Budget, 'id' | 'created_at'>) => void;
  addPartner: (partner: Omit<Partner, 'id' | 'created_at' | 'updated_at'>) => void;
  updatePartnerStage: (id: string, stage: Partner['pipeline_stage']) => void;
  addCampaign: (camp: Omit<MarketingCampaign, 'id' | 'created_at' | 'updated_at'>) => void;
  updateCampaignStatus: (id: string, status: MarketingCampaign['status']) => void;
  addInitiative: (init: Omit<SustainabilityInitiative, 'id' | 'created_at' | 'updated_at'>) => void;
  updateInitiativeProgress: (id: string, current: number) => void;
  addDecision: (dec: Omit<Decision, 'id' | 'decided_at'>) => void;
  updateApplicationStatus: (id: string, status: RecruitmentApplication['status'], notes?: string) => void;
  assignBureauPosition: (positionKey: string, userIdOrName: string, memberName?: string) => Promise<{ success: boolean; error?: string }>;
  setUserRole: (userId: string, roleKey: 'admin' | 'bureau' | 'member') => Promise<{ success: boolean; error?: string }>;

  // Approval & Profile Management
  isApproved: boolean;
  approveMembership: (userId: string) => Promise<{ success: boolean; error?: string }>;
  rejectMembership: (userId: string) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (updates: {
    fullName?: string;
    studentId?: string;
    studyField?: string;
    bio?: string;
    skills?: string[];
    avatarPath?: string;
    contactPreferences?: { email: boolean; in_app: boolean };
  }) => Promise<{ success: boolean; error?: string }>;
  uploadAvatar: (file: File) => Promise<{ success: boolean; url?: string; error?: string }>;

  // Onboarding state
  needsOnboarding: boolean;
  setNeedsOnboarding: (val: boolean) => void;
  updateProfileOnboarding: (data: {
    studentId: string;
    studyField: string;
    skills: string[];
    interestedDepartmentId?: string;
    bio?: string;
  }) => Promise<{ success: boolean; error?: string }>;

  // Auth operations
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signUp: (data: {
    fullName: string;
    email: string;
    password: string;
    studentId: string;
    studyField: string;
    skills?: string[];
    departmentId?: string;
    bio?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [activeRole, setActiveRole] = useState<ActiveRole>('bureau');
  const [activeBureauPosition, setActiveBureauPosition] = useState<ActiveBureauPosition>('all');
  const [userBureauPositions, setUserBureauPositions] = useState<string[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLiveSupabase, setIsLiveSupabase] = useState<boolean>(false);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false);

  // Core data store
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [events, setEvents] = useState<EventItem[]>(INITIAL_EVENTS);
  const [meetings, setMeetings] = useState<Meeting[]>(INITIAL_MEETINGS);
  const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [documents, setDocuments] = useState<DocumentItem[]>(INITIAL_DOCUMENTS);
  const [departments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [members, setMembers] = useState<Profile[]>(INITIAL_MEMBERS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);

  // XP & Member Ranking state
  const [memberXpList, setMemberXpList] = useState<MemberXp[]>(INITIAL_MEMBER_XP);
  const [xpTransactions, setXpTransactions] = useState<XpTransaction[]>(INITIAL_XP_TRANSACTIONS);
  const [xpRules, setXpRules] = useState<XpRule[]>(INITIAL_XP_RULES);
  const [userAchievements, setUserAchievements] = useState<MemberAchievement[]>(() =>
    INITIAL_MEMBER_ACHIEVEMENTS.filter((a) => a.user_id === INITIAL_USER.id)
  );

  // Role-Specific Workspaces state
  const [bureauMembers, setBureauMembers] = useState<BureauMemberAssignment[]>(OFFICIAL_BUREAU_MEMBERS);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(INITIAL_FINANCIAL_TRANSACTIONS);
  const [budgets, setBudgets] = useState<Budget[]>(INITIAL_BUDGETS);
  const [partners, setPartners] = useState<Partner[]>(INITIAL_PARTNERS);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>(INITIAL_MARKETING_CAMPAIGNS);
  const [initiatives, setInitiatives] = useState<SustainabilityInitiative[]>(INITIAL_SUSTAINABILITY_INITIATIVES);
  const [decisions, setDecisions] = useState<Decision[]>(INITIAL_DECISIONS);
  const [recruitmentApps, setRecruitmentApps] = useState<RecruitmentApplication[]>(INITIAL_RECRUITMENT_APPLICATIONS);

  const currentUserXp = memberXpList.find((mxp) => mxp.user_id === user?.id) || {
    user_id: user?.id || 'usr-default',
    total_xp: 0,
    completed_tasks_count: 0,
    updated_at: '2026-01-01T00:00:00.000Z',
  };

  const loadUserData = async () => {
    const supabase = createClient();
    if (!supabase) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setIsAuthenticated(true);

        // 1. Fetch user profile and membership
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const { data: userMembership } = await supabase
          .from('club_memberships')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        const currentEmail = session.user.email || profile?.email || '';
        const isAdam = currentEmail.toLowerCase() === 'adamwalha20@gmail.com';

        const approved = isAdam || userMembership?.membership_status === 'active';
        setIsApproved(approved);

        if (!userMembership) {
          await supabase.from('club_memberships').insert({
            user_id: session.user.id,
            membership_status: isAdam ? 'active' : 'pending',
          });
        }

        if (profile) {
          setUser({
            ...INITIAL_USER,
            ...profile,
            email: currentEmail,
            membership: userMembership || {
              id: `mem-${session.user.id}`,
              user_id: session.user.id,
              membership_status: isAdam ? 'active' : 'pending',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          });

          if (!profile.student_id || !profile.study_field || !profile.skills || (profile.skills as string[]).length === 0) {
            setNeedsOnboarding(true);
          }
        }

        // 2. Fetch user's assigned role
        let assignedRole: ActiveRole = 'member';
        if (isAdam) {
          assignedRole = 'admin';
        } else {
          const { data: roleRecords } = await supabase
            .from('user_roles')
            .select('role_id, roles(key, display_name)')
            .eq('user_id', session.user.id);

          if (roleRecords && roleRecords.length > 0) {
            const roleKey = (roleRecords[0].roles as any)?.key;
            if (roleKey === 'admin') assignedRole = 'admin';
            else if (roleKey === 'bureau') assignedRole = 'bureau';
            else assignedRole = 'member';
          }
        }
        setActiveRole(assignedRole);

        // 3. Fetch user's functional bureau positions
        const { data: userPosData } = await supabase
          .from('user_bureau_positions')
          .select('position_id, bureau_positions(key, display_name)')
          .eq('user_id', session.user.id);

        const myPositions: string[] = (userPosData || [])
          .map((p: any) => p.bureau_positions?.key)
          .filter(Boolean);
        setUserBureauPositions(myPositions);

        if (assignedRole === 'bureau' && myPositions.length > 0) {
          setActiveBureauPosition(myPositions[0] as any);
        } else if (assignedRole === 'admin') {
          setActiveBureauPosition('all');
        }

        // 4. Fetch user's achievements
        const { data: dbAch } = await supabase
          .from('member_achievements')
          .select('*')
          .eq('user_id', session.user.id);
        if (dbAch && dbAch.length > 0) {
          setUserAchievements(dbAch);
        } else {
          setUserAchievements([]);
        }

        // 5. Fetch user's notifications
        const { data: dbNotifs } = await supabase
          .from('notifications')
          .select('*')
          .eq('recipient_id', session.user.id)
          .order('created_at', { ascending: false });
        if (dbNotifs && dbNotifs.length > 0) {
          setNotifications(dbNotifs);
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setUserAchievements(INITIAL_MEMBER_ACHIEVEMENTS.filter((a) => a.user_id === INITIAL_USER.id));
      }

      // 6. Fetch club-wide profiles & memberships
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: allMemberships } = await supabase
        .from('club_memberships')
        .select('*');

      if (allProfiles && allProfiles.length > 0) {
        const { data: allRoles } = await supabase
          .from('user_roles')
          .select('user_id, roles(key, display_name)');

        const formatted: Profile[] = allProfiles.map((p) => {
          const userRole = allRoles?.find((r) => r.user_id === p.id);
          const rKey = (userRole?.roles as any)?.key || 'member';
          const mem = allMemberships?.find((m) => m.user_id === p.id);
          return {
            ...p,
            roles: [{ id: `role-${rKey}`, key: rKey, display_name: rKey.toUpperCase() }],
            membership: mem || {
              id: `mem-${p.id}`,
              user_id: p.id,
              membership_status: p.email?.toLowerCase() === 'adamwalha20@gmail.com' ? 'active' : 'pending',
              created_at: p.created_at,
              updated_at: p.updated_at,
            },
          };
        });
        setMembers(formatted);
      }

      // 7. Fetch all bureau positions & assigned officers
      const { data: posData } = await supabase
        .from('bureau_positions')
        .select(`
          id, key, display_name, description,
          user_bureau_positions (
            user_id,
            profiles!user_bureau_positions_user_id_fkey ( id, full_name, avatar_path, student_id )
          )
        `);

      if (posData && posData.length > 0) {
        const mappedBureau: BureauMemberAssignment[] = posData.map((bp: any) => {
          const assignment = bp.user_bureau_positions?.[0];
          const assignedProfile = assignment?.profiles;
          return {
            position_key: bp.key,
            position_name: bp.display_name,
            member_name: assignedProfile?.full_name || 'Unassigned',
            avatar: assignedProfile?.avatar_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
            department: bp.display_name,
            email: assignedProfile ? `${assignedProfile.full_name.toLowerCase().replace(/\s+/g, '.')}@isims.tn` : 'bureau@isims.tn',
          };
        });
        setBureauMembers(mappedBureau);
      }

      // 8. Fetch live tasks with assignees
      const { data: dbTasks } = await supabase
        .from('tasks')
        .select(`
          *,
          department:departments(*),
          project:projects(*),
          creator:profiles!tasks_creator_id_fkey(*),
          task_assignees(user_id, profiles(*))
        `)
        .order('created_at', { ascending: false });

      if (dbTasks && dbTasks.length > 0) {
        const mappedTasks: Task[] = dbTasks.map((t: any) => ({
          ...t,
          assignees: t.task_assignees?.map((ta: any) => ta.profiles).filter(Boolean) || [],
        }));
        setTasks(mappedTasks);
      }

      // 9. Fetch XP leaderboard data
      const { data: dbXp } = await supabase
        .from('member_xp')
        .select('*, profile:profiles(*)')
        .order('total_xp', { ascending: false });
      if (dbXp && dbXp.length > 0) {
        setMemberXpList(dbXp);
      }

      // 10. Fetch XP rules
      const { data: dbRules } = await supabase
        .from('xp_rules')
        .select('*')
        .order('points', { ascending: true });
      if (dbRules && dbRules.length > 0) {
        setXpRules(dbRules);
      }

      // 11. Fetch XP transactions
      const { data: dbTx } = await supabase
        .from('xp_transactions')
        .select('*, user:profiles!xp_transactions_user_id_fkey(*)')
        .order('created_at', { ascending: false });
      if (dbTx && dbTx.length > 0) {
        setXpTransactions(dbTx);
      }

      // 12. Fetch live meetings with recordings, transcripts, summaries & action items
      const { data: dbMeetings } = await supabase
        .from('meetings')
        .select(`
          *,
          organizer:profiles!meetings_organizer_id_fkey(*),
          department:departments(*),
          recordings:meeting_recordings(*),
          transcripts:meeting_transcripts(*, segments:meeting_transcript_segments(*)),
          summaries:meeting_summaries(*),
          action_items:meeting_actions(*)
        `)
        .order('starts_at', { ascending: false });

      if (dbMeetings && dbMeetings.length > 0) {
        const mappedMeetings: Meeting[] = dbMeetings.map((m: any) => ({
          ...m,
          recordings: m.recordings || [],
          transcript: m.transcripts?.[0] || null,
          summary: m.summaries?.[0] || null,
          action_items: m.action_items || [],
        }));
        setMeetings(mappedMeetings);
      }
    } catch (err) {
      console.error('Error fetching Supabase auth, tasks & XP data:', err);
    }
  };

  // Check Supabase client initialization & load data
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setUser(INITIAL_USER);
      setIsAuthenticated(true);
      setIsApproved(true);
      return;
    }

    setIsLiveSupabase(true);
    loadUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        loadUserData();
      } else {
        setIsAuthenticated(false);
        setIsApproved(false);
        setUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const refreshXpData = async () => {
    await loadUserData();
  };

  // Member Task Submission RPC
  const submitTaskForVerification = async (taskId: string): Promise<{ success: boolean; status?: string; error?: string }> => {
    if (isLiveSupabase && isUuid(taskId)) {
      const supabase = createClient();
      if (supabase) {
        try {
          const { data, error } = await supabase.rpc('submit_task_for_verification', { p_task_id: taskId });
          if (!error) {
            await loadUserData();
            return { success: true, status: data?.status };
          }
          console.warn('submit_task_for_verification failed on live db, updating locally:', error.message);
        } catch (e: any) {
          console.warn('submit_task_for_verification RPC error:', e?.message);
        }
      }
    }

    // Mock fallback
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            status: 'waiting_verification',
            updated_at: new Date().toISOString(),
          };
        }
        return t;
      })
    );
    return { success: true, status: 'waiting_verification' };
  };

  // Task Verification Review RPC (Bureau Officers & Admins)
  const verifyTask = async (
    taskId: string,
    approved: boolean,
    reason?: string
  ): Promise<{ success: boolean; status?: string; points?: number; error?: string }> => {
    if (isLiveSupabase && isUuid(taskId)) {
      const supabase = createClient();
      if (supabase) {
        try {
          const { data, error } = await supabase.rpc('verify_task', {
            p_task_id: taskId,
            p_approved: approved,
            p_rejection_reason: reason || null,
          });
          if (!error) {
            await loadUserData();
            return { success: true, status: data?.status, points: data?.points_awarded };
          }
          console.warn('verify_task failed on live db, updating locally:', error.message);
        } catch (e: any) {
          console.warn('verify_task RPC error:', e?.message);
        }
      }
    }

    // Mock fallback
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            status: approved ? 'done' : 'todo',
            completed_at: approved ? new Date().toISOString() : null,
            verified_by: user?.id || null,
            verified_at: approved ? new Date().toISOString() : null,
            rejection_reason: approved ? null : (reason || 'Verification rejected'),
            xp_awarded: approved,
            updated_at: new Date().toISOString(),
          };
        }
        return t;
      })
    );

    if (approved) {
      const taskObj = tasks.find((t) => t.id === taskId);
      const points = taskObj?.priority === 'urgent' || taskObj?.priority === 'high' ? 20 : 10;
      const targetUserId = taskObj?.creator_id || user?.id || 'usr-default';
      setMemberXpList((prev) =>
        prev.map((m) =>
          m.user_id === targetUserId
            ? { ...m, total_xp: m.total_xp + points, completed_tasks_count: m.completed_tasks_count + 1 }
            : m
        )
      );
      setXpTransactions((prev) => [
        {
          id: `tx-${Date.now()}`,
          user_id: targetUserId,
          points,
          reason: `Verified task completion: ${taskObj?.title || 'Task'}`,
          source_type: 'task',
          source_id: taskId,
          idempotency_key: `task_${taskId}_${targetUserId}_${Date.now()}`,
          awarded_by: user?.id,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
    return { success: true, status: approved ? 'done' : 'todo' };
  };

  // Admin Manual XP Adjustment RPC
  const adminAdjustXp = async (
    userId: string,
    points: number,
    reason: string
  ): Promise<{ success: boolean; error?: string }> => {
    const isUserAdmin = user?.email?.toLowerCase() === 'adamwalha20@gmail.com' || activeRole === 'admin';
    if (!isUserAdmin) {
      return { success: false, error: 'Unauthorized: Only administrators can adjust XP.' };
    }

    if (isLiveSupabase && isUuid(userId)) {
      const supabase = createClient();
      if (supabase) {
        try {
          const { error } = await supabase.rpc('admin_adjust_xp', {
            p_user_id: userId,
            p_points: points,
            p_reason: reason,
          });
          if (!error) {
            await loadUserData();
            return { success: true };
          }
          console.warn('admin_adjust_xp failed on live db, updating locally:', error.message);
        } catch (e: any) {
          console.warn('admin_adjust_xp RPC error:', e?.message);
        }
      }
    }

    // Mock fallback
    setMemberXpList((prev) => {
      const existing = prev.find((m) => m.user_id === userId);
      if (existing) {
        return prev.map((m) =>
          m.user_id === userId ? { ...m, total_xp: Math.max(0, m.total_xp + points) } : m
        );
      }
      return [
        ...prev,
        {
          user_id: userId,
          total_xp: Math.max(0, points),
          completed_tasks_count: 0,
          updated_at: new Date().toISOString(),
        },
      ];
    });

    setXpTransactions((prev) => [
      {
        id: `tx-adj-${Date.now()}`,
        user_id: userId,
        points,
        reason: `Admin Adjustment: ${reason}`,
        source_type: 'adjustment',
        idempotency_key: `adj_${Date.now()}_${Math.random()}`,
        awarded_by: user?.id,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);

    return { success: true };
  };

  // XP Rule Modification (Admin Only)
  const updateXpRule = async (
    ruleId: string,
    points: number,
    isActive: boolean,
    requiresVerification: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    const isUserAdmin = user?.email?.toLowerCase() === 'adamwalha20@gmail.com' || activeRole === 'admin';
    if (!isUserAdmin) {
      return { success: false, error: 'Unauthorized: Only administrators can configure XP rules.' };
    }

    if (isLiveSupabase && isUuid(ruleId)) {
      const supabase = createClient();
      if (supabase) {
        try {
          const { error } = await supabase
            .from('xp_rules')
            .update({ points, is_active: isActive, requires_verification: requiresVerification })
            .eq('id', ruleId);

          if (!error) {
            await loadUserData();
            return { success: true };
          }
          console.warn('updateXpRule failed on live db, updating locally:', error.message);
        } catch (e: any) {
          console.warn('updateXpRule error:', e?.message);
        }
      }
    }

    setXpRules((prev) =>
      prev.map((r) =>
        r.id === ruleId
          ? { ...r, points, is_active: isActive, requires_verification: requiresVerification, updated_at: new Date().toISOString() }
          : r
      )
    );
    return { success: true };
  };

  // Toggle task done (routes through verification workflow for members)
  const toggleTaskDone = async (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    // If task requires verification and is not yet done, submit for verification
    if (target.status === 'todo' || target.status === 'in_progress') {
      await submitTaskForVerification(taskId);
      return;
    }

    // If bureau/admin is toggling directly
    if (activeRole === 'admin' || activeRole === 'bureau') {
      if (target.status === 'waiting_verification') {
        await verifyTask(taskId, true);
        return;
      }
      const nextStatus = target.status === 'done' ? 'todo' : 'done';
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: nextStatus,
                completed_at: nextStatus === 'done' ? new Date().toISOString() : null,
              }
            : t
        )
      );
    }
  };

  // Strict Task Creation: Members CANNOT create tasks
  const addTask = async (newTaskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    const isUserAdmin = user?.email?.toLowerCase() === 'adamwalha20@gmail.com' || activeRole === 'admin';
    if (activeRole === 'member' && !isUserAdmin) {
      console.error('Access Denied: Ordinary members cannot create tasks.');
      return;
    }

    const now = new Date().toISOString();
    const newTask: Task = {
      ...newTaskData,
      id: `task-${Date.now()}`,
      created_at: now,
      updated_at: now,
      creator: user || INITIAL_USER,
      assignees: newTaskData.assignees || [user || INITIAL_USER],
      requires_verification: newTaskData.requires_verification ?? true,
      xp_awarded: false,
    };

    if (isLiveSupabase) {
      const supabase = createClient();
      if (supabase && user?.id && isUuid(user.id)) {
        try {
          const { data, error } = await supabase
            .from('tasks')
            .insert({
              title: newTaskData.title,
              description: newTaskData.description || null,
              project_id: isUuid(newTaskData.project_id) ? newTaskData.project_id : null,
              department_id: isUuid(newTaskData.department_id) ? newTaskData.department_id : null,
              creator_id: user.id,
              status: newTaskData.status || 'todo',
              priority: newTaskData.priority || 'medium',
              due_at: newTaskData.due_at || null,
              requires_verification: newTaskData.requires_verification ?? true,
            })
            .select()
            .single();

          if (!error && data) {
            if (newTaskData.assignees && newTaskData.assignees.length > 0) {
              const assigneeRows = newTaskData.assignees
                .filter((a) => isUuid(a.id))
                .map((a) => ({
                  task_id: data.id,
                  user_id: a.id,
                  assigned_by: user.id,
                }));
              if (assigneeRows.length > 0) {
                await supabase.from('task_assignees').insert(assigneeRows);
              }
            }
            await loadUserData();
            return;
          }
        } catch (e: any) {
          console.warn('addTask failed on live db, adding locally:', e?.message);
        }
      }
    }

    setTasks((prev) => [newTask, ...prev]);

    setAuditLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        actor_id: user?.id,
        action: 'TASK_CREATE',
        entity_type: 'tasks',
        entity_id: newTask.id,
        metadata: { title: newTask.title, priority: newTask.priority },
        created_at: now,
        actor: user || INITIAL_USER,
      },
      ...prev,
    ]);
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates, updated_at: new Date().toISOString() } : t))
    );
  };

  const addProject = (newProjectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const newProj: Project = {
      ...newProjectData,
      id: `proj-${Date.now()}`,
      created_at: now,
      updated_at: now,
      owner: user || INITIAL_USER,
      tasks_count: 0,
      completed_tasks_count: 0,
    };
    setProjects((prev) => [newProj, ...prev]);

    setAuditLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        actor_id: user?.id,
        action: 'PROJECT_CREATE',
        entity_type: 'projects',
        entity_id: newProj.id,
        metadata: { name: newProj.name, budget_tnd: newProj.budget_tnd },
        created_at: now,
        actor: user || INITIAL_USER,
      },
      ...prev,
    ]);
  };

  const registerEvent = (eventId: string) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id === eventId) {
          const registered = !e.user_registered;
          return {
            ...e,
            user_registered: registered,
            registrations_count: (e.registrations_count || 0) + (registered ? 1 : -1),
          };
        }
        return e;
      })
    );
  };

  const toggleChecklistItem = (eventId: string, itemIndex: number) => {
    // Check item
  };

  const markNotificationRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n))
    );
  };

  const markAllNotificationsRead = () => {
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: now })));
  };

  const addAnnouncement = (newAnn: Omit<Announcement, 'id' | 'created_at'>) => {
    const ann: Announcement = {
      ...newAnn,
      id: `ann-${Date.now()}`,
      created_at: new Date().toISOString(),
      author: user || INITIAL_USER,
      is_read: true,
    };
    setAnnouncements((prev) => [ann, ...prev]);
  };

  const addDocument = (docData: Omit<DocumentItem, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const doc: DocumentItem = {
      ...docData,
      id: `doc-${Date.now()}`,
      created_at: now,
      updated_at: now,
      uploader: user || INITIAL_USER,
    };
    setDocuments((prev) => [doc, ...prev]);
  };

  const addMeeting = async (meetingData: Omit<Meeting, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; meeting?: Meeting; error?: string }> => {
    const isBureauOrAdmin = activeRole === 'bureau' || activeRole === 'admin';
    if (!isBureauOrAdmin) {
      return { success: false, error: 'Access Denied: Only bureau officers and administrators can schedule meetings.' };
    }

    const now = new Date().toISOString();
    const newMeet: Meeting = {
      ...meetingData,
      id: `meet-${Date.now()}`,
      created_at: now,
      updated_at: now,
      meeting_platform: meetingData.meeting_platform || 'google_meet',
      meeting_type: meetingData.meeting_type || 'bureau',
      recording_enabled: meetingData.recording_enabled ?? false,
      recording_status: meetingData.recording_status || (meetingData.recording_enabled ? 'requested' : 'none'),
      recording_consent_status: meetingData.recording_consent_status || 'pending',
      visibility: meetingData.visibility || 'club',
      status: meetingData.status || 'scheduled',
      organizer: user || INITIAL_USER,
      organizer_id: user?.id || meetingData.organizer_id,
      created_by: user?.id,
      action_items: meetingData.action_items || [],
      recordings: meetingData.recordings || [],
      transcript: meetingData.transcript || null,
      summary: meetingData.summary || null,
    };

    if (isLiveSupabase && user?.id && isUuid(user.id)) {
      const supabase = createClient();
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('meetings')
            .insert({
              title: newMeet.title,
              description: newMeet.description || null,
              location: newMeet.location || null,
              starts_at: newMeet.starts_at,
              ends_at: newMeet.ends_at,
              department_id: isUuid(newMeet.department_id) ? newMeet.department_id : null,
              organizer_id: isUuid(newMeet.organizer_id) ? newMeet.organizer_id : user.id,
              meeting_url: newMeet.meeting_url || null,
              meeting_platform: newMeet.meeting_platform,
              meeting_type: newMeet.meeting_type,
              recording_enabled: newMeet.recording_enabled,
              recording_status: newMeet.recording_status,
              recording_consent_status: newMeet.recording_consent_status,
              visibility: newMeet.visibility,
              agenda: newMeet.agenda || null,
              status: newMeet.status,
              created_by: user.id,
            })
            .select()
            .single();

          if (!error && data) {
            newMeet.id = data.id;
            await loadUserData();
            return { success: true, meeting: newMeet };
          }
          console.warn('addMeeting live db insert notice:', error?.message);
        } catch (e: any) {
          console.warn('addMeeting db error:', e?.message);
        }
      }
    }

    setMeetings((prev) => [newMeet, ...prev]);

    setAuditLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        actor_id: user?.id,
        action: 'MEETING_SCHEDULE',
        entity_type: 'meetings',
        entity_id: newMeet.id,
        metadata: { title: newMeet.title, visibility: newMeet.visibility, type: newMeet.meeting_type },
        created_at: now,
        actor: user || INITIAL_USER,
      },
      ...prev,
    ]);

    return { success: true, meeting: newMeet };
  };

  const updateMeeting = async (meetingId: string, updates: Partial<Meeting>): Promise<{ success: boolean; error?: string }> => {
    const isBureauOrAdmin = activeRole === 'bureau' || activeRole === 'admin';
    if (!isBureauOrAdmin) {
      return { success: false, error: 'Access Denied: Only bureau officers and administrators can update meetings.' };
    }

    const now = new Date().toISOString();
    if (isLiveSupabase && isUuid(meetingId)) {
      const supabase = createClient();
      if (supabase) {
        try {
          const dbUpdates: any = { updated_at: now };
          if (updates.title !== undefined) dbUpdates.title = updates.title;
          if (updates.description !== undefined) dbUpdates.description = updates.description;
          if (updates.location !== undefined) dbUpdates.location = updates.location;
          if (updates.starts_at !== undefined) dbUpdates.starts_at = updates.starts_at;
          if (updates.ends_at !== undefined) dbUpdates.ends_at = updates.ends_at;
          if (updates.meeting_url !== undefined) dbUpdates.meeting_url = updates.meeting_url;
          if (updates.meeting_type !== undefined) dbUpdates.meeting_type = updates.meeting_type;
          if (updates.recording_enabled !== undefined) dbUpdates.recording_enabled = updates.recording_enabled;
          if (updates.recording_status !== undefined) dbUpdates.recording_status = updates.recording_status;
          if (updates.recording_consent_status !== undefined) dbUpdates.recording_consent_status = updates.recording_consent_status;
          if (updates.visibility !== undefined) dbUpdates.visibility = updates.visibility;
          if (updates.agenda !== undefined) dbUpdates.agenda = updates.agenda;
          if (updates.status !== undefined) dbUpdates.status = updates.status;

          const { error } = await supabase.from('meetings').update(dbUpdates).eq('id', meetingId);
          if (!error) {
            await loadUserData();
            return { success: true };
          }
        } catch (e: any) {
          console.warn('updateMeeting live db error:', e?.message);
        }
      }
    }

    setMeetings((prev) =>
      prev.map((m) => (m.id === meetingId ? { ...m, ...updates, updated_at: now } : m))
    );
    return { success: true };
  };

  const addMeetingRecording = async (meetingId: string, recordingData: Omit<MeetingRecording, 'id' | 'created_at'>): Promise<{ success: boolean; recording?: MeetingRecording; error?: string }> => {
    const isBureauOrAdmin = activeRole === 'bureau' || activeRole === 'admin';
    if (!isBureauOrAdmin) {
      return { success: false, error: 'Unauthorized: Only bureau officers can attach meeting recordings.' };
    }

    const now = new Date().toISOString();
    const newRecording: MeetingRecording = {
      ...recordingData,
      id: `rec-${Date.now()}`,
      meeting_id: meetingId,
      created_at: now,
      processing_status: recordingData.processing_status || 'completed',
    };

    if (isLiveSupabase && isUuid(meetingId)) {
      const supabase = createClient();
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('meeting_recordings')
            .insert({
              meeting_id: meetingId,
              provider: recordingData.provider,
              provider_recording_id: recordingData.provider_recording_id || null,
              storage_path: recordingData.storage_path || null,
              duration_seconds: recordingData.duration_seconds || 0,
              file_size: recordingData.file_size || 0,
              mime_type: recordingData.mime_type || 'video/mp4',
              processing_status: newRecording.processing_status,
            })
            .select()
            .single();

          if (!error && data) {
            newRecording.id = data.id;
            await supabase
              .from('meetings')
              .update({ recording_status: 'available', updated_at: now })
              .eq('id', meetingId);
            await loadUserData();
            return { success: true, recording: newRecording };
          }
        } catch (e: any) {
          console.warn('addMeetingRecording db error:', e?.message);
        }
      }
    }

    setMeetings((prev) =>
      prev.map((m) =>
        m.id === meetingId
          ? {
              ...m,
              recording_status: 'available',
              recordings: [newRecording, ...(m.recordings || [])],
              updated_at: now,
            }
          : m
      )
    );
    return { success: true, recording: newRecording };
  };

  const addMeetingTranscript = async (meetingId: string, transcriptData: Omit<MeetingTranscript, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; error?: string }> => {
    const isBureauOrAdmin = activeRole === 'bureau' || activeRole === 'admin';
    if (!isBureauOrAdmin) {
      return { success: false, error: 'Unauthorized: Only bureau officers can publish transcripts.' };
    }

    const now = new Date().toISOString();
    const newTranscript: MeetingTranscript = {
      ...transcriptData,
      id: `tx-${Date.now()}`,
      meeting_id: meetingId,
      created_at: now,
      updated_at: now,
    };

    if (isLiveSupabase && isUuid(meetingId)) {
      const supabase = createClient();
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('meeting_transcripts')
            .insert({
              meeting_id: meetingId,
              recording_id: isUuid(transcriptData.recording_id) ? transcriptData.recording_id : null,
              language: transcriptData.language || 'fr',
              content: transcriptData.content,
              is_edited: transcriptData.is_edited ?? false,
              edited_by: isUuid(user?.id) ? user?.id : null,
              processing_status: transcriptData.processing_status || 'completed',
            })
            .select()
            .single();

          if (!error && data) {
            newTranscript.id = data.id;
            if (transcriptData.segments && transcriptData.segments.length > 0) {
              const segRows = transcriptData.segments.map((s) => ({
                transcript_id: data.id,
                meeting_id: meetingId,
                speaker_label: s.speaker_label,
                start_seconds: s.start_seconds,
                end_seconds: s.end_seconds,
                content: s.content,
              }));
              await supabase.from('meeting_transcript_segments').insert(segRows);
            }
            await loadUserData();
            return { success: true };
          }
        } catch (e: any) {
          console.warn('addMeetingTranscript db error:', e?.message);
        }
      }
    }

    setMeetings((prev) =>
      prev.map((m) =>
        m.id === meetingId
          ? {
              ...m,
              transcript: newTranscript,
              updated_at: now,
            }
          : m
      )
    );
    return { success: true };
  };

  const updateMeetingSummary = async (
    meetingId: string,
    summaryContent: MeetingSummaryContent,
    approve?: boolean | 'draft' | 'approved' | 'rejected',
    notes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const isBureauOrAdmin = activeRole === 'bureau' || activeRole === 'admin';
    if (!isBureauOrAdmin) {
      return { success: false, error: 'Unauthorized: Only bureau officers can approve summaries.' };
    }

    const isApproved = approve === true || approve === 'approved';
    const reviewStatus: 'draft' | 'approved' | 'rejected' =
      approve === 'draft' || approve === 'rejected' ? approve : isApproved ? 'approved' : 'draft';

    const now = new Date().toISOString();
    const newSummary: MeetingSummary = {
      id: `sum-${Date.now()}`,
      meeting_id: meetingId,
      summary_content: summaryContent,
      content: summaryContent,
      review_status: reviewStatus,
      processing_status: 'completed',
      generated_at: now,
      approved_by: isApproved ? (user?.id || 'usr-admin-001') : null,
      approved_at: isApproved ? now : null,
      notes: notes || null,
      updated_at: now,
    };

    if (isLiveSupabase && isUuid(meetingId)) {
      const supabase = createClient();
      if (supabase) {
        try {
          const { error } = await supabase
            .from('meeting_summaries')
            .upsert({
              meeting_id: meetingId,
              summary_content: summaryContent,
              processing_status: 'completed',
              approved_by: isApproved && user?.id && isUuid(user.id) ? user.id : null,
              approved_at: isApproved ? now : null,
              updated_at: now,
            }, { onConflict: 'meeting_id' });

          if (!error) {
            await loadUserData();
            return { success: true };
          }
        } catch (e: any) {
          console.warn('updateMeetingSummary db error:', e?.message);
        }
      }
    }

    setMeetings((prev) =>
      prev.map((m) =>
        m.id === meetingId
          ? {
              ...m,
              summary: newSummary,
              updated_at: now,
            }
          : m
      )
    );
    return { success: true };
  };

  const createTaskFromMeetingAction = async (
    meetingId: string,
    actionItem: {
      title?: string;
      task?: string;
      description?: string;
      responsible?: string;
      assignee?: string;
      assigned_user_id?: string;
      due_at?: string;
      deadline?: string;
      priority?: TaskPriority;
    }
  ): Promise<{ success: boolean; task?: Task; error?: string }> => {
    const isBureauOrAdmin = activeRole === 'bureau' || activeRole === 'admin';
    if (!isBureauOrAdmin) {
      return { success: false, error: 'Unauthorized: Ordinary members cannot create tasks from meeting actions.' };
    }

    const targetMeeting = meetings.find((m) => m.id === meetingId);
    const assignedUserOrName = actionItem.assigned_user_id || actionItem.assignee || actionItem.responsible;
    const assignedMember =
      members.find((m) => m.id === assignedUserOrName || m.full_name?.toLowerCase() === assignedUserOrName?.toLowerCase()) ||
      user ||
      INITIAL_USER;

    const taskTitle = actionItem.title || actionItem.task || 'Action Item from Meeting';
    const taskDue = actionItem.due_at || actionItem.deadline || null;

    const newTaskData: Omit<Task, 'id' | 'created_at' | 'updated_at'> = {
      title: taskTitle,
      description: actionItem.description || `Action item agreed upon during meeting: ${targetMeeting?.title || 'Club Meeting'}`,
      status: 'todo',
      priority: actionItem.priority || 'medium',
      creator_id: user?.id || 'usr-admin-001',
      due_at: taskDue,
      department_id: targetMeeting?.department_id || null,
      assignees: [assignedMember],
      requires_verification: true,
      xp_awarded: false,
    };

    await addTask(newTaskData);

    const now = new Date().toISOString();
    const newActionId = `act-${Date.now()}`;
    const newActionItem: MeetingAction = {
      id: newActionId,
      meeting_id: meetingId,
      title: taskTitle,
      description: actionItem.description,
      status: 'pending',
      due_at: taskDue,
      assigned_user: assignedMember,
      assigned_user_id: assignedMember.id,
    };

    setMeetings((prev) =>
      prev.map((m) =>
        m.id === meetingId
          ? {
              ...m,
              action_items: [...(m.action_items || []), newActionItem],
              updated_at: now,
            }
          : m
      )
    );

    return { success: true };
  };

  const dispatchMeetingRecordingBot = async (meetingId: string): Promise<{ success: boolean; status?: string; message?: string; error?: string }> => {
    const isBureauOrAdmin = activeRole === 'bureau' || activeRole === 'admin';
    if (!isBureauOrAdmin) {
      return { success: false, error: 'Unauthorized: Only bureau officers can dispatch the recording bot.' };
    }

    const meeting = meetings.find((m) => m.id === meetingId);
    if (!meeting) return { success: false, error: 'Meeting not found' };

    try {
      const res = await fetch('/api/meetings/recording/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId, meetingUrl: meeting.meeting_url }),
      });
      const data = await res.json();

      await updateMeeting(meetingId, { recording_status: data.status || 'requested', recording_enabled: true });
      return { success: data.success, status: data.status, message: data.message };
    } catch (e: any) {
      await updateMeeting(meetingId, { recording_status: 'requested', recording_enabled: true });
      return {
        success: true,
        status: 'requested',
        message: 'Recording bot requested for scheduled session. Participants will be notified upon bot entry.',
      };
    }
  };

  // ----------------------------------------------------------------------------
  // Role-Specific Workspaces Mutations
  // ----------------------------------------------------------------------------

  const addTransaction = (txData: Omit<FinancialTransaction, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const newTx: FinancialTransaction = {
      ...txData,
      id: `tx-${Date.now()}`,
      created_at: now,
      updated_at: now,
      created_by: user?.id,
    };
    setTransactions((prev) => [newTx, ...prev]);

    setAuditLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        actor_id: user?.id,
        action: 'FINANCE_TRANSACTION_RECORD',
        entity_type: 'financial_transactions',
        entity_id: newTx.id,
        metadata: { amount: newTx.amount, type: newTx.transaction_type, category: newTx.category },
        created_at: now,
        actor: user || INITIAL_USER,
      },
      ...prev,
    ]);
  };

  const approveTransaction = (id: string, status: 'approved' | 'rejected') => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, approval_status: status, updated_at: new Date().toISOString() } : tx))
    );
  };

  const addBudget = (bgtData: Omit<Budget, 'id' | 'created_at'>) => {
    const newBgt: Budget = {
      ...bgtData,
      id: `bgt-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setBudgets((prev) => [newBgt, ...prev]);
  };

  const addPartner = (partnerData: Omit<Partner, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const newPartner: Partner = {
      ...partnerData,
      id: `partner-${Date.now()}`,
      created_at: now,
      updated_at: now,
      created_by: user?.id,
    };
    setPartners((prev) => [newPartner, ...prev]);
  };

  const updatePartnerStage = (id: string, stage: Partner['pipeline_stage']) => {
    setPartners((prev) =>
      prev.map((p) => (p.id === id ? { ...p, pipeline_stage: stage, updated_at: new Date().toISOString() } : p))
    );
  };

  const addCampaign = (campData: Omit<MarketingCampaign, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const newCamp: MarketingCampaign = {
      ...campData,
      id: `mkt-${Date.now()}`,
      created_at: now,
      updated_at: now,
      assigned_creator_id: user?.id,
    };
    setCampaigns((prev) => [newCamp, ...prev]);
  };

  const updateCampaignStatus = (id: string, status: MarketingCampaign['status']) => {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status, updated_at: new Date().toISOString() } : c))
    );
  };

  const addInitiative = (initData: Omit<SustainabilityInitiative, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const newInit: SustainabilityInitiative = {
      ...initData,
      id: `sust-${Date.now()}`,
      created_at: now,
      updated_at: now,
      lead_id: user?.id,
    };
    setInitiatives((prev) => [newInit, ...prev]);
  };

  const updateInitiativeProgress = (id: string, current: number) => {
    setInitiatives((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              current_metric: current,
              status: current >= i.target_metric ? 'completed' : i.status,
              updated_at: new Date().toISOString(),
            }
          : i
      )
    );
  };

  const addDecision = (decData: Omit<Decision, 'id' | 'decided_at'>) => {
    const newDec: Decision = {
      ...decData,
      id: `dec-${Date.now()}`,
      decided_at: new Date().toISOString(),
    };
    setDecisions((prev) => [newDec, ...prev]);
  };

  const updateApplicationStatus = (id: string, status: RecruitmentApplication['status'], notes?: string) => {
    setRecruitmentApps((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status, hr_notes: notes || app.hr_notes } : app))
    );
  };

  const assignBureauPosition = async (positionKey: string, userIdOrName: string, memberName?: string): Promise<{ success: boolean; error?: string }> => {
    const supabase = createClient();
    
    // Look for matching user in members list
    const matchedMember = members.find((m) => m.id === userIdOrName || m.full_name.toLowerCase() === userIdOrName.toLowerCase());
    const finalName = memberName || matchedMember?.full_name || (userIdOrName === 'unassigned' ? 'Unassigned' : userIdOrName);
    const finalUserId = matchedMember?.id || (userIdOrName !== 'unassigned' ? userIdOrName : null);
    const finalAvatar = matchedMember?.avatar_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80';

    if (supabase) {
      try {
        // Find position record
        const { data: pos, error: posErr } = await supabase
          .from('bureau_positions')
          .select('id')
          .eq('key', positionKey)
          .single();

        if (posErr) {
          console.error('Error finding bureau position:', posErr);
          return { success: false, error: posErr.message };
        }

        if (pos) {
          // Remove old assignment
          const { error: delErr } = await supabase
            .from('user_bureau_positions')
            .delete()
            .eq('position_id', pos.id);

          if (delErr) {
            console.error('Error clearing previous bureau position:', delErr);
          }

          if (finalUserId && isUuid(finalUserId)) {
            // Assign new member
            const { error: insErr } = await supabase
              .from('user_bureau_positions')
              .insert({
                position_id: pos.id,
                user_id: finalUserId,
                assigned_by: user?.id && isUuid(user.id) ? user.id : null,
              });

            if (insErr) {
              console.error('Error inserting new bureau assignment:', insErr);
              return { success: false, error: insErr.message };
            }

            // Ensure member has bureau role in user_roles
            const { data: bRole } = await supabase.from('roles').select('id').eq('key', 'bureau').single();
            if (bRole) {
              await supabase.from('user_roles').upsert({
                user_id: finalUserId,
                role_id: bRole.id,
              });
            }
          }
        }
      } catch (err: any) {
        console.error('Error assigning bureau position in Supabase:', err);
        return { success: false, error: err?.message || 'Failed to update bureau position' };
      }
    }

    // Update local state
    setBureauMembers((prev) =>
      prev.map((bm) =>
        bm.position_key === positionKey
          ? {
              ...bm,
              member_name: finalName,
              avatar: finalAvatar,
            }
          : bm
      )
    );

    // If assigned member exists, grant them bureau role locally
    if (finalUserId) {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === finalUserId
            ? {
                ...m,
                roles: [{ id: 'role-bureau', key: 'bureau', display_name: 'Bureau Officer' }],
              }
            : m
        )
      );
    }

    return { success: true };
  };

  const setUserRole = async (userId: string, roleKey: 'admin' | 'bureau' | 'member'): Promise<{ success: boolean; error?: string }> => {
    const supabase = createClient();
    if (supabase && isUuid(userId)) {
      try {
        const { data: roleRow } = await supabase.from('roles').select('id').eq('key', roleKey).single();
        if (roleRow) {
          await supabase.from('user_roles').delete().eq('user_id', userId);
          await supabase.from('user_roles').insert({
            user_id: userId,
            role_id: roleRow.id,
            assigned_by: user?.id && isUuid(user.id) ? user.id : null,
          });
        }
      } catch (err: any) {
        console.error('Error setting user role in Supabase:', err);
      }
    }

    // Update local members state
    setMembers((prev) =>
      prev.map((m) =>
        m.id === userId
          ? {
              ...m,
              roles: [{ id: `role-${roleKey}`, key: roleKey, display_name: roleKey.toUpperCase() }],
            }
          : m
      )
    );

    // If changing active user's role
    if (user && user.id === userId) {
      setActiveRole(roleKey);
    }

    return { success: true };
  };

  const updateProfileOnboarding = async (data: {
    studentId: string;
    studyField: string;
    skills: string[];
    interestedDepartmentId?: string;
    bio?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const supabase = createClient();
    if (supabase && user?.id) {
      try {
        const { error } = await supabase.from('profiles').update({
          student_id: data.studentId,
          study_field: data.studyField,
          skills: data.skills,
          interested_department_id: data.interestedDepartmentId || null,
          bio: data.bio || user.bio,
          updated_at: new Date().toISOString(),
        }).eq('id', user.id);

        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        setIsLoading(false);
        return { success: false, error: err?.message || 'Failed to update profile' };
      }
    }

    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        student_id: data.studentId,
        study_field: data.studyField,
        skills: data.skills,
        bio: data.bio || prev.bio,
      };
    });

    setNeedsOnboarding(false);
    setIsLoading(false);
    return { success: true };
  };

  // ----------------------------------------------------------------------------
  // Auth Operations
  // ----------------------------------------------------------------------------

  const signIn = async (email: string, pass: string) => {
    setIsLoading(true);
    const trimmedEmail = email.trim().toLowerCase();

    const supabase = createClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password: pass });
        if (!error && data?.user) {
          // Fetch user profile from Supabase
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profile) {
            setUser({
              ...INITIAL_USER,
              ...profile,
            });

            // Check if profile is complete
            if (!profile.student_id || !profile.study_field || !profile.skills || (profile.skills as string[]).length === 0) {
              setNeedsOnboarding(true);
            }
          }

          // Fetch user role
          const { data: roleRecords } = await supabase
            .from('user_roles')
            .select('role_id, roles(key, display_name)')
            .eq('user_id', data.user.id);

          if (roleRecords && roleRecords.length > 0) {
            const roleKey = (roleRecords[0].roles as any)?.key;
            if (roleKey === 'admin') setActiveRole('admin');
            else if (roleKey === 'bureau') setActiveRole('bureau');
            else setActiveRole('member');
          }

          setIsAuthenticated(true);
          setIsLoading(false);
          return { success: true };
        }

        setIsLoading(false);
        return { success: false, error: error?.message || 'Invalid login credentials' };
      } catch (err: any) {
        setIsLoading(false);
        return { success: false, error: err?.message || 'Authentication error occurred' };
      }
    }

    // Demo fallback authentication
    await new Promise((res) => setTimeout(res, 400));
    setIsLoading(false);
    if (!email || !pass) {
      return { success: false, error: 'Please enter both email and password.' };
    }
    setUser(INITIAL_USER);
    setIsAuthenticated(true);
    return { success: true };
  };

  const getAuthRedirectUrl = (path: string = '/auth/callback') => {
    if (typeof window !== 'undefined' && window.location.origin) {
      return `${window.location.origin}${path}`;
    }
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}${path}`;
    }
    if (process.env.NEXT_PUBLIC_VERCEL_URL) {
      return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}${path}`;
    }
    return path;
  };

  const signInWithGoogle = async () => {
    setIsLoading(true);
    const supabase = createClient();
    if (supabase) {
      try {
        const redirectUrl = getAuthRedirectUrl('/auth/callback');
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            queryParams: {
              access_type: 'offline',
            },
          },
        });

        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message };
        }
        return { success: true };
      } catch (err: any) {
        setIsLoading(false);
        return { success: false, error: err?.message || 'Failed to initialize Google authentication' };
      }
    }

    // Demo fallback
    await new Promise((res) => setTimeout(res, 400));
    setIsLoading(false);
    setUser(INITIAL_USER);
    setIsAuthenticated(true);
    setNeedsOnboarding(true);
    return { success: true };
  };

  const signUp = async (data: {
    fullName: string;
    email: string;
    password: string;
    studentId: string;
    studyField: string;
    skills?: string[];
    departmentId?: string;
    bio?: string;
  }) => {
    setIsLoading(true);
    const supabase = createClient();
    if (supabase) {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: getAuthRedirectUrl('/auth/callback'),
          data: {
            full_name: data.fullName,
            student_id: data.studentId,
            study_field: data.studyField,
          },
        },
      });

      if (authErr) {
        setIsLoading(false);
        return { success: false, error: authErr.message };
      }

      if (authData.user) {
        try {
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            full_name: data.fullName,
            student_id: data.studentId,
            study_field: data.studyField,
            skills: data.skills || ['Climate Action', 'Innovation'],
            interested_department_id: data.departmentId || null,
            bio: data.bio || '',
          });

          await supabase.from('club_memberships').upsert({
            user_id: authData.user.id,
            membership_status: 'pending',
          });

          // Ensure default role is 'member'
          const { data: memberRole } = await supabase.from('roles').select('id').eq('key', 'member').single();
          if (memberRole) {
            await supabase.from('user_roles').upsert({
              user_id: authData.user.id,
              role_id: memberRole.id,
            });
          }
        } catch {
          // Trigger handles automatic creation
        }

        const newMemberProfile: Profile = {
          id: authData.user.id,
          full_name: data.fullName,
          student_id: data.studentId,
          study_field: data.studyField,
          skills: data.skills || ['Climate Action', 'Innovation'],
          contact_preferences: { email: true, in_app: true },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          membership: {
            id: `mem-${Date.now()}`,
            user_id: authData.user.id,
            membership_status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          roles: [{ id: 'role-member', key: 'member', display_name: 'Club Member' }],
        };

        setMembers((prev) => [newMemberProfile, ...prev]);
        setUser(newMemberProfile);
        setActiveRole('member');
        setIsAuthenticated(true);
      }

      setIsLoading(false);
      return { success: true };
    }

    // Demo fallback signup
    await new Promise((res) => setTimeout(res, 400));
    setIsLoading(false);
    const newMemberProfile: Profile = {
      id: `usr-${Date.now()}`,
      full_name: data.fullName,
      student_id: data.studentId,
      study_field: data.studyField,
      skills: data.skills || ['Climate Action', 'Innovation'],
      contact_preferences: { email: true, in_app: true },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      membership: {
        id: `mem-${Date.now()}`,
        user_id: `usr-${Date.now()}`,
        membership_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      roles: [{ id: 'role-member', key: 'member', display_name: 'Club Member' }],
    };
    setMembers((prev) => [newMemberProfile, ...prev]);
    setUser(newMemberProfile);
    setActiveRole('member');
    setIsAuthenticated(true);
    return { success: true };
  };

  const approveMembership = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    const supabase = createClient();
    if (supabase && isUuid(userId)) {
      const { data: updated, error: updateErr } = await supabase
        .from('club_memberships')
        .update({
          membership_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select();

      if (updateErr) {
        return { success: false, error: updateErr.message };
      }

      if (!updated || updated.length === 0) {
        const { error: insertErr } = await supabase
          .from('club_memberships')
          .insert({
            user_id: userId,
            membership_status: 'active',
            updated_at: new Date().toISOString(),
          });
        if (insertErr) {
          return { success: false, error: insertErr.message };
        }
      }
    }

    setMembers((prev) =>
      prev.map((m) =>
        m.id === userId
          ? {
              ...m,
              membership: {
                ...(m.membership || {
                  id: `mem-${userId}`,
                  user_id: userId,
                  created_at: new Date().toISOString(),
                }),
                membership_status: 'active',
                updated_at: new Date().toISOString(),
              },
            }
          : m
      )
    );

    if (user?.id === userId) {
      setIsApproved(true);
    }

    return { success: true };
  };

  const rejectMembership = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    const supabase = createClient();
    if (supabase && isUuid(userId)) {
      const { data: updated, error: updateErr } = await supabase
        .from('club_memberships')
        .update({
          membership_status: 'suspended',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select();

      if (updateErr) {
        return { success: false, error: updateErr.message };
      }

      if (!updated || updated.length === 0) {
        const { error: insertErr } = await supabase
          .from('club_memberships')
          .insert({
            user_id: userId,
            membership_status: 'suspended',
            updated_at: new Date().toISOString(),
          });
        if (insertErr) {
          return { success: false, error: insertErr.message };
        }
      }
    }

    setMembers((prev) =>
      prev.map((m) =>
        m.id === userId
          ? {
              ...m,
              membership: {
                ...(m.membership || {
                  id: `mem-${userId}`,
                  user_id: userId,
                  created_at: new Date().toISOString(),
                }),
                membership_status: 'suspended',
                updated_at: new Date().toISOString(),
              },
            }
          : m
      )
    );

    if (user?.id === userId) {
      setIsApproved(false);
    }

    return { success: true };
  };

  const updateUserProfile = async (updates: {
    fullName?: string;
    studentId?: string;
    studyField?: string;
    bio?: string;
    skills?: string[];
    avatarPath?: string;
    contactPreferences?: { email: boolean; in_app: boolean };
  }): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const supabase = createClient();

    const dbUpdates: any = {};
    if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
    if (updates.studentId !== undefined) dbUpdates.student_id = updates.studentId;
    if (updates.studyField !== undefined) dbUpdates.study_field = updates.studyField;
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
    if (updates.skills !== undefined) dbUpdates.skills = updates.skills;
    if (updates.avatarPath !== undefined) dbUpdates.avatar_path = updates.avatarPath;
    if (updates.contactPreferences !== undefined) dbUpdates.contact_preferences = updates.contactPreferences;
    dbUpdates.updated_at = new Date().toISOString();

    if (supabase && user?.id && isUuid(user.id)) {
      const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', user.id);

      if (error) {
        setIsLoading(false);
        return { success: false, error: error.message };
      }
    }

    setUser((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...dbUpdates,
      };
    });

    setMembers((prev) =>
      prev.map((m) => (m.id === user?.id ? { ...m, ...dbUpdates } : m))
    );

    setIsLoading(false);
    return { success: true };
  };

  const uploadAvatar = async (file: File): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
      if (!file) {
        return { success: false, error: 'No image file was selected.' };
      }

      if (!file.type.startsWith('image/')) {
        return { success: false, error: 'Unsupported format. Please select an image file (PNG, JPG, WEBP).' };
      }

      if (file.size > 5 * 1024 * 1024) {
        return { success: false, error: 'Image size exceeds maximum limit of 5MB.' };
      }

      setIsLoading(true);
      const supabase = createClient();
      let publicUrl = '';

      if (supabase && user?.id && isUuid(user.id)) {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const sanitized = file.name.replace(/[^a-zA-Z0-9]/g, '_');
        const filePath = `${user.id}/${Date.now()}_${sanitized}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          console.warn('Storage bucket upload notice, falling back to data URL:', uploadError.message);
          publicUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        } else {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
          publicUrl = urlData.publicUrl;
        }
      } else {
        publicUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      const saveRes = await updateUserProfile({ avatarPath: publicUrl });
      setIsLoading(false);
      if (!saveRes.success) {
        return { success: false, error: saveRes.error };
      }

      return { success: true, url: publicUrl };
    } catch (err: any) {
      setIsLoading(false);
      console.error('Error in uploadAvatar:', err);
      return { success: false, error: err?.message || 'Failed to upload image' };
    }
  };

  const signOut = async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setIsAuthenticated(false);
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.assign('/login');
    }
  };

  const resetPassword = async (email: string) => {
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getAuthRedirectUrl('/reset-password'),
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
    await new Promise((res) => setTimeout(res, 300));
    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeRole,
        setActiveRole,
        activeBureauPosition,
        setActiveBureauPosition,
        userBureauPositions,
        isAuthenticated,
        isApproved,
        isLoading,
        isLiveSupabase,
        isAdmin: user?.email?.toLowerCase() === 'adamwalha20@gmail.com' || activeRole === 'admin',
        tasks,
        projects,
        events,
        meetings,
        announcements,
        notifications,
        documents,
        departments,
        members,
        auditLogs,
        memberXpList,
        currentUserXp,
        xpTransactions,
        xpRules,
        userAchievements,
        bureauMembers,
        transactions,
        budgets,
        partners,
        campaigns,
        initiatives,
        decisions,
        recruitmentApps,
        toggleTaskDone,
        submitTaskForVerification,
        verifyTask,
        adminAdjustXp,
        updateXpRule,
        refreshXpData,
        addTask,
        updateTask,
        addProject,
        registerEvent,
        toggleChecklistItem,
        markNotificationRead,
        markAllNotificationsRead,
        addAnnouncement,
        addDocument,
        addMeeting,
        updateMeeting,
        addMeetingRecording,
        addMeetingTranscript,
        updateMeetingSummary,
        createTaskFromMeetingAction,
        dispatchMeetingRecordingBot,
        addTransaction,
        approveTransaction,
        addBudget,
        addPartner,
        updatePartnerStage,
        addCampaign,
        updateCampaignStatus,
        addInitiative,
        updateInitiativeProgress,
        addDecision,
        updateApplicationStatus,
        assignBureauPosition,
        setUserRole,
        approveMembership,
        rejectMembership,
        updateUserProfile,
        uploadAvatar,
        needsOnboarding,
        setNeedsOnboarding,
        updateProfileOnboarding,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
