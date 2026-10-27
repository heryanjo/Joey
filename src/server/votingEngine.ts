import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Outlet, OutletCode, Contestant, VoteRecord, AuditLogEntry, StaffUser } from '../types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

export const EVENT_ID = 'bo-halloween-2026';
const SECRET_SALT = process.env.VOTER_HASH_SALT || 'black-owl-halloween-secret-salt-2026';

export const INITIAL_OUTLETS: Record<OutletCode, Outlet> = {
  BOPIK: {
    code: 'BOPIK',
    name: 'Black Owl PIK',
    shortName: 'PIK Golf Island',
    city: 'Jakarta Utara',
    address: 'Pantai Indah Kapuk, Jakarta Utara',
    votingActive: true,
    totalVotes: 0,
  },
  BOKG: {
    code: 'BOKG',
    name: 'Black Owl Kelapa Gading',
    shortName: 'Kelapa Gading',
    city: 'Jakarta Utara',
    address: 'Jl. Boulevard Raya, Kelapa Gading, Jakarta Utara',
    votingActive: true,
    totalVotes: 0,
  },
  BOGS: {
    code: 'BOGS',
    name: 'Black Owl Gading Serpong',
    shortName: 'Gading Serpong',
    city: 'Tangerang',
    address: 'Jl. Boulevard Il Lago, Gading Serpong, Tangerang',
    votingActive: true,
    totalVotes: 0,
  },
  BOSCBD: {
    code: 'BOSCBD',
    name: 'Black Owl SCBD',
    shortName: 'SCBD Lot 8',
    city: 'Jakarta Selatan',
    address: 'Kawasan Sudirman Central Business District, Jakarta Selatan',
    votingActive: true,
    totalVotes: 0,
  },
  BOSBY: {
    code: 'BOSBY',
    name: 'Black Owl Surabaya',
    shortName: 'Surabaya Kertajaya',
    city: 'Surabaya',
    address: 'Jl. Raya Kertajaya Indah, Surabaya',
    votingActive: true,
    totalVotes: 0,
  },
  BOMDN: {
    code: 'BOMDN',
    name: 'Black Owl Medan',
    shortName: 'Medan Polonia',
    city: 'Medan',
    address: 'Jl. Imam Bonjol, Medan, Sumatera Utara',
    votingActive: true,
    totalVotes: 0,
  },
};

// Authorized staff allowlist
export const STAFF_USERS: Record<string, StaffUser> = {
  'heryanjojo@gmail.com': {
    email: 'heryanjojo@gmail.com',
    name: 'Heryan Jojo',
    role: 'SUPER_ADMIN',
  },
  'superadmin@blackowl.id': {
    email: 'superadmin@blackowl.id',
    name: 'Black Owl Head of Events',
    role: 'SUPER_ADMIN',
  },
  'admin.pik@blackowl.id': {
    email: 'admin.pik@blackowl.id',
    name: 'Outlet Lead — PIK',
    role: 'OUTLET_ADMIN',
    assignedOutlet: 'BOPIK',
  },
  'admin.scbd@blackowl.id': {
    email: 'admin.scbd@blackowl.id',
    name: 'Outlet Lead — SCBD',
    role: 'OUTLET_ADMIN',
    assignedOutlet: 'BOSCBD',
  },
  'admin.kg@blackowl.id': {
    email: 'admin.kg@blackowl.id',
    name: 'Outlet Lead — Kelapa Gading',
    role: 'OUTLET_ADMIN',
    assignedOutlet: 'BOKG',
  },
  'admin.gs@blackowl.id': {
    email: 'admin.gs@blackowl.id',
    name: 'Outlet Lead — Gading Serpong',
    role: 'OUTLET_ADMIN',
    assignedOutlet: 'BOGS',
  },
  'admin.sby@blackowl.id': {
    email: 'admin.sby@blackowl.id',
    name: 'Outlet Lead — Surabaya',
    role: 'OUTLET_ADMIN',
    assignedOutlet: 'BOSBY',
  },
  'admin.mdn@blackowl.id': {
    email: 'admin.mdn@blackowl.id',
    name: 'Outlet Lead — Medan',
    role: 'OUTLET_ADMIN',
    assignedOutlet: 'BOMDN',
  },
};

