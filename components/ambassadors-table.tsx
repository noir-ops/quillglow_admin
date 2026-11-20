"use client"

import { useState, useTransition } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Users,
  Gift,
  ExternalLink,
  Copy,
  Award,
  Globe,
  Mail,
  GraduationCap,
  MessageSquare,
  Crown,
  Sparkles,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import {
  updateAmbassadorStatus,
  getAmbassadorReferrals,
  getAmbassadorRewards,
  getAmbassadorCertificates,
  issueReward,
  markRewardIssued,
  verifyReferral,
  deleteAmbassador,
  getEligibleTier,
  upgradeAmbassadorSubscription,
  getAmbassadorSubscriptionStatus,
} from "@/app/admin/(protected)/ambassadors/actions"

type Ambassador = {
  id: string
  user_id: string | null
  name: string
  email: string
  university: string
  country: string
  status: string
  referral_code: string
  referral_link: string
  message: string
  total_referrals: number
  verified_referrals: number
  reward_level: number
  created_at: string
  updated_at: string
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "Pending",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  approved: {
    label: "Approved",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: <XCircle className="h-3 w-3" />,
  },
  suspended: {
    label: "Suspended",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
}

export function AmbassadorsTable({ ambassadors }: { ambassadors: Ambassador[] }) {
  const [selectedAmbassador, setSelectedAmbassador] = useState<Ambassador | null>(null)
  const [referrals, setReferrals] = useState<any[]>([])
  const [rewards, setRewards] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Issue reward form state
  const [rewardMilestone, setRewardMilestone] = useState("")
  const [rewardType, setRewardType] = useState("")
  const [rewardDesc, setRewardDesc] = useState("")
  const [issuingReward, setIssuingReward] = useState(false)

  // Subscription upgrade state
  const [subscription, setSubscription] = useState<any>(null)
  const [loadingSubscription, setLoadingSubscription] = useState(false)
  const [upgradingSubscription, setUpgradingSubscription] = useState(false)

  const openDetails = async (ambassador: Ambassador) => {
    setSelectedAmbassador(ambassador)
    setLoadingDetails(true)
    setLoadingSubscription(true)
    const [refs, rews, certs] = await Promise.all([
      getAmbassadorReferrals(ambassador.id),
      getAmbassadorRewards(ambassador.id),
      getAmbassadorCertificates(ambassador.id),
    ])
    setReferrals(refs)
    setRewards(rews)
    setCertificates(certs)
    setLoadingDetails(false)

    // Fetch subscription status if ambassador has a user_id
    if (ambassador.user_id) {
      const sub = await getAmbassadorSubscriptionStatus(ambassador.user_id)
      setSubscription(sub)
    } else {
      setSubscription(null)
    }
    setLoadingSubscription(false)
  }

  const handleStatusChange = (ambassadorId: string, status: "pending" | "approved" | "rejected" | "suspended") => {
    startTransition(async () => {
      const result = await updateAmbassadorStatus(ambassadorId, status)
      if (result.success) {
        toast({ title: "Status Updated", description: `Ambassador status changed to ${status}.` })
        setSelectedAmbassador((prev) => (prev ? { ...prev, status } : null))
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      }
    })
  }

  const handleDelete = (ambassadorId: string) => {
    startTransition(async () => {
      const result = await deleteAmbassador(ambassadorId)
      if (result.success) {
        toast({ title: "Deleted", description: "Ambassador removed." })
        setSelectedAmbassador(null)
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      }
    })
  }

  const handleVerifyReferral = (referralId: string) => {
    startTransition(async () => {
      const result = await verifyReferral(referralId)
      if (result.success) {
        toast({ title: "Referral Verified" })
        setReferrals((prev) => prev.map((r) => (r.id === referralId ? { ...r, status: "verified" } : r)))
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      }
    })
  }

  const handleMarkRewardIssued = (rewardId: string) => {
    startTransition(async () => {
      const result = await markRewardIssued(rewardId)
      if (result.success) {
        toast({ title: "Reward Marked as Issued" })
        setRewards((prev) =>
          prev.map((r) => (r.id === rewardId ? { ...r, issued: true, issued_at: new Date().toISOString() } : r)),
        )
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      }
    })
  }

  const handleIssueReward = async () => {
    if (!selectedAmbassador || !rewardMilestone || !rewardType || !rewardDesc) return
    setIssuingReward(true)
    const result = await issueReward(
      selectedAmbassador.id,
      parseInt(rewardMilestone),
      rewardType,
      rewardDesc,
    )
    if (result.success) {
      toast({ title: "Reward Issued Successfully" })
      setRewardMilestone("")
      setRewardType("")
      setRewardDesc("")
      const updatedRewards = await getAmbassadorRewards(selectedAmbassador.id)
      setRewards(updatedRewards)
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" })
    }
    setIssuingReward(false)
  }

  const handleUpgradeSubscription = async () => {
    if (!selectedAmbassador || !selectedAmbassador.user_id) {
      toast({ title: "Error", description: "Ambassador has no linked user account", variant: "destructive" })
      return
    }

    setUpgradingSubscription(true)
    const result = await upgradeAmbassadorSubscription(
      selectedAmbassador.id,
      selectedAmbassador.user_id,
      selectedAmbassador.verified_referrals
    )

    if (result.success) {
      toast({ title: "Subscription Upgraded", description: `Ambassador now has ${result.tier}` })
      // Refresh subscription status
      const sub = await getAmbassadorSubscriptionStatus(selectedAmbassador.user_id)
      setSubscription(sub)
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" })
    }
    setUpgradingSubscription(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Copied to clipboard" })
  }

  // Get eligible tier for current ambassador
  const eligibleTier = selectedAmbassador ? getEligibleTier(selectedAmbassador.verified_referrals) : null

  // Referral tier thresholds for display
  const TIER_INFO = [
    { min: 15, months: 2, label: "2 Months Genius" },
    { min: 50, months: 3, label: "3 Months Genius" },
    { min: 100, months: 6, label: "6 Months Genius" },
    { min: 500, months: -1, label: "Forever Genius" },
  ]

  return (
    <>
      {/* Desktop Table */}
      <Card className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Ambassador</TableHead>
                <TableHead>University / Country</TableHead>
                <TableHead>Referral Code</TableHead>
                <TableHead>Referrals</TableHead>
                <TableHead>Reward Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ambassadors.map((ambassador) => {
                const status = statusConfig[ambassador.status] || statusConfig.pending
                return (
                  <TableRow key={ambassador.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/20 text-primary font-bold">
                            {ambassador.name?.charAt(0)?.toUpperCase() || "A"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{ambassador.name}</p>
                          <p className="text-xs text-muted-foreground">{ambassador.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium line-clamp-1">{ambassador.university || "—"}</p>
                        <p className="text-xs text-muted-foreground">{ambassador.country || "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {ambassador.referral_code}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(ambassador.referral_code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-semibold text-green-500">{ambassador.verified_referrals}</span>
                        <span className="text-muted-foreground"> / {ambassador.total_referrals}</span>
                        <p className="text-xs text-muted-foreground">verified / total</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        Level {ambassador.reward_level || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`flex items-center gap-1 w-fit ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(ambassador.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => openDetails(ambassador)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {ambassadors.map((ambassador) => {
          const status = statusConfig[ambassador.status] || statusConfig.pending
          return (
            <Card key={ambassador.id} className="p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/20 text-primary font-bold">
                      {ambassador.name?.charAt(0)?.toUpperCase() || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{ambassador.name}</p>
                    <p className="text-xs text-muted-foreground">{ambassador.email}</p>
                  </div>
                </div>
                <Badge className={`flex items-center gap-1 ${status.color}`}>
                  {status.icon}
                  {status.label}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">University</p>
                  <p className="font-medium truncate">{ambassador.university || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Country</p>
                  <p className="font-medium">{ambassador.country || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Referrals</p>
                  <p className="font-medium">
                    <span className="text-green-500">{ambassador.verified_referrals}</span>
                    <span className="text-muted-foreground"> / {ambassador.total_referrals}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reward Level</p>
                  <p className="font-medium">Level {ambassador.reward_level || 0}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => openDetails(ambassador)}>
                <Eye className="h-4 w-4 mr-1" />
                View Details
              </Button>
            </Card>
          )
        })}
      </div>

      {/* Ambassador Details Dialog */}
      <Dialog open={!!selectedAmbassador} onOpenChange={(open) => !open && setSelectedAmbassador(null)}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto bg-background border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
                  {selectedAmbassador?.name?.charAt(0)?.toUpperCase() || "A"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-bold">{selectedAmbassador?.name}</p>
                <p className="text-sm text-muted-foreground font-normal">{selectedAmbassador?.email}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedAmbassador && (
            <Tabs defaultValue="profile" className="mt-2">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="referrals">
                  Referrals ({referrals.length})
                </TabsTrigger>
                <TabsTrigger value="rewards">
                  Rewards ({rewards.length})
                </TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="p-4 space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Personal Info
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="break-all">{selectedAmbassador.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{selectedAmbassador.country || "Not specified"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{selectedAmbassador.university || "Not specified"}</span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Performance
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Referrals</span>
                        <span className="font-bold">{selectedAmbassador.total_referrals}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Verified Referrals</span>
                        <span className="font-bold text-green-500">{selectedAmbassador.verified_referrals}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Reward Level</span>
                        <Badge variant="outline">Level {selectedAmbassador.reward_level || 0}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <Badge className={statusConfig[selectedAmbassador.status]?.color || ""}>
                          {statusConfig[selectedAmbassador.status]?.label || selectedAmbassador.status}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                </div>

                <Card className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Referral Details
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground w-28">Referral Code:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-3 py-1 rounded font-mono">
                          {selectedAmbassador.referral_code}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyToClipboard(selectedAmbassador.referral_code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {selectedAmbassador.referral_link && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground w-28">Referral Link:</span>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm truncate text-blue-400">{selectedAmbassador.referral_link}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => copyToClipboard(selectedAmbassador.referral_link)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {selectedAmbassador.message && (
                  <Card className="p-4 space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Application Message
                    </h3>
                    <p className="text-sm leading-relaxed">{selectedAmbassador.message}</p>
                  </Card>
                )}
              </TabsContent>

              {/* Referrals Tab */}
              <TabsContent value="referrals" className="mt-4">
                {loadingDetails ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : referrals.length === 0 ? (
                  <Card className="p-8 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No referrals yet</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">{referrals.length} referral(s) total</p>
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>IP Address</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {referrals.map((referral) => (
                            <TableRow key={referral.id}>
                              <TableCell className="text-sm font-medium">
                                {referral.referred_email || "—"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    referral.status === "verified"
                                      ? "text-green-500 border-green-500/30"
                                      : "text-yellow-500 border-yellow-500/30"
                                  }
                                >
                                  {referral.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {referral.ip_address || "—"}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {new Date(referral.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                {referral.status !== "verified" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-500 border-green-500/30 hover:bg-green-500/10"
                                    onClick={() => handleVerifyReferral(referral.id)}
                                    disabled={isPending}
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Verify
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Rewards Tab */}
              <TabsContent value="rewards" className="mt-4 space-y-4">
                {/* Issue New Reward */}
                <Card className="p-4 space-y-4 border-primary/20 bg-primary/5">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Gift className="h-4 w-4 text-primary" />
                    Issue New Reward
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Milestone</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 5"
                        value={rewardMilestone}
                        onChange={(e) => setRewardMilestone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Reward Type</Label>
                      <Select value={rewardType} onValueChange={setRewardType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="premium_access">Premium Access</SelectItem>
                          <SelectItem value="gift_card">Gift Card</SelectItem>
                          <SelectItem value="merchandise">Merchandise</SelectItem>
                          <SelectItem value="certificate">Certificate</SelectItem>
                          <SelectItem value="cash">Cash Reward</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-3 space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Textarea
                        placeholder="Describe the reward..."
                        value={rewardDesc}
                        onChange={(e) => setRewardDesc(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleIssueReward}
                    disabled={issuingReward || !rewardMilestone || !rewardType || !rewardDesc}
                    className="w-full sm:w-auto"
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    {issuingReward ? "Issuing..." : "Issue Reward"}
                  </Button>
                </Card>

                {/* Existing Rewards */}
                {loadingDetails ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : rewards.length === 0 ? (
                  <Card className="p-8 text-center text-muted-foreground">
                    <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No rewards issued yet</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {rewards.map((reward) => (
                      <Card key={reward.id} className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Milestone {reward.milestone}</Badge>
                              <Badge variant="secondary">{reward.reward_type?.replace(/_/g, " ")}</Badge>
                            </div>
                            <p className="text-sm">{reward.reward_description}</p>
                            <p className="text-xs text-muted-foreground">
                              {reward.issued && reward.issued_at
                                ? `Issued on ${new Date(reward.issued_at).toLocaleDateString()}`
                                : "Not yet issued"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {reward.issued ? (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Issued
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-500 border-green-500/30 hover:bg-green-500/10"
                                onClick={() => handleMarkRewardIssued(reward.id)}
                                disabled={isPending}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Mark Issued
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Actions Tab */}
              <TabsContent value="actions" className="mt-4 space-y-4">
                {/* Subscription Upgrade Section */}
                <Card className="p-4 space-y-4 border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-blue-500/5">
                  <h3 className="font-semibold text-sm text-purple-400 uppercase tracking-wide flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    Subscription Rewards
                  </h3>

                  {/* Tier Progress */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Verified Referrals</span>
                      <span className="font-bold text-lg text-green-400">{selectedAmbassador.verified_referrals}</span>
                    </div>

                    {/* Tier Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {TIER_INFO.map((tier) => {
                        const isReached = selectedAmbassador.verified_referrals >= tier.min
                        const isCurrent = eligibleTier?.minReferrals === tier.min
                        return (
                          <div
                            key={tier.min}
                            className={`p-2 rounded-lg border text-center transition-all ${
                              isCurrent
                                ? "border-purple-500 bg-purple-500/20"
                                : isReached
                                  ? "border-green-500/30 bg-green-500/10"
                                  : "border-muted bg-muted/30 opacity-50"
                            }`}
                          >
                            <p className={`text-xs font-medium ${isCurrent ? "text-purple-400" : isReached ? "text-green-400" : "text-muted-foreground"}`}>
                              {tier.min}+ refs
                            </p>
                            <p className={`text-[10px] ${isCurrent ? "text-purple-300" : "text-muted-foreground"}`}>
                              {tier.label}
                            </p>
                            {isReached && (
                              <CheckCircle className={`h-3 w-3 mx-auto mt-1 ${isCurrent ? "text-purple-400" : "text-green-400"}`} />
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Current Subscription Status */}
                    {loadingSubscription ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500" />
                      </div>
                    ) : subscription ? (
                      <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Current Plan</span>
                          <Badge className={subscription.plan_type === "genius" ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"}>
                            {subscription.plan_type?.charAt(0).toUpperCase() + subscription.plan_type?.slice(1) || "None"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Status</span>
                          <Badge variant="outline" className={subscription.status === "active" ? "text-green-400 border-green-500/30" : "text-yellow-400 border-yellow-500/30"}>
                            {subscription.status}
                          </Badge>
                        </div>
                        {subscription.current_period_end && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Expires</span>
                            <span className="text-sm">{new Date(subscription.current_period_end).toLocaleDateString()}</span>
                          </div>
                        )}
                        {subscription.cancel_at_period_end && (
                          <Badge className="w-full justify-center bg-orange-500/20 text-orange-400 border-orange-500/30">
                            Will downgrade after period ends
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-muted/50 text-center">
                        <p className="text-sm text-muted-foreground">No subscription found</p>
                      </div>
                    )}

                    {/* Upgrade Button */}
                    {eligibleTier ? (
                      <Button
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        onClick={handleUpgradeSubscription}
                        disabled={upgradingSubscription || !selectedAmbassador.user_id}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        {upgradingSubscription ? "Upgrading..." : `Grant ${eligibleTier.label}`}
                      </Button>
                    ) : (
                      <div className="p-3 rounded-lg bg-muted/30 text-center">
                        <p className="text-sm text-muted-foreground">
                          Need at least 15 verified referrals to unlock subscription rewards
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Current: {selectedAmbassador.verified_referrals} / 15
                        </p>
                      </div>
                    )}

                    {!selectedAmbassador.user_id && (
                      <p className="text-xs text-orange-400 text-center">
                        Warning: Ambassador has no linked user account. Cannot upgrade subscription.
                      </p>
                    )}
                  </div>
                </Card>

                <Card className="p-4 space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Change Status
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="border-green-500/30 text-green-500 hover:bg-green-500/10"
                      disabled={selectedAmbassador.status === "approved" || isPending}
                      onClick={() => handleStatusChange(selectedAmbassador.id, "approved")}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                      disabled={selectedAmbassador.status === "rejected" || isPending}
                      onClick={() => handleStatusChange(selectedAmbassador.id, "rejected")}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      className="border-orange-500/30 text-orange-500 hover:bg-orange-500/10"
                      disabled={selectedAmbassador.status === "suspended" || isPending}
                      onClick={() => handleStatusChange(selectedAmbassador.id, "suspended")}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Suspend
                    </Button>
                    <Button
                      variant="outline"
                      className="border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10"
                      disabled={selectedAmbassador.status === "pending" || isPending}
                      onClick={() => handleStatusChange(selectedAmbassador.id, "pending")}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Set Pending
                    </Button>
                  </div>
                </Card>

                <Card className="p-4 space-y-4 border-red-500/20">
                  <h3 className="font-semibold text-sm text-red-400 uppercase tracking-wide">
                    Danger Zone
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this ambassador and all their associated data. This action cannot be undone.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(selectedAmbassador.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Ambassador
                  </Button>
                </Card>

                <Card className="p-4 space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Meta
                  </h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Applied</span>
                      <span>{new Date(selectedAmbassador.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Updated</span>
                      <span>{new Date(selectedAmbassador.updated_at).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Certificates</span>
                      <span>{certificates.length}</span>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
