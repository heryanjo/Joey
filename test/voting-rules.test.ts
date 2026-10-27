import test from 'node:test';
import assert from 'node:assert/strict';
import { VotingEngine } from '../src/server/votingEngine.ts';

test('VotingEngine: First vote succeeds and increments contestant and outlet vote count', async () => {
  const engine = new VotingEngine({ inMemory: true });
  const contestants = engine.getContestants('BOPIK');
  assert.ok(contestants.length > 0, 'BOPIK should have contestants');

  const target = contestants[0];
  const initialVotes = target.votes;
  const initialOutlet = engine.getOutlet('BOPIK')!;
  const initialOutletVotes = initialOutlet.totalVotes;

  const result = await engine.castVote({
    voterId: 'test-voter-device-abc-12345',
    outletCode: 'BOPIK',
    contestantId: target.id,
  });

  assert.equal(result.success, true);
  assert.equal(result.contestant?.votes, initialVotes + 1);
  assert.equal(engine.getOutlet('BOPIK')?.totalVotes, initialOutletVotes + 1);

  // Check voter status
  const status = engine.getVoterStatus('test-voter-device-abc-12345');
  assert.equal(status.hasVoted, true);
  assert.equal(status.contestant?.id, target.id);
});

test('VotingEngine: Duplicate vote from same voting identity is rejected', async () => {
  const engine = new VotingEngine({ inMemory: true });
  const contestants = engine.getContestants('BOPIK');
  const target1 = contestants[0];
  const target2 = contestants[1];

  // First vote succeeds
  const first = await engine.castVote({
    voterId: 'unique-voter-session-999',
    outletCode: 'BOPIK',
    contestantId: target1.id,
  });
  assert.equal(first.success, true);

  // Second vote on same contestant fails
  const second = await engine.castVote({
    voterId: 'unique-voter-session-999',
    outletCode: 'BOPIK',
    contestantId: target1.id,
  });
  assert.equal(second.success, false);
  assert.equal(second.code, 'DUPLICATE_VOTE');

  // Second vote on different contestant fails as well
  const third = await engine.castVote({
    voterId: 'unique-voter-session-999',
    outletCode: 'BOPIK',
    contestantId: target2.id,
  });
  assert.equal(third.success, false);
  assert.equal(third.code, 'DUPLICATE_VOTE');
});

test('VotingEngine: Voter cannot vote in a different outlet in the same event', async () => {
  const engine = new VotingEngine({ inMemory: true });
  const pikContestant = engine.getContestants('BOPIK')[0];
  const scbdContestant = engine.getContestants('BOSCBD')[0];

  // Vote in PIK
  const pikVote = await engine.castVote({
    voterId: 'traveling-guest-session-444',
    outletCode: 'BOPIK',
    contestantId: pikContestant.id,
  });
  assert.equal(pikVote.success, true);

  // Attempt vote in SCBD in same event
  const scbdVote = await engine.castVote({
    voterId: 'traveling-guest-session-444',
    outletCode: 'BOSCBD',
    contestantId: scbdContestant.id,
  });
  assert.equal(scbdVote.success, false);
  assert.equal(scbdVote.code, 'DUPLICATE_VOTE');
});

test('VotingEngine: Simultaneous race-condition votes result in exactly one accepted vote', async () => {
  const engine = new VotingEngine({ inMemory: true });
  const contestant = engine.getContestants('BOKG')[0];
  const initialVotes = contestant.votes;
  const voterId = 'concurrent-voter-race-111';

  // Fire 5 simultaneous vote promises
  const promises = [
    engine.castVote({ voterId, outletCode: 'BOKG', contestantId: contestant.id }),
    engine.castVote({ voterId, outletCode: 'BOKG', contestantId: contestant.id }),
    engine.castVote({ voterId, outletCode: 'BOKG', contestantId: contestant.id }),
    engine.castVote({ voterId, outletCode: 'BOKG', contestantId: contestant.id }),
    engine.castVote({ voterId, outletCode: 'BOKG', contestantId: contestant.id }),
  ];

  const results = await Promise.all(promises);
  const successes = results.filter((r) => r.success);
  const failures = results.filter((r) => !r.success);

  assert.equal(successes.length, 1, 'Exactly one simultaneous vote should succeed');
  assert.equal(failures.length, 4, 'Remaining simultaneous votes must fail');
  assert.equal(contestant.votes, initialVotes + 1, 'Vote count must only increment by 1');
});

test('VotingEngine: Outlet isolation prevents voting for contestant from another outlet', async () => {
  const engine = new VotingEngine({ inMemory: true });
  const pikContestant = engine.getContestants('BOPIK')[0];

  // Attempt to vote for BOPIK contestant under BOKG outlet URL
  const result = await engine.castVote({
    voterId: 'hacker-cross-outlet-777',
    outletCode: 'BOKG',
    contestantId: pikContestant.id,
  });

  assert.equal(result.success, false);
  assert.equal(result.code, 'OUTLET_MISMATCH');
});