export function verifyStaffAccess(
  email: string | undefined,
  targetOutlet: OutletCode | undefined
): { ok: boolean; status: number; message?: string; user?: StaffUser } {
  if (!email) {
    return { ok: false, status: 401, message: 'Authentication required. Staff email header missing.' };
  }
  const user = STAFF_USERS[email.toLowerCase().trim()];
  if (!user) {
    return { ok: false, status: 403, message: `Access denied. ${email} is not on the authorized staff allowlist.` };
  }
  if (user.role === 'SUPER_ADMIN') {
    return { ok: true, status: 200, user };
  }
  if (user.role === 'OUTLET_ADMIN') {
    if (targetOutlet && user.assignedOutlet !== targetOutlet) {
      return {
        ok: false,
        status: 403,
        message: `Forbidden: Outlet Admin for ${user.assignedOutlet} cannot access or modify records for ${targetOutlet}.`,
      };
    }
    return { ok: true, status: 200, user };
  }
  return { ok: false, status: 403, message: 'Unauthorized staff role.' };
}

export function addStaffUser(user: StaffUser): StaffUser {
  const normalizedEmail = user.email.toLowerCase().trim();
  const staff: StaffUser = {
    ...user,
    email: normalizedEmail,
    pin: user.pin ? user.pin.trim() : undefined,
  };
  STAFF_USERS[normalizedEmail] = staff;
  return staff;
}

export function updateStaffPin(email: string, pin?: string): StaffUser | null {
  const normalizedEmail = email.toLowerCase().trim();
  const staff = STAFF_USERS[normalizedEmail];
  if (!staff) return null;
  staff.pin = pin && pin.trim().length > 0 ? pin.trim() : undefined;
  return staff;
}

export function removeStaffUser(email: string): boolean {
  const normalizedEmail = email.toLowerCase().trim();
  if (normalizedEmail === 'heryanjojo@gmail.com') {
    return false; // Owner cannot be deleted
  }
  if (STAFF_USERS[normalizedEmail]) {
    delete STAFF_USERS[normalizedEmail];
    return true;
  }
  return false;
}

export function getStaffUsersList(): StaffUser[] {
  return Object.values(STAFF_USERS);
}

// Premium royalty-free Halloween portrait assets for demo seeding
const SEED_PHOTOS = [
  'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=800&q=80', // Vampire skull elegance
  'https://images.unsplash.com/photo-1603775020644-eb8decd79994?auto=format&fit=crop&w=800&q=80', // Gothic sorceress
  'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?auto=format&fit=crop&w=800&q=80', // Elegant Phantom
  'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=800&q=80', // Baroque masquerade gentleman
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80', // Cyberpunk siren
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80', // Venetian witch
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80', // Steampunk warlock
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80', // Blood sovereign
];

export class VotingEngine {
  private outlets: Map<OutletCode, Outlet> = new Map();
  private contestants: Map<string, Contestant> = new Map();
  private votes: Map<string, VoteRecord> = new Map(); // key: eventId + ":" + voterHash
  private boundOutlets: Map<string, OutletCode> = new Map(); // key: voterHash -> first bound outlet
  private auditLogs: AuditLogEntry[] = [];
  private listeners: Set<(outletCode: OutletCode) => void> = new Set();
  private rateLimitMap: Map<string, { count: number; resetAt: number }> = new Map();
  private mutexChain: Promise<unknown> = Promise.resolve();
  private dbPath: string | null = DB_FILE;

  constructor(options?: { inMemory?: boolean; dbPath?: string }) {
    this.initOutlets();
    if (options?.inMemory) {
      this.dbPath = null;
      this.seedDemoData();
    } else {
      if (options?.dbPath) {
        this.dbPath = options.dbPath;
      }
      const loaded = this.loadFromDisk();
      if (!loaded) {
        this.seedDemoData();
        this.saveToDisk();
      }
    }
  }

