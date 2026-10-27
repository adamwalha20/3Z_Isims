'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Profile,
  GlobalRoleKey,
  Task,
  Project,
  EventItem,
  Meeting,
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
  BureauMemberAssignment,
} from '@/lib/mock-data';
import { createClient } from '@/lib/supabase/client';

export type ActiveRole = 'admin' | 'bureau' | 'lead' | 'member';
export type ActiveBureauPosition = 'all' | BureauPositionKey;

interface AuthContextType {
  user: Profile | null;
  activeRole: ActiveRole;
  setActiveRole: (role: ActiveRole) => void;
  activeBureauPosition: ActiveBureauPosition;
  setActiveBureauPosition: (pos: ActiveBureauPosition) => void;
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
  addTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  addProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => void;
  registerEvent: (eventId: string) => void;
  toggleChecklistItem: (eventId: string, itemIndex: number) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'created_at'>) => void;
  addDocument: (doc: Omit<DocumentItem, 'id' | 'created_at' | 'updated_at'>) => void;
  addMeeting: (meeting: Omit<Meeting, 'id' | 'created_at' | 'updated_at'>) => void;

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

  // Role-Specific Workspaces state
  const [bureauMembers, setBureauMembers] = useState<BureauMemberAssignment[]>(OFFICIAL_BUREAU_MEMBERS);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(INITIAL_FINANCIAL_TRANSACTIONS);
  const [budgets, setBudgets] = useState<Budget[]>(INITIAL_BUDGETS);
  const [partners, setPartners] = useState<Partner[]>(INITIAL_PARTNERS);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>(INITIAL_MARKETING_CAMPAIGNS);
  const [initiatives, setInitiatives] = useState<SustainabilityInitiative[]>(INITIAL_SUSTAINABILITY_INITIATIVES);
  const [decisions, setDecisions] = useState<Decision[]>(INITIAL_DECISIONS);
  const [recruitmentApps, setRecruitmentApps] = useState<RecruitmentApplication[]>(INITIAL_RECRUITMENT_APPLICATIONS);

  // Check Supabase client initialization & load live profiles, roles, and bureau assignments
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setUser(INITIAL_USER);
      setIsAuthenticated(true);
      setIsApproved(true);
      return;
    }

    setIsLiveSupabase(true);

    const loadUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setIsAuthenticated(true);

          // 1. Fetch user's profile and membership status
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

            // If skills or student_id are missing, prompt onboarding
            if (!profile.student_id || !profile.study_field || !profile.skills || (profile.skills as string[]).length === 0) {
              setNeedsOnboarding(true);
            }
          }

          if (isAdam) {
            setActiveRole('admin');
          } else {
            // 2. Fetch user's assigned role
            const { data: roleRecords } = await supabase
              .from('user_roles')
              .select('role_id, roles(key, display_name)')
              .eq('user_id', session.user.id);

            if (roleRecords && roleRecords.length > 0) {
              const roleKey = (roleRecords[0].roles as any)?.key;
              if (roleKey === 'bureau') setActiveRole('bureau');
              else setActiveRole('member');
            } else {
              setActiveRole('member');
            }
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }

        // 3. Fetch all registered members and memberships from Supabase
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

        // 4. Fetch all bureau positions & assigned officers
        const { data: posData } = await supabase
          .from('bureau_positions')
          .select(`
            id, key, display_name, description,
            user_bureau_positions (
              user_id,
              profiles ( id, full_name, avatar_path, student_id )
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
      } catch (err) {
        console.error('Error fetching Supabase auth & bureau data:', err);
      }
    };

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

  const toggleTaskDone = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextStatus = t.status === 'done' ? 'todo' : 'done';
          const completedAt = nextStatus === 'done' ? new Date().toISOString() : null;
          return {
            ...t,
            status: nextStatus,
            completed_at: completedAt,
            checklist_done: nextStatus === 'done' ? (t.checklist_total || 1) : 0,
          };
        }
        return t;
      })
    );
  };

  const addTask = (newTaskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const newTask: Task = {
      ...newTaskData,
      id: `task-${Date.now()}`,
      created_at: now,
      updated_at: now,
      creator: user || INITIAL_USER,
      assignees: newTaskData.assignees || [user || INITIAL_USER],
    };
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

  const addMeeting = (meetingData: Omit<Meeting, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const meet: Meeting = {
      ...meetingData,
      id: `meet-${Date.now()}`,
      created_at: now,
      updated_at: now,
      organizer: user || INITIAL_USER,
    };
    setMeetings((prev) => [meet, ...prev]);
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
    const finalUserId = matchedMember?.id || (userIdOrName !== 'unassigned' && userIdOrName.startsWith('usr-') ? userIdOrName : null);

    if (supabase) {
      try {
        // Find position record
        const { data: pos } = await supabase
          .from('bureau_positions')
          .select('id')
          .eq('key', positionKey)
          .single();

        if (pos) {
          // Remove old assignment
          await supabase
            .from('user_bureau_positions')
            .delete()
            .eq('position_id', pos.id);

          if (finalUserId) {
            // Assign new member
            await supabase
              .from('user_bureau_positions')
              .insert({
                position_id: pos.id,
                user_id: finalUserId,
                assigned_by: user?.id || null,
              });

            // Ensure member has bureau role
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
      }
    }

    // Update local state
    setBureauMembers((prev) =>
      prev.map((bm) => (bm.position_key === positionKey ? { ...bm, member_name: finalName } : bm))
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
    if (supabase) {
      try {
        const { data: roleRow } = await supabase.from('roles').select('id').eq('key', roleKey).single();
        if (roleRow) {
          await supabase.from('user_roles').delete().eq('user_id', userId);
          await supabase.from('user_roles').insert({
            user_id: userId,
            role_id: roleRow.id,
            assigned_by: user?.id || null,
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

  const signInWithGoogle = async () => {
    setIsLoading(true);
    const supabase = createClient();
    if (supabase) {
      try {
        const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '/auth/callback';
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
    if (supabase) {
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
    if (supabase) {
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

    if (supabase && user?.id) {
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

  const signOut = async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setIsAuthenticated(false);
    setUser(null);
    window.location.href = '/login';
  };

  const resetPassword = async (email: string) => {
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
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
        isAuthenticated,
        isApproved,
        isLoading,
        isLiveSupabase,
        isAdmin: user?.email?.toLowerCase() === 'adamwalha20@gmail.com',
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
        bureauMembers,
        transactions,
        budgets,
        partners,
        campaigns,
        initiatives,
        decisions,
        recruitmentApps,
        toggleTaskDone,
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