test('VotingEngine: Voting is blocked when outlet voting is closed', async () => {
  const engine = new VotingEngine({ inMemory: true });
  const contestant = engine.getContestants('BOSBY')[0];

  // Close voting for BOSBY
  engine.setOutletVotingStatus('BOSBY', false, 'TEST_ADMIN');

  const result = await engine.castVote({
    voterId: 'late-guest-voter-888',
    outletCode: 'BOSBY',
    contestantId: contestant.id,
  });

  assert.equal(result.success, false);
  assert.equal(result.code, 'VOTING_CLOSED');
});

test('VotingEngine: Leaderboard correctly sorts by vote count descending', async () => {
  const engine = new VotingEngine({ inMemory: true });
  const leaderboard = engine.getLeaderboard('BOPIK');

  for (let i = 0; i < leaderboard.length - 1; i++) {
    assert.ok(
      leaderboard[i].votes >= leaderboard[i + 1].votes,
      `Rank ${i + 1} (${leaderboard[i].votes}) should have >= votes than Rank ${i + 2} (${leaderboard[i + 1].votes})`
    );
    assert.equal(leaderboard[i].rank, i + 1);
  }
});

test('VotingEngine: Newly added contestants with zero votes appear on leaderboard', () => {
  const engine = new VotingEngine({ inMemory: true });
  const newContestant = engine.addContestant({
    outletCode: 'BOMDN',
    name: 'Zero Vote Test Contestant',
    costume: 'Shadow Stalker',
    imageUrl: 'https://example.com/test.jpg',
    hasConsented: true,
    actor: 'TEST',
  });

  assert.equal(newContestant.votes, 0);

  const leaderboard = engine.getLeaderboard('BOMDN');
  const found = leaderboard.find((c) => c.id === newContestant.id);
  assert.ok(found, 'Contestant with 0 votes must appear on leaderboard');
  assert.equal(found?.votes, 0);
});

test('VotingEngine: Deterministic tie-break sorts equal votes by contestant number ascending', () => {
  const engine = new VotingEngine({ inMemory: true });
  const c1 = engine.addContestant({
    outletCode: 'BOGS',
    name: 'Contestant Early',
    costume: 'Theme A',
    imageUrl: 'https://example.com/a.jpg',
    hasConsented: true,
    actor: 'TEST',
  });
  const c2 = engine.addContestant({
    outletCode: 'BOGS',
    name: 'Contestant Later',
    costume: 'Theme B',
    imageUrl: 'https://example.com/b.jpg',
    hasConsented: true,
    actor: 'TEST',
  });

  // Both have 0 votes
  assert.equal(c1.votes, 0);
  assert.equal(c2.votes, 0);
  assert.ok(c1.number < c2.number, 'c1 should have smaller number than c2');

  const leaderboard = engine.getLeaderboard('BOGS');
  const idx1 = leaderboard.findIndex((c) => c.id === c1.id);
  const idx2 = leaderboard.findIndex((c) => c.id === c2.id);

  assert.ok(idx1 < idx2, 'Contestant with lower number should rank higher when votes are tied');
});

test('Staff Permissions: Role check enforces outlet scoping', async () => {
  const { verifyStaffAccess } = await import('../src/server/votingEngine.ts');

  // Super Admin can access any outlet
  const superCheck = verifyStaffAccess('heryanjojo@gmail.com', 'BOPIK');
  assert.equal(superCheck.ok, true);
  assert.equal(superCheck.user?.role, 'SUPER_ADMIN');

  const superCheck2 = verifyStaffAccess('heryanjojo@gmail.com', 'BOMDN');
  assert.equal(superCheck2.ok, true);

  // Outlet Admin can access assigned outlet
  const pikAdminCheck = verifyStaffAccess('admin.pik@blackowl.id', 'BOPIK');
  assert.equal(pikAdminCheck.ok, true);
  assert.equal(pikAdminCheck.user?.role, 'OUTLET_ADMIN');

  // Outlet Admin is strictly blocked from accessing another outlet
  const pikAdminBlocked = verifyStaffAccess('admin.pik@blackowl.id', 'BOSCBD');
  assert.equal(pikAdminBlocked.ok, false);
  assert.equal(pikAdminBlocked.status, 403);

  // Unauthorized user is rejected
  const unknownUser = verifyStaffAccess('stranger@example.com', 'BOPIK');
  assert.equal(unknownUser.ok, false);
  assert.equal(unknownUser.status, 403);
});