  private initOutlets() {
    for (const [code, outlet] of Object.entries(INITIAL_OUTLETS)) {
      this.outlets.set(code as OutletCode, { ...outlet });
    }
  }

  private saveToDisk() {
    if (!this.dbPath) return;
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {
        outlets: Array.from(this.outlets.entries()),
        contestants: Array.from(this.contestants.entries()),
        votes: Array.from(this.votes.entries()),
        boundOutlets: Array.from(this.boundOutlets.entries()),
        auditLogs: this.auditLogs,
        staffUsers: Object.values(STAFF_USERS),
      };
      fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database to disk:', err);
    }
  }

  public persist() {
    this.saveToDisk();
  }

  private loadFromDisk(): boolean {
    if (!this.dbPath) return false;
    try {
      if (!fs.existsSync(this.dbPath)) return false;
      const raw = fs.readFileSync(this.dbPath, 'utf-8');
      const parsed = JSON.parse(raw);

      if (parsed.outlets) {
        for (const [k, v] of parsed.outlets) {
          this.outlets.set(k, v);
        }
      }
      if (parsed.contestants) {
        for (const [k, v] of parsed.contestants) {
          this.contestants.set(k, v);
        }
      }
      if (parsed.votes) {
        for (const [k, v] of parsed.votes) {
          this.votes.set(k, v);
        }
      }
      if (parsed.boundOutlets) {
        for (const [k, v] of parsed.boundOutlets) {
          this.boundOutlets.set(k, v);
        }
      }
      if (parsed.auditLogs) {
        this.auditLogs = parsed.auditLogs;
      }
      if (Array.isArray(parsed.staffUsers)) {
        for (const staff of parsed.staffUsers) {
          if (staff && staff.email) {
            STAFF_USERS[staff.email.toLowerCase().trim()] = staff;
          }
        }
      }
      return true;
    } catch (err) {
      console.warn('Error reading persisted database from disk, defaulting to seed:', err);
      return false;
    }
  }

  public seedDemoData() {
    this.contestants.clear();
    this.votes.clear();
    this.boundOutlets.clear();
    this.auditLogs = [];

    // Realistic contestants for each outlet with IG handles and phone numbers
    const templates = [
      { name: 'Valentina Valois', ig: '@valentinavalois', phone: '0812-9843-1101', votes: 42 },
      { name: 'Kaelen Thorne', ig: '@kaelenthorne', phone: '0813-8821-4402', votes: 38 },
      { name: 'Aurelia Vance', ig: '@aureliavance', phone: '0811-7729-3303', votes: 31 },
      { name: 'Dante Moretti', ig: '@dantemoretti', phone: '0818-4455-6604', votes: 27 },
      { name: 'Seraphina Roux', ig: '@seraphinaroux', phone: '0821-3322-1105', votes: 23 },
      { name: 'Marcus Sterling', ig: '@marcussterling', phone: '0857-1122-3306', votes: 19 },
    ];

    let photoIdx = 0;
    for (const outletCode of Object.keys(INITIAL_OUTLETS) as OutletCode[]) {
      let outletVoteSum = 0;
      templates.forEach((tmpl, i) => {
        const num = i + 1;
        const id = `c_${outletCode.toLowerCase()}_${num}`;
        // Realistic initial baseline distribution
        const voteCount = Math.max(0, tmpl.votes + ((outletCode.charCodeAt(2) * (i + 1)) % 15) - 7);
        outletVoteSum += voteCount;

        const contestant: Contestant = {
          id,
          outletCode,
          number: num,
          numberDisplay: `#${num.toString().padStart(2, '0')}`,
          name: tmpl.name,
          costume: tmpl.ig,
          instagram: tmpl.ig,
          phoneNumber: tmpl.phone,
          description: `Contestant for Black Owl Halloween Night at ${this.outlets.get(outletCode)?.name}.`,
          imageUrl: SEED_PHOTOS[photoIdx % SEED_PHOTOS.length],
          votes: voteCount,
          isActive: true,
          hasConsented: true,
          createdAt: new Date(Date.now() - (7 - i) * 3600000).toISOString(),
          isDemo: true,
        };
        this.contestants.set(id, contestant);
        photoIdx++;
      });

      const outlet = this.outlets.get(outletCode);
      if (outlet) {
        outlet.totalVotes = outletVoteSum;
      }
    }

    this.auditLogs.push({
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'RESET_DEMO',
      outletCode: 'BOPIK',
      actor: 'SYSTEM_BOOT',
      details: 'Initialized demo contestants and baseline vote counts for all 6 outlets.',
    });

    this.saveToDisk();
  }

  public hashVoterIdentity(voterId: string): string {
    return crypto.createHmac('sha256', SECRET_SALT).update(voterId.trim()).digest('hex');
  }

  // Bind voter identity to first outlet
  public bindVoterToOutlet(voterId: string, outletCode: OutletCode): void {
    if (!voterId) return;
    const voterHash = this.hashVoterIdentity(voterId);
    if (!this.boundOutlets.has(voterHash)) {
      this.boundOutlets.set(voterHash, outletCode);
      this.saveToDisk();
    }
  }

  // Real-time listener registration
  public subscribe(callback: (outletCode: OutletCode) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(outletCode: OutletCode) {
    for (const listener of this.listeners) {
      try {
        listener(outletCode);
      } catch (err) {
        console.error('Error invoking voting engine subscriber:', err);
      }
    }
  }

  // Outlets
  public getOutlets(): Outlet[] {
    return Array.from(this.outlets.values());
  }

  public getOutlet(code: OutletCode): Outlet | undefined {
    return this.outlets.get(code);
  }

  public setOutletVotingStatus(code: OutletCode, active: boolean, actor: string): boolean {
    const outlet = this.outlets.get(code);
    if (!outlet) return false;
    outlet.votingActive = active;

    this.auditLogs.unshift({
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'VOTING_STATUS_CHANGED',
      outletCode: code,
      actor,
      details: `Voting ${active ? 'OPENED' : 'CLOSED'} for ${outlet.name}.`,
    });

    this.saveToDisk();
    this.notify(code);
    return true;
  }

  // Contestants
  public getContestants(
    outletCode: OutletCode,
    includeHidden = false,
    includePrivate = true
  ): Contestant[] {
    const list = Array.from(this.contestants.values()).filter(
      (c) => c.outletCode === outletCode && (includeHidden || c.isActive)
    );
    // Sort by number ascending
    const sorted = list.sort((a, b) => a.number - b.number);
    if (includePrivate) {
      return sorted;
    }
    // Redact private fields like phoneNumber for public guest voting views
    return sorted.map((c) => {
      const { phoneNumber, ...publicContestant } = c;
      return publicContestant as Contestant;
    });
  }

  // Leaderboard: sort descending by votes, using contestant number ascending as deterministic tie-break
  public getLeaderboard(outletCode: OutletCode): Contestant[] {
    const list = Array.from(this.contestants.values()).filter(
      (c) => c.outletCode === outletCode && c.isActive
    );

    // Exact deterministic tie-break: votes DESC, then number ASC
    list.sort((a, b) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      return a.number - b.number;
    });

    return list.map((c, idx) => {
      const { phoneNumber, ...publicContestant } = c;
      return {
        ...publicContestant,
        rank: idx + 1,
      } as Contestant;
    });
  }

  public getContestantById(id: string): Contestant | undefined {
    return this.contestants.get(id);
  }

  public getNextContestantNumber(outletCode: OutletCode): number {
    const contestants = Array.from(this.contestants.values()).filter((c) => c.outletCode === outletCode);
    if (contestants.length === 0) return 1;
    const maxNum = Math.max(...contestants.map((c) => c.number));
    return maxNum + 1;
  }

  public addContestant(data: {
    outletCode: OutletCode;
    name: string;
    costume: string; // Instagram username / IG handle (e.g. @username)
    instagram?: string;
    phoneNumber?: string;
    description?: string;
    imageUrl: string;
    hasConsented: boolean;
    actor: string;
  }): Contestant {
    const nextNum = this.getNextContestantNumber(data.outletCode);
    const id = `c_${data.outletCode.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    // Normalize Instagram handle with @ prefix
    let igHandle = (data.instagram || data.costume).trim();
    if (igHandle && !igHandle.startsWith('@')) {
      igHandle = `@${igHandle}`;
    }

    const contestant: Contestant = {
      id,
      outletCode: data.outletCode,
      number: nextNum,
      numberDisplay: `#${nextNum.toString().padStart(2, '0')}`,
      name: data.name.trim(),
      costume: igHandle,
      instagram: igHandle,
      phoneNumber: data.phoneNumber && data.phoneNumber.trim().length > 0 ? data.phoneNumber.trim() : undefined,
      description: data.description?.trim(),
      imageUrl: data.imageUrl,
      votes: 0,
      isActive: true,
      hasConsented: data.hasConsented,
      createdAt: new Date().toISOString(),
    };

    this.contestants.set(id, contestant);

    this.auditLogs.unshift({
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'CONTESTANT_ADDED',
      outletCode: data.outletCode,
      actor: data.actor,
      details: `Added contestant ${contestant.numberDisplay} - ${contestant.name} (${contestant.costume}).`,
    });

    this.saveToDisk();
    this.notify(data.outletCode);
    return contestant;
  }

  public updateContestant(
    id: string,
    updates: Partial<Pick<Contestant, 'name' | 'costume' | 'instagram' | 'phoneNumber' | 'description' | 'imageUrl' | 'isActive'>>,
    actor: string
  ): Contestant | null {
    const contestant = this.contestants.get(id);
    if (!contestant) return null;

    if (updates.costume !== undefined || updates.instagram !== undefined) {
      let igHandle = (updates.instagram || updates.costume || '').trim();
      if (igHandle && !igHandle.startsWith('@')) {
        igHandle = `@${igHandle}`;
      }
      updates.costume = igHandle;
      updates.instagram = igHandle;
    }

    if (updates.phoneNumber !== undefined) {
      updates.phoneNumber = updates.phoneNumber && updates.phoneNumber.trim().length > 0 ? updates.phoneNumber.trim() : undefined;
    }

    Object.assign(contestant, updates);

    this.auditLogs.unshift({
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'CONTESTANT_UPDATED',
      outletCode: contestant.outletCode,
      actor,
      details: `Updated contestant ${contestant.numberDisplay} - ${contestant.name}.`,
    });

    this.saveToDisk();
    this.notify(contestant.outletCode);
    return contestant;
  }

  public toggleHideContestant(id: string, actor: string): Contestant | null {
    const contestant = this.contestants.get(id);
    if (!contestant) return null;

    contestant.isActive = !contestant.isActive;

    this.auditLogs.unshift({
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'CONTESTANT_HIDDEN',
      outletCode: contestant.outletCode,
      actor,
      details: `${contestant.isActive ? 'Unhid' : 'Hid'} contestant ${contestant.numberDisplay} - ${contestant.name}.`,
    });

    this.saveToDisk();
    this.notify(contestant.outletCode);
    return contestant;
  }

  public deleteContestant(id: string, actor: string): boolean {
    const contestant = this.contestants.get(id);
    if (!contestant) return false;

    const outlet = this.outlets.get(contestant.outletCode);
    if (outlet) {
      outlet.totalVotes = Math.max(0, outlet.totalVotes - contestant.votes);
    }

    this.contestants.delete(id);

    this.auditLogs.unshift({
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'CONTESTANT_DELETED',
      outletCode: contestant.outletCode,
      actor,
      details: `Permanently deleted contestant ${contestant.numberDisplay} - ${contestant.name} (had ${contestant.votes} votes).`,
    });

    this.saveToDisk();
    this.notify(contestant.outletCode);
    return true;
  }

  public deleteMultipleContestants(
    ids: string[],
    outletCode: OutletCode,
    actor: string
  ): { deletedCount: number; remainingCount: number } {
    let deletedCount = 0;
    const outlet = this.outlets.get(outletCode);

    for (const id of ids) {
      const contestant = this.contestants.get(id);
      if (contestant && contestant.outletCode === outletCode) {
        if (outlet) {
          outlet.totalVotes = Math.max(0, outlet.totalVotes - contestant.votes);
        }
        for (const [key, v] of this.votes.entries()) {
          if (v.contestantId === id) {
            this.votes.delete(key);
          }
        }
        this.contestants.delete(id);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.auditLogs.unshift({
        id: `audit_${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'CONTESTANT_DELETED',
        outletCode,
        actor,
        details: `Bulk deleted ${deletedCount} contestant(s) by ${actor}.`,
      });
      this.saveToDisk();
      this.notify(outletCode);
    }

    const remaining = this.getContestants(outletCode, true).length;
    return { deletedCount, remainingCount: remaining };
  }

  public resetOutlet(outletCode: OutletCode, actor: string): { success: boolean; outlet: Outlet } {
    const outlet = this.outlets.get(outletCode);
    if (!outlet) {
      throw new Error(`Outlet ${outletCode} not found.`);
    }

    // 1. Remove all contestants belonging to this outlet
    for (const [id, c] of this.contestants.entries()) {
      if (c.outletCode === outletCode) {
        this.contestants.delete(id);
      }
    }

    // 2. Remove all vote records for this outlet
    for (const [key, v] of this.votes.entries()) {
      if (v.outletCode === outletCode) {
        this.votes.delete(key);
      }
    }

    // 3. Clear bound outlets for this outlet
    for (const [voterHash, boundCode] of this.boundOutlets.entries()) {
      if (boundCode === outletCode) {
        this.boundOutlets.delete(voterHash);
      }
    }

    // 4. Reset outlet totalVotes to 0
    outlet.totalVotes = 0;

    this.auditLogs.unshift({
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'RESET_DEMO',
      outletCode,
      actor,
      details: `Reset outlet ${outletCode} (${outlet.name}) to 0 contestants and 0 votes by ${actor}.`,
    });

    this.saveToDisk();
    this.notify(outletCode);

    return { success: true, outlet };
  }

  // Voting Status check
  public getVoterStatus(voterId: string): {
    hasVoted: boolean;
    voteRecord?: VoteRecord;
    contestant?: Contestant;
    boundOutlet?: OutletCode;
  } {
    if (!voterId) return { hasVoted: false };
    const voterHash = this.hashVoterIdentity(voterId);
    const voteKey = `${EVENT_ID}:${voterHash}`;
    const voteRecord = this.votes.get(voteKey);
    const boundOutlet = this.boundOutlets.get(voterHash);

    if (voteRecord) {
      const contestant = this.contestants.get(voteRecord.contestantId);
      return {
        hasVoted: true,
        voteRecord,
        contestant,
        boundOutlet,
      };
    }

    return { hasVoted: false, boundOutlet };
  }

  // Rate Limiter: check anti-burst (max 5 requests per 10s per voter)
  private checkRateLimit(voterHash: string): boolean {
    const now = Date.now();
    const existing = this.rateLimitMap.get(voterHash);
    if (!existing || now > existing.resetAt) {
      this.rateLimitMap.set(voterHash, { count: 1, resetAt: now + 10000 });
      return true;
    }
    if (existing.count >= 5) {
      return false;
    }
    existing.count += 1;
    return true;
  }

  // Atomic Vote Cast
  public async castVote(params: {
    voterId: string;
    outletCode: OutletCode;
    contestantId: string;
    userAgent?: string;
  }): Promise<{
    success: boolean;
    error?: string;
    code?: string;
    contestant?: Contestant;
    outlet?: Outlet;
  }> {
    // Chain onto mutex to guarantee strict atomic serialization against race conditions
    return new Promise((resolve) => {
      this.mutexChain = this.mutexChain.then(async () => {
        try {
          const { voterId, outletCode, contestantId } = params;

          if (!voterId || voterId.trim().length < 8) {
            return resolve({
              success: false,
              error: 'Invalid or missing voting session identity.',
              code: 'INVALID_SESSION',
            });
          }

          const voterHash = this.hashVoterIdentity(voterId);

          // 1. Check Rate Limit
          if (!this.checkRateLimit(voterHash)) {
            return resolve({
              success: false,
              error: 'Too many requests. Please wait a moment.',
              code: 'RATE_LIMITED',
            });
          }

          // 2. Check Outlet
          const outlet = this.outlets.get(outletCode);
          if (!outlet) {
            return resolve({
              success: false,
              error: 'Invalid venue outlet code.',
              code: 'OUTLET_NOT_FOUND',
            });
          }

          // 3. Check Voting Open Status
          if (!outlet.votingActive) {
            return resolve({
              success: false,
              error: `Voting is currently closed for ${outlet.name}.`,
              code: 'VOTING_CLOSED',
            });
          }

          // 4. Duplicate Check: has voter already voted anywhere in this event?
          const voteKey = `${EVENT_ID}:${voterHash}`;
          if (this.votes.has(voteKey)) {
            const existing = this.votes.get(voteKey)!;
            const existingContestant = this.contestants.get(existing.contestantId);
            return resolve({
              success: false,
              error: `You have already cast your vote in this Halloween event${
                existingContestant ? ` for ${existingContestant.numberDisplay} - ${existingContestant.name}` : ''
              }.`,
              code: 'DUPLICATE_VOTE',
              contestant: existingContestant,
            });
          }

          // 5. Contestant Check
          const contestant = this.contestants.get(contestantId);
          if (!contestant) {
            return resolve({
              success: false,
              error: 'Contestant not found.',
              code: 'CONTESTANT_NOT_FOUND',
            });
          }

          if (contestant.outletCode !== outletCode) {
            return resolve({
              success: false,
              error: 'Contestant does not belong to this outlet.',
              code: 'OUTLET_MISMATCH',
            });
          }

          if (!contestant.isActive) {
            return resolve({
              success: false,
              error: 'Contestant is not currently active for voting.',
              code: 'CONTESTANT_INACTIVE',
            });
          }

          // 6. Record Vote Record
          const voteRecord: VoteRecord = {
            id: `v_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            eventId: EVENT_ID,
            voterHash,
            outletCode,
            contestantId,
            timestamp: new Date().toISOString(),
          };

          this.votes.set(voteKey, voteRecord);
          this.boundOutlets.set(voterHash, outletCode);

          // Increment vote counts atomically
          contestant.votes += 1;
          outlet.totalVotes += 1;

          this.auditLogs.unshift({
            id: `audit_${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'VOTE_CAST',
            outletCode,
            actor: `VOTER_${voterHash.substring(0, 8)}`,
            details: `Cast 1 vote for ${contestant.numberDisplay} - ${contestant.name}.`,
          });

          this.saveToDisk();

          // Notify real-time listeners for this outlet
          this.notify(outletCode);

          return resolve({
            success: true,
            contestant,
            outlet,
          });
        } catch (err) {
          console.error('Error during atomic vote cast:', err);
          return resolve({
            success: false,
            error: 'Internal server error while processing vote.',
            code: 'SERVER_ERROR',
          });
        }
      });
    });
  }

  // Audit Logs
  public getAuditLogs(outletCode?: OutletCode, limit = 50): AuditLogEntry[] {
    if (!outletCode) {
      return this.auditLogs.slice(0, limit);
    }
    return this.auditLogs.filter((log) => log.outletCode === outletCode).slice(0, limit);
  }

  public resetAllToDemo() {
    this.initOutlets();
    this.seedDemoData();
    for (const code of Object.keys(INITIAL_OUTLETS) as OutletCode[]) {
      this.notify(code);
    }
  }
}

// Singleton instance for server
export const votingEngine = new VotingEngine();
