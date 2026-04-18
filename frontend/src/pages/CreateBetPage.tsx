import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Bet } from "@/types/api";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const schema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(["RECURRING", "LAST_MAN_STANDING"]),
  visibility: z.enum(["PUBLIC", "PRIVATE"]),
  entryTokens: z.coerce.number().int().min(10).max(10000),
  proofDescription: z.string().min(5),
  scheduledDays: z.array(z.string()).min(1, "Pick at least one day"),
  startDate: z.string().min(1, "Required"),
  endDate: z.string().min(1, "Required"),
});
type FormData = z.infer<typeof schema>;

export default function CreateBetPage() {
  const navigate = useNavigate();
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "RECURRING",
      visibility: "PRIVATE",
      entryTokens: 100,
      scheduledDays: [],
    },
  });

  const betType = watch("type");

  const toggleDay = (day: string) => {
    const updated = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day];
    setSelectedDays(updated);
    setValue("scheduledDays", updated, { shouldValidate: true });
  };

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await api.post<{ success: boolean; bet: Bet }>("/api/bets", data);
      return res.data.bet;
    },
    onSuccess: (bet) => {
      toast.success("Bet created!");
      void navigate(`/bets/${bet.id}`);
    },
    onError: () => toast.error("Failed to create bet"),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Create a Bet</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Put skin in the game and hold yourself accountable.
        </p>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        {/* Bet type */}
        <Card className="glass-card border-white/5 bg-background/40 shadow-sm rounded-xl">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-sm font-semibold">Bet Type</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 px-5 pb-5">
            {(["RECURRING", "LAST_MAN_STANDING"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setValue("type", type)}
                className={cn(
                  "p-3 rounded-lg border text-left transition-colors",
                  betType === type
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50",
                )}
              >
                <div className="font-medium text-sm">
                  {type === "RECURRING" ? "🤝 TrustPod" : "⚡ Last Man Standing"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {type === "RECURRING"
                    ? "Group accountability, peer voting"
                    : "Survive the longest, winner takes all"}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Details */}
        <Card className="glass-card border-white/5 bg-background/40 shadow-sm rounded-xl">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-sm font-semibold">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            <div className="space-y-1">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="e.g. 30-day workout challenge" {...register("title")} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" placeholder="What's this bet about?" {...register("description")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="proofDescription">Proof requirement</Label>
              <Input
                id="proofDescription"
                placeholder="e.g. Photo of gym receipt or workout selfie"
                {...register("proofDescription")}
              />
              {errors.proofDescription && (
                <p className="text-xs text-destructive">{errors.proofDescription.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card className="glass-card border-white/5 bg-background/40 shadow-sm rounded-xl">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-sm font-semibold">Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="startDate">Start date</Label>
                <Input id="startDate" type="date" {...register("startDate")} />
                {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="endDate">End date</Label>
                <Input id="endDate" type="date" {...register("endDate")} />
                {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Check-in days</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs border transition-colors",
                      selectedDays.includes(day)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
              {errors.scheduledDays && (
                <p className="text-xs text-destructive">{errors.scheduledDays.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tokens & visibility */}
        <Card className="glass-card border-white/5 bg-background/40 shadow-sm rounded-xl">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-sm font-semibold">Stakes & Visibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            <div className="space-y-1">
              <Label htmlFor="entryTokens">Entry tokens</Label>
              <Input id="entryTokens" type="number" min={10} max={10000} {...register("entryTokens")} />
              {errors.entryTokens && (
                <p className="text-xs text-destructive">{errors.entryTokens.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Public</Label>
                <p className="text-xs text-muted-foreground">Anyone can find and join</p>
              </div>
              <Switch
                checked={watch("visibility") === "PUBLIC"}
                onCheckedChange={(v) => setValue("visibility", v ? "PUBLIC" : "PRIVATE")}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full rounded-xl py-6 text-base font-semibold shadow-sm" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating…" : "Create Bet"}
        </Button>
      </form>
    </div>
  );
}
