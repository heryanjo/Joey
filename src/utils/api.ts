import type { Outlet, OutletCode, Contestant, AuditLogEntry, StaffUser } from '../types/index.ts';

function getStaffHeaders(): Record<string, string> {
  let email = '';
  try {
    const saved = localStorage.getItem('bo_admin_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.email) email = parsed.email;
    }
  } catch {}
  return {
    'Content-Type': 'application/json',
    ...(email ? { 'x-staff-email': email } : {}),
  };
}

export async function fetchSession(): Promise<{
  voterId: string;
  hasVoted: boolean;
  boundOutlet: OutletCode | null;
  voteRecord: { outletCode: OutletCode; contestantId: string; timestamp: string } | null;
  contestant: { id: string; name: string; numberDisplay: string; costume: string } | null;
}> {
  const res = await fetch('/api/session');
  if (!res.ok) throw new Error('Failed to fetch session');
  return res.json();
}

export async function fetchOutlets(): Promise<Outlet[]> {
  const res = await fetch('/api/outlets');
  if (!res.ok) throw new Error('Failed to fetch outlets');
  return res.json();
}

export async function fetchOutlet(outletCode: OutletCode): Promise<{
  outlet: Outlet;
  contestants: Contestant[];
  voterStatus: {
    hasVoted: boolean;
    votedContestantId?: string;
    votedOutletCode?: OutletCode;
    boundOutlet?: OutletCode;
  };
}> {
  const res = await fetch(`/api/outlets/${outletCode}`);
  if (!res.ok) throw new Error(`Failed to fetch outlet ${outletCode}`);
  return res.json();
}

export async function fetchLeaderboard(outletCode: OutletCode): Promise<{
  outlet: Outlet;
  leaderboard: Contestant[];
  totalVotes: number;
  lastUpdated: string;
}> {
  const res = await fetch(`/api/leaderboard/${outletCode}`);
  if (!res.ok) throw new Error(`Failed to fetch leaderboard for ${outletCode}`);
  return res.json();
}

export async function castVote(outletCode: OutletCode, contestantId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
  contestant?: Contestant;
  outlet?: Outlet;
  existingContestant?: Contestant;
}> {
  const res = await fetch('/api/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outletCode, contestantId }),
  });
  const data = await res.json();
  if (!res.ok) {
    return {
      success: false,
      error: data.error || 'Failed to submit vote',
      code: data.code,
      existingContestant: data.existingContestant,
    };
  }
  return data;
}

export function subscribeToOutletEvents(
  outletCode: OutletCode,
  onUpdate: () => void,
  onConnectionChange?: (connected: boolean) => void
): () => void {
  let eventSource: EventSource | null = null;
  let retryTimeout: any = null;

  function connect() {
    try {
      eventSource = new EventSource(`/api/events/${outletCode}`);

      eventSource.onopen = () => {
        if (onConnectionChange) onConnectionChange(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'CONNECTED') {
            if (onConnectionChange) onConnectionChange(true);
          } else if (data.type === 'UPDATE' && data.outletCode === outletCode) {
            onUpdate();
          }
        } catch {
          // ignore keepalive pings
        }
      };

      eventSource.onerror = () => {
        if (onConnectionChange) onConnectionChange(false);
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        // Retry connection after 3 seconds
        retryTimeout = setTimeout(connect, 3000);
      };
    } catch (e) {
      if (onConnectionChange) onConnectionChange(false);
      retryTimeout = setTimeout(connect, 4000);
    }
  }

  connect();

  return () => {
    if (retryTimeout) clearTimeout(retryTimeout);
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}

// Admin API with Staff Authentication Headers
export async function uploadContestantPhoto(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('photo', file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Photo upload failed');
  }

  const data = await res.json();
  return data.imageUrl;
}

