import { useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, Camera, CheckCircle, XCircle, Clock } from "lucide-react";
import type { BetCheckInDay, Bet, ProofSubmission } from "@/types/api";

export default function CheckInPage() {
  const { betId, dayId } = useParams<{ betId: string; dayId?: string }>();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const { data: bet } = useQuery({
    queryKey: ["bet", betId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; bet: Bet }>(`/api/bets/${betId!}`);
      return res.data.bet;
    },
    enabled: !!betId,
  });

  const { data: checkIn, isLoading } = useQuery({
    queryKey: ["checkin-today", betId],
    queryFn: async () => {
      if (dayId) {
        const res = await api.get<{ success: boolean; checkIns: BetCheckInDay[] }>(
          `/api/bets/${betId!}/checkins`,
        );
        return res.data.checkIns.find((c) => c.id === dayId) ?? null;
      }
      const res = await api.get<{ success: boolean; checkIn: BetCheckInDay | null }>(
        `/api/bets/${betId!}/checkins/today`,
      );
      return res.data.checkIn;
    },
    enabled: !!betId,
  });

  const { data: proofs = [] } = useQuery({
    queryKey: ["proofs", betId, checkIn?.id],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; proofs: ProofSubmission[] }>(
        `/api/bets/${betId!}/checkins/${checkIn!.id}/proof`,
      );
      return res.data.proofs;
    },
    enabled: !!checkIn,
    refetchInterval: 5000,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!file || !checkIn) return;
      const formData = new FormData();
      formData.append("proof", file);
      await api.post(`/api/bets/${betId!}/checkins/${checkIn.id}/proof`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      toast.success("Proof submitted!");
      setFile(null);
      setPreview(null);
      void qc.invalidateQueries({ queryKey: ["proofs", betId, checkIn?.id] });
      void qc.invalidateQueries({ queryKey: ["checkin-today", betId] });
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Upload failed"),
  });

  const voteMutation = useMutation({
    mutationFn: async ({ proofId, choice }: { proofId: string; choice: "ACCEPT" | "REJECT" }) => {
      await api.post(`/api/bets/${betId!}/checkins/${checkIn!.id}/proof/${proofId}/vote`, {
        choice,
      });
    },
    onSuccess: () => {
      toast.success("Vote cast!");
      void qc.invalidateQueries({ queryKey: ["proofs"] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  if (isLoading) return <Skeleton className="h-64" />;

  if (!checkIn) {
    return (
      <div className="max-w-lg">
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Clock className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
            <p className="font-medium">No check-in scheduled today</p>
            <p className="text-sm text-muted-foreground">Come back on your next scheduled day.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const myProofs = proofs.filter((p) => p.userId === user?.id);
  const otherProofs = proofs.filter((p) => p.userId !== user?.id);
  const alreadyPassed = myProofs.some((p) =>
    ["AI_PASSED", "PEER_PASSED"].includes(p.status),
  );
  const attemptsLeft = 2 - myProofs.length;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Daily Check-in</h1>
        {bet && <p className="text-muted-foreground text-sm">{bet.title}</p>}
      </div>

      {/* Status */}
      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          {checkIn.status === "CHECKED_IN" || alreadyPassed ? (
            <>
              <CheckCircle className="h-6 w-6 text-green-400" />
              <div>
                <p className="font-medium text-green-400">Checked in!</p>
                <p className="text-xs text-muted-foreground">Great job today 🎉</p>
              </div>
            </>
          ) : checkIn.status === "MISSED" ? (
            <>
              <XCircle className="h-6 w-6 text-red-400" />
              <div>
                <p className="font-medium text-red-400">Missed</p>
                <p className="text-xs text-muted-foreground">Better luck tomorrow</p>
              </div>
            </>
          ) : (
            <>
              <Clock className="h-6 w-6 text-yellow-400" />
              <div>
                <p className="font-medium">Window open</p>
                <p className="text-xs text-muted-foreground">
                  {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Upload section */}
      {checkIn.status === "OPEN" && !alreadyPassed && attemptsLeft > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Submit Proof</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bet && (
              <p className="text-xs text-muted-foreground bg-muted rounded px-3 py-2">
                📋 {bet.proofDescription}
              </p>
            )}

            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {preview ? (
                <img src={preview} alt="preview" className="max-h-40 mx-auto rounded-md" />
              ) : (
                <div className="space-y-1">
                  <Camera className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to upload photo</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP · Max 5MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />

            {file && (
              <Button
                className="w-full"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
              >
                <Upload className="mr-2 h-4 w-4" />
                {submitMutation.isPending ? "Uploading…" : "Submit Proof"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* My submitted proofs */}
      {myProofs.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3">My Submissions</h3>
          <div className="space-y-3">
            {myProofs.map((proof) => (
              <ProofCard key={proof.id} proof={proof} />
            ))}
          </div>
        </div>
      )}

      {/* Peer proofs to vote on */}
      {otherProofs.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3">Vote on Peers</h3>
          <div className="space-y-3">
            {otherProofs.map((proof) => {
              const alreadyVoted = proof.votes.some((v) => v.voterId === user?.id);
              return (
                <Card key={proof.id}>
                  <CardContent className="pt-4 space-y-3">
                    <img
                      src={proof.imageUrl}
                      alt="proof"
                      className="w-full max-h-52 object-cover rounded-md"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{proof.user.displayName}</p>
                      <ProofStatusBadge status={proof.status} />
                    </div>
                    {proof.status === "PEER_VOTING" && !alreadyVoted && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-green-500/50 text-green-400 hover:bg-green-500/10"
                          onClick={() => voteMutation.mutate({ proofId: proof.id, choice: "ACCEPT" })}
                        >
                          ✅ Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
                          onClick={() => voteMutation.mutate({ proofId: proof.id, choice: "REJECT" })}
                        >
                          ❌ Reject
                        </Button>
                      </div>
                    )}
                    {alreadyVoted && (
                      <p className="text-xs text-muted-foreground text-center">You voted</p>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {proof.votes.filter((v) => v.choice === "ACCEPT").length} accept ·{" "}
                      {proof.votes.filter((v) => v.choice === "REJECT").length} reject
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ProofCard({ proof }: { proof: ProofSubmission }) {
  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <img src={proof.imageUrl} alt="proof" className="w-full max-h-52 object-cover rounded-md" />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Attempt {proof.attemptNumber}</p>
          <ProofStatusBadge status={proof.status} />
        </div>
        {proof.aiReason && (
          <p className="text-xs text-muted-foreground bg-muted rounded px-2 py-1">
            🤖 {proof.aiReason}
          </p>
        )}
        {proof.status === "AI_REVIEWING" && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">AI reviewing…</p>
            <Progress value={undefined} className="h-1.5 animate-pulse" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProofStatusBadge({ status }: { status: ProofSubmission["status"] }) {
  const config: Record<ProofSubmission["status"], { label: string; className: string }> = {
    PENDING_REVIEW: { label: "Pending", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    AI_REVIEWING: { label: "AI Reviewing", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    AI_PASSED: { label: "Passed ✓", className: "bg-green-500/20 text-green-400 border-green-500/30" },
    AI_FAILED: { label: "Failed ✗", className: "bg-red-500/20 text-red-400 border-red-500/30" },
    PEER_VOTING: { label: "Voting", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
    PEER_PASSED: { label: "Passed ✓", className: "bg-green-500/20 text-green-400 border-green-500/30" },
    PEER_FAILED: { label: "Failed ✗", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  };
  const c = config[status];
  return <Badge className={`text-xs border ${c.className}`}>{c.label}</Badge>;
}
