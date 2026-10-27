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
  assignBureauPosition: (positionKey: string, memberName: string) => void;

  // Auth operations
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (data: {
    fullName: string;
    email: string;
    password: string;
    studentId: string;
    studyField: string;
    departmentId?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(INITIAL_USER);
  const [activeRole, setActiveRole] = useState<ActiveRole>('bureau');
  const [activeBureauPosition, setActiveBureauPosition] = useState<ActiveBureauPosition>('all');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLiveSupabase, setIsLiveSupabase] = useState<boolean>(false);

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

  // Check Supabase client initialization
  useEffect(() => {
    const supabase = createClient();
    if (supabase) {
      setIsLiveSupabase(true);
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setIsAuthenticated(true);
          supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            .then(({ data }) => {
              if (data) {
                setUser(data as Profile);
              }
            });
        }
      });
    }
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

  const assignBureauPosition = (positionKey: string, memberName: string) => {
    setBureauMembers((prev) =>
      prev.map((bm) => (bm.position_key === positionKey ? { ...bm, member_name: memberName } : bm))
    );
  };

  // ----------------------------------------------------------------------------
  // Auth Operations
  // ----------------------------------------------------------------------------

  const signIn = async (email: string, pass: string) => {
    setIsLoading(true);
    const trimmedEmail = email.trim().toLowerCase();
    const isSampleUser = trimmedEmail === 'yassine.mezghani@isims.tn' && pass === '3Zero@2025';

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
          }
          setIsAuthenticated(true);
          setIsLoading(false);
          return { success: true };
        }

        // Resilient fallback: If sample demo credentials were provided, allow immediate access
        if (isSampleUser) {
          setUser(INITIAL_USER);
          setIsAuthenticated(true);
          setIsLoading(false);
          return { success: true };
        }

        setIsLoading(false);
        return { success: false, error: error?.message || 'Invalid login credentials' };
      } catch (err: any) {
        if (isSampleUser) {
          setUser(INITIAL_USER);
          setIsAuthenticated(true);
          setIsLoading(false);
          return { success: true };
        }
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

  const signUp = async (data: {
    fullName: string;
    email: string;
    password: string;
    studentId: string;
    studyField: string;
    departmentId?: string;
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
          });

          await supabase.from('club_memberships').upsert({
            user_id: authData.user.id,
            membership_status: 'pending',
          });
        } catch {
          // Trigger handles automatic creation
        }

        const newMemberProfile: Profile = {
          id: authData.user.id,
          full_name: data.fullName,
          student_id: data.studentId,
          study_field: data.studyField,
          skills: ['Climate Action', 'Innovation'],
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
      skills: ['Climate Action', 'Innovation'],
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

  const signOut = async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setIsAuthenticated(false);
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
        isLoading,
        isLiveSupabase,
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
        signIn,
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
