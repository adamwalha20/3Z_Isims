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
} from '@/lib/mock-data';
import { createClient } from '@/lib/supabase/client';

export type ActiveRole = 'admin' | 'bureau' | 'lead' | 'member';

interface AuthContextType {
  user: Profile | null;
  activeRole: ActiveRole;
  setActiveRole: (role: ActiveRole) => void;
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
  
  // Interactive mutations
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLiveSupabase, setIsLiveSupabase] = useState<boolean>(false);

  // In-memory data store with localStorage hydration
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

  // Check Supabase client initialization
  useEffect(() => {
    const supabase = createClient();
    if (supabase) {
      setIsLiveSupabase(true);
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setIsAuthenticated(true);
          // Fetch real profile or use initial fallback
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

    // Record audit log
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
    // Interactive event checklist toggle
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

  const signIn = async (email: string, pass: string) => {
    setIsLoading(true);
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      setIsLoading(false);
      if (error) {
        return { success: false, error: error.message };
      }
      setIsAuthenticated(true);
      return { success: true };
    }

    // Demo fallback authentication
    await new Promise((res) => setTimeout(res, 400));
    setIsLoading(false);
    if (!email || !pass) {
      return { success: false, error: 'Please enter both email and password.' };
    }
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
        // Upsert profile and membership
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
