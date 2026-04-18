export type BetType = "RECURRING" | "LAST_MAN_STANDING";
export type BetStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type BetVisibility = "PUBLIC" | "PRIVATE";
export type ParticipantStatus = "ACTIVE" | "ELIMINATED" | "COMPLETED";
export type DayStatus = "OPEN" | "CHECKED_IN" | "MISSED" | "CLOSED";
export type ProofStatus =
  | "PENDING_REVIEW"
  | "AI_REVIEWING"
  | "AI_PASSED"
  | "AI_FAILED"
  | "PEER_VOTING"
  | "PEER_PASSED"
  | "PEER_FAILED";
export type VoteChoice = "ACCEPT" | "REJECT";
export type TransactionType =
  | "SIGNUP_BONUS"
  | "BET_LOCK"
  | "BET_REFUND"
  | "BET_PAYOUT"
  | "BET_DEDUCT"
  | "PAYOUT_CLAIM";
export type NotificationType =
  | "CHECK_IN_REMINDER"
  | "VOTE_NEEDED"
  | "PROOF_PASSED"
  | "PROOF_FAILED"
  | "BET_STARTED"
  | "BET_COMPLETED"
  | "BET_CANCELLED"
  | "PLAYER_ELIMINATED"
  | "PAYOUT_AVAILABLE";

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  tokenBalance: number;
  createdAt: string;
}

export interface BetParticipant {
  id: string;
  betId: string;
  userId: string;
  user: User;
  status: ParticipantStatus;
  streak: number;
  longestStreak: number;
  tokensLocked: number;
  joinedAt: string;
}

export interface Bet {
  id: string;
  title: string;
  description: string;
  type: BetType;
  status: BetStatus;
  visibility: BetVisibility;
  entryTokens: number;
  proofDescription: string;
  scheduledDays: string[];
  startDate: string;
  endDate: string;
  inviteCode: string;
  creatorId: string;
  creator: User;
  participants: BetParticipant[];
  _count: { participants: number };
  createdAt: string;
}

export interface BetCheckInDay {
  id: string;
  betId: string;
  participantId: string;
  scheduledDate: string;
  deadlineAt: string;
  status: DayStatus;
  checkedInAt: string | null;
  proofSubmissions: ProofSubmission[];
}

export interface ProofVote {
  id: string;
  proofId: string;
  voterId: string;
  choice: VoteChoice;
  createdAt: string;
}

export interface ProofSubmission {
  id: string;
  betId: string;
  participantId: string;
  userId: string;
  checkInDayId: string;
  imageUrl: string;
  status: ProofStatus;
  attemptNumber: number;
  aiVerdict: string | null;
  aiReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  votingDeadline: string | null;
  user: User;
  checkInDay: BetCheckInDay;
  bet: Bet;
  votes: ProofVote[];
}

export interface TokenTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  betId: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  betId: string | null;
  createdAt: string;
}

export interface ApiSuccess<T> {
  success: true;
  data?: T;
}

export interface ApiError {
  success: false;
  message: string;
}