test('Staff Management: Add, verify and remove dynamic staff user', async () => {
  const { addStaffUser, removeStaffUser, verifyStaffAccess, getStaffUsersList } = await import('../src/server/votingEngine.ts');

  // Add new outlet admin
  const added = addStaffUser({
    email: 'new.admin@blackowl.id',
    name: 'New Admin Test',
    role: 'OUTLET_ADMIN',
    assignedOutlet: 'BOKG',
  });
  assert.equal(added.email, 'new.admin@blackowl.id');

  // Verify access for assigned outlet
  const allowedCheck = verifyStaffAccess('new.admin@blackowl.id', 'BOKG');
  assert.equal(allowedCheck.ok, true);

  // Verify forbidden for another outlet
  const forbiddenCheck = verifyStaffAccess('new.admin@blackowl.id', 'BOPIK');
  assert.equal(forbiddenCheck.ok, false);
  assert.equal(forbiddenCheck.status, 403);

  // Cannot delete primary owner
  const cannotRemoveOwner = removeStaffUser('heryanjojo@gmail.com');
  assert.equal(cannotRemoveOwner, false);

  // Successfully remove dynamic staff
  const removed = removeStaffUser('new.admin@blackowl.id');
  assert.equal(removed, true);

  const afterRemoved = verifyStaffAccess('new.admin@blackowl.id', 'BOKG');
  assert.equal(afterRemoved.ok, false);
});

test('Staff Management: Support custom individual PIN and updating staff PIN', async () => {
  const { addStaffUser, updateStaffPin, removeStaffUser, STAFF_USERS } = await import('../src/server/votingEngine.ts');

  // Add Budi with custom PIN
  const budi = addStaffUser({
    email: 'budi@blackowl.id',
    name: 'Budi Santoso',
    role: 'OUTLET_ADMIN',
    assignedOutlet: 'BOPIK',
    pin: '8821',
  });

  assert.equal(budi.pin, '8821');
  assert.equal(STAFF_USERS['budi@blackowl.id'].pin, '8821');

  // Update Budi's PIN
  const updatedBudi = updateStaffPin('budi@blackowl.id', 'budi999');
  assert.equal(updatedBudi?.pin, 'budi999');
  assert.equal(STAFF_USERS['budi@blackowl.id'].pin, 'budi999');

  // Clean up
  removeStaffUser('budi@blackowl.id');
});

test('Outlet Management: Bulk delete contestants and reset single outlet to 0', async () => {
  const { VotingEngine } = await import('../src/server/votingEngine.ts');
  const engine = new VotingEngine({ inMemory: true });

  const c1 = engine.addContestant({
    outletCode: 'BOKG',
    name: 'Bulk Test 1',
    costume: 'Costume 1',
    imageUrl: 'https://example.com/1.jpg',
    hasConsented: true,
    actor: 'TEST',
  });

  const c2 = engine.addContestant({
    outletCode: 'BOKG',
    name: 'Bulk Test 2',
    costume: 'Costume 2',
    imageUrl: 'https://example.com/2.jpg',
    hasConsented: true,
    actor: 'TEST',
  });

  // Cast vote
  await engine.castVote({
    voterId: 'voter_bulk_test_12345',
    outletCode: 'BOKG',
    contestantId: c1.id,
  });

  const outletBefore = engine.getOutlet('BOKG');
  assert.ok((outletBefore?.totalVotes || 0) > 0);

  // Bulk delete c1
  const bulkRes = engine.deleteMultipleContestants([c1.id], 'BOKG', 'TEST');
  assert.equal(bulkRes.deletedCount, 1);
  assert.equal(engine.getContestantById(c1.id), undefined);
  assert.ok(engine.getContestantById(c2.id) !== undefined);

  // Reset BOKG outlet to 0
  const resetRes = engine.resetOutlet('BOKG', 'TEST');
  assert.equal(resetRes.success, true);
  assert.equal(resetRes.outlet.totalVotes, 0);
  assert.equal(engine.getContestants('BOKG', true).length, 0);
});

test('Privacy & Instagram: Phone number is stored for admin but redacted for public voting', async () => {
  const engine = new VotingEngine({ inMemory: true });
  const newContestant = engine.addContestant({
    outletCode: 'BOPIK',
    name: 'Natasha Val',
    costume: 'natashaval_queen', // user entered without @
    instagram: 'natashaval_queen',
    phoneNumber: '081298765432',
    imageUrl: 'https://example.com/natasha.jpg',
    hasConsented: true,
    actor: 'Heryan Jojo',
  });

  // Verify Instagram handle was normalized with leading @
  assert.equal(newContestant.instagram, '@natashaval_queen');
  assert.equal(newContestant.costume, '@natashaval_queen');
  assert.equal(newContestant.phoneNumber, '081298765432');

  // Admin access (includePrivate = true): phone number must be present
  const adminList = engine.getContestants('BOPIK', true, true);
  const foundAdmin = adminList.find((c) => c.id === newContestant.id);
  assert.equal(foundAdmin?.phoneNumber, '081298765432');

  // Public guest access (includePrivate = false): phone number must be stripped
  const publicList = engine.getContestants('BOPIK', false, false);
  const foundPublic = publicList.find((c) => c.id === newContestant.id);
  assert.equal(foundPublic?.phoneNumber, undefined);

  // Public leaderboard access: phone number must be stripped
  const leaderboard = engine.getLeaderboard('BOPIK');
  const foundLeaderboard = leaderboard.find((c) => c.id === newContestant.id);
  assert.equal(foundLeaderboard?.phoneNumber, undefined);
});

