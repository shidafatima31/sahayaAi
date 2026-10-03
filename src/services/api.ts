import { CaseRecord, FollowUpSchedule, OutboxMessage, SystemSettings, AuditLogEntry, User } from '../types/index.ts';

const TOKEN_KEY = 'sahara_ai_token';
const USER_KEY = 'sahara_ai_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const u = localStorage.getItem(USER_KEY);
  if (!u) return null;
  try {
    return JSON.parse(u);
  } catch {
    return null;
  }
}

export function setStoredAuth(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    const res = await request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setStoredAuth(res.token, res.user);
    return res;
  },

  getCurrentUser: async () => {
    return request<{ user: User }>('/api/auth/me');
  },

  // Cases
  submitIntake: async (data: any) => {
    return request<{
      success: boolean;
      caseId: string;
      docketNumber: string;
      channel: string;
      nextCheckIn: any;
      emergencyNumbers: Array<{ label: string; number: string }>;
    }>('/api/cases/intake', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  getCases: async (filters: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== '') {
        params.append(k, String(v));
      }
    }
    return request<{ cases: CaseRecord[] }>(`/api/cases?${params.toString()}`);
  },

  getCaseDetail: async (id: string) => {
    return request<{
      case: CaseRecord;
      followUps: FollowUpSchedule[];
      docketStatus: any;
    }>(`/api/cases/${id}`);
  },

  recordDecision: async (id: string, decisionData: any) => {
    return request<{ success: boolean; decision: any }>(`/api/cases/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify(decisionData)
    });
  },

  overrideRisk: async (id: string, newRisk: string, overrideReason: string) => {
    return request<{ success: boolean; originalRisk: string; newRisk: string }>(`/api/cases/${id}/override`, {
      method: 'POST',
      body: JSON.stringify({ newRisk, overrideReason })
    });
  },

  // Check-ins
  getCheckInByToken: async (token: string) => {
    return request<{
      checkIn: FollowUpSchedule;
      caseInfo: { docketNumber: string; citizenName: string; district: string; language: string };
    }>(`/api/checkin/${token}`);
  },

  submitCheckInResponse: async (token: string, responseText: string, safetyRating: number) => {
    return request<{ success: boolean; message: string; docketNumber: string }>(`/api/checkin/${token}`, {
      method: 'POST',
      body: JSON.stringify({ responseText, safetyRating })
    });
  },

  getOutboxMessages: async () => {
    return request<{ outbox: OutboxMessage[] }>('/api/outbox');
  },

  // Time Travel
  simulateTimeTravel: async (advanceDays: number, reset: boolean = false) => {
    return request<{
      success: boolean;
      timeOffsetDays: number;
      simulatedDate: string;
      markedOverdueCount: number;
      newlyFlaggedCount: number;
    }>('/api/admin/time-travel', {
      method: 'POST',
      body: JSON.stringify({ advanceDays, reset })
    });
  },

  // Analytics
  getKpis: async () => {
    return request<{
      totalCases: number;
      criticalOpen: number;
      avgSvi: number;
      avgResponseTimeMin: number;
      fuCompletionRate: number;
    }>('/api/analytics/kpis');
  },

  getDistrictAnalytics: async () => {
    return request<{ districts: any[] }>('/api/analytics/districts');
  },

  getTrends: async () => {
    return request<{
      riskDistribution: Array<{ risk_level: string; count: number }>;
      escalationReasons: Array<{ reason: string; count: number }>;
    }>('/api/analytics/trends');
  },

  // Audit Logs
  getAuditLogs: async (filters: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v) params.append(k, String(v));
    }
    return request<{ logs: AuditLogEntry[] }>(`/api/audit-logs?${params.toString()}`);
  },

  // Settings
  getSettings: async () => {
    return request<Record<string, any>>('/api/settings');
  },

  updateSettings: async (settings: Partial<SystemSettings>) => {
    return request<{ success: boolean }>('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  },

  deleteCitizenData: async (caseId: string, confirmationReason: string) => {
    return request<{ success: boolean; message: string }>('/api/dpdp/delete-data', {
      method: 'POST',
      body: JSON.stringify({ caseId, confirmationReason })
    });
  }
};