export async function fetchAdminContestants(outletCode: OutletCode): Promise<{
  outlet: Outlet;
  contestants: Contestant[];
  nextNumber: number;
}> {
  const res = await fetch(`/api/admin/contestants/${outletCode}`, {
    headers: getStaffHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch admin contestants');
  }
  return res.json();
}

export async function addAdminContestant(payload: {
  outletCode: OutletCode;
  name: string;
  costume: string;
  instagram?: string;
  phoneNumber?: string;
  description?: string;
  imageUrl: string;
  hasConsented: boolean;
  actor: string;
}): Promise<Contestant> {
  const res = await fetch('/api/admin/contestants', {
    method: 'POST',
    headers: getStaffHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to add contestant');
  }

  const data = await res.json();
  return data.contestant;
}

export async function updateAdminContestant(
  id: string,
  updates: Partial<Pick<Contestant, 'name' | 'costume' | 'instagram' | 'phoneNumber' | 'description' | 'imageUrl' | 'isActive'>>,
  actor: string
): Promise<Contestant> {
  const res = await fetch(`/api/admin/contestants/${id}`, {
    method: 'PUT',
    headers: getStaffHeaders(),
    body: JSON.stringify({ ...updates, actor }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to update contestant');
  }

  const data = await res.json();
  return data.contestant;
}

export async function toggleHideContestant(id: string, actor: string): Promise<Contestant> {
  const res = await fetch(`/api/admin/contestants/${id}/toggle-hide`, {
    method: 'POST',
    headers: getStaffHeaders(),
    body: JSON.stringify({ actor }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to toggle contestant visibility');
  }

  const data = await res.json();
  return data.contestant;
}

export async function deleteAdminContestant(id: string, actor: string): Promise<void> {
  const res = await fetch(`/api/admin/contestants/${id}`, {
    method: 'DELETE',
    headers: getStaffHeaders(),
    body: JSON.stringify({ actor }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete contestant');
  }
}

export async function toggleOutletVotingStatus(
  outletCode: OutletCode,
  active: boolean,
  actor: string
): Promise<Outlet> {
  const res = await fetch(`/api/admin/outlets/${outletCode}/voting-status`, {
    method: 'POST',
    headers: getStaffHeaders(),
    body: JSON.stringify({ active, actor }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to update voting status');
  }

  const data = await res.json();
  return data.outlet;
}

export async function fetchAuditLogs(outletCode?: OutletCode): Promise<AuditLogEntry[]> {
  const url = outletCode ? `/api/admin/audit-logs?outletCode=${outletCode}` : '/api/admin/audit-logs';
  const res = await fetch(url, {
    headers: getStaffHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch audit logs');
  }
  return res.json();
}

export async function resetDemoData(): Promise<void> {
  const res = await fetch('/api/admin/reset-demo', {
    method: 'POST',
    headers: getStaffHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to reset demo data');
  }
}

export async function resetSingleOutlet(
  outletCode: OutletCode,
  actor: string
): Promise<{ success: boolean; outlet: Outlet; message: string }> {
  const res = await fetch(`/api/admin/outlets/${outletCode}/reset`, {
    method: 'POST',
    headers: {
      ...getStaffHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ actor }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to reset outlet');
  }
  return res.json();
}

export async function bulkDeleteContestants(
  ids: string[],
  outletCode: OutletCode,
  actor: string
): Promise<{ success: boolean; deletedCount: number; message: string }> {
  const res = await fetch('/api/admin/contestants/bulk-delete', {
    method: 'POST',
    headers: {
      ...getStaffHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ids, outletCode, actor }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete contestants');
  }
  return res.json();
}

export async function fetchStaffConfig(): Promise<{
  allowedStaff: StaffUser[];
  superAdminEmail: string;
}> {
  const res = await fetch('/api/admin/staff');
  if (!res.ok) throw new Error('Failed to fetch staff list');
  return res.json();
}

export async function addStaffMember(data: {
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'OUTLET_ADMIN';
  assignedOutlet?: OutletCode;
  pin?: string;
}): Promise<{ success: boolean; staff: StaffUser; allowedStaff: StaffUser[] }> {
  const res = await fetch('/api/admin/staff', {
    method: 'POST',
    headers: {
      ...getStaffHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to add staff member');
  }
  return res.json();
}

export async function updateStaffPin(
  email: string,
  pin?: string
): Promise<{ success: boolean; staff: StaffUser; allowedStaff: StaffUser[] }> {
  const res = await fetch(`/api/admin/staff/${encodeURIComponent(email)}/pin`, {
    method: 'PATCH',
    headers: {
      ...getStaffHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pin }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update PIN');
  }
  return res.json();
}

export async function removeStaffMember(email: string): Promise<{ success: boolean; allowedStaff: StaffUser[] }> {
  const res = await fetch(`/api/admin/staff/${encodeURIComponent(email)}`, {
    method: 'DELETE',
    headers: getStaffHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to remove staff member');
  }
  return res.json();
}

export async function loginStaff(
  email: string,
  pin?: string
): Promise<{ success: boolean; user: StaffUser; message?: string }> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, pin }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Authentication failed');
  }
  return res.json();
}

