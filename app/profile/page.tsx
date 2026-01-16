"use client";

import { ArrowLeft, Calendar, CreditCard, History, User, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Hyperspeed from "@/components/background/background";

interface UserProfile {
  user: {
    id: string;
    email: string;
  };
  creditBalance: {
    balance: number;
    lastMonthlyAllocation: string | null;
    isNewUser: boolean;
    createdAt: string;
    updatedAt: string;
  };
  activePlan: {
    id: string;
    name: string;
    credits: number;
    price: number;
    description: string | null;
    purchasedAt: string;
  } | null;
}

interface Transaction {
  id: string;
  userId: string;
  type: string;
  amount: string;
  balanceAfter: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface Purchase {
  id: string;
  userId: string;
  planId: string;
  creditsAdded: string;
  amountPaid: string;
  status: string;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        // Fetch user profile
        const profileResponse = await fetch("/api/user/profile");
        
        if (!profileResponse.ok) {
          // User is not authenticated - redirect to login
          setIsAuthenticated(false);
          router.push("/login");
          return;
        }

        const profileData = await profileResponse.json();
        
        // Check if user is a guest
        if (profileData.user?.type === "guest") {
          // Guest users cannot access profile page - redirect to login
          setIsAuthenticated(false);
          router.push("/login");
          return;
        }

        setIsAuthenticated(true);
        setProfile(profileData);

        // Fetch transaction history
        const transactionsResponse = await fetch("/api/credits/transactions?limit=10");
        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json();
          setTransactions(transactionsData.transactions || []);
        }

        // Fetch purchase history
        const purchasesResponse = await fetch("/api/payments/history?limit=10");
        if (purchasesResponse.ok) {
          const purchasesData = await purchasesResponse.json();
          setPurchases(purchasesData.purchases || []);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [router]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) {
      return "Never";
    }
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCredits = (amount: string | number) => {
    const num = typeof amount === "string" ? Number.parseFloat(amount) : amount;
    return num.toFixed(2);
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case "deduction":
        return "Usage";
      case "purchase":
        return "Purchase";
      case "bonus":
        return "Bonus";
      case "monthly_allowance":
        return "Monthly Allowance";
      default:
        return type;
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case "deduction":
        return "text-red-400";
      case "purchase":
        return "text-green-400";
      case "bonus":
        return "text-purple-400";
      case "monthly_allowance":
        return "text-blue-400";
      default:
        return "text-gray-400";
    }
  };

  // Show loading state while checking authentication
  if (loading || isAuthenticated === null) {
    return (
      <div className="relative h-screen w-full overflow-hidden">
        <div className="fixed inset-0 z-0">
          <Hyperspeed
            effectOptions={{
              // biome-ignore lint/complexity/useArrowFunction: Required for interactive speed control
              onSpeedUp() {},
              // biome-ignore lint/complexity/useArrowFunction: Required for interactive speed control
              onSlowDown() {},
              distortion: "deepDistortion",
              length: 400,
              roadWidth: 18,
              islandWidth: 2,
              lanesPerRoad: 3,
              fov: 90,
              fovSpeedUp: 150,
              speedUp: 2,
              carLightsFade: 0.4,
              totalSideLightSticks: 20,
              lightPairsPerRoadWay: 40,
              shoulderLinesWidthPercentage: 0.05,
              brokenLinesWidthPercentage: 0.1,
              brokenLinesLengthPercentage: 0.5,
              lightStickWidth: [0.12, 0.5],
              lightStickHeight: [1.3, 1.7],
              movingAwaySpeed: [60, 80],
              movingCloserSpeed: [-120, -160],
              carLightsLength: [400 * 0.03, 400 * 0.2],
              carLightsRadius: [0.05, 0.14],
              carWidthPercentage: [0.3, 0.5],
              carShiftX: [-0.8, 0.8],
              carFloorSeparation: [0, 5],
              colors: {
                roadColor: 0x08_08_08,
                islandColor: 0x0a_0a_0a,
                background: 0x00_00_00,
                shoulderLines: 0x13_13_18,
                brokenLines: 0x13_13_18,
                leftCars: [0xff_32_2f, 0xa3_30_10, 0xa8_15_08],
                rightCars: [0xfd_fd_f0, 0xf3_de_a0, 0xe2_bb_88],
                sticks: 0xfd_fd_f0,
              },
            }}
          />
        </div>
        <div className="relative z-10 flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
            <p className="text-gray-300 text-sm">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  // Don't render content if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <Hyperspeed
          effectOptions={{
            // biome-ignore lint/complexity/useArrowFunction: Required for interactive speed control
            onSpeedUp() {},
            // biome-ignore lint/complexity/useArrowFunction: Required for interactive speed control
            onSlowDown() {},
            distortion: "deepDistortion",
            length: 400,
            roadWidth: 18,
            islandWidth: 2,
            lanesPerRoad: 3,
            fov: 90,
            fovSpeedUp: 150,
            speedUp: 2,
            carLightsFade: 0.4,
            totalSideLightSticks: 20,
            lightPairsPerRoadWay: 40,
            shoulderLinesWidthPercentage: 0.05,
            brokenLinesWidthPercentage: 0.1,
            brokenLinesLengthPercentage: 0.5,
            lightStickWidth: [0.12, 0.5],
            lightStickHeight: [1.3, 1.7],
            movingAwaySpeed: [60, 80],
            movingCloserSpeed: [-120, -160],
            carLightsLength: [400 * 0.03, 400 * 0.2],
            carLightsRadius: [0.05, 0.14],
            carWidthPercentage: [0.3, 0.5],
            carShiftX: [-0.8, 0.8],
            carFloorSeparation: [0, 5],
            colors: {
              roadColor: 0x08_08_08,
              islandColor: 0x0a_0a_0a,
              background: 0x00_00_00,
              shoulderLines: 0x13_13_18,
              brokenLines: 0x13_13_18,
              leftCars: [0xff_32_2f, 0xa3_30_10, 0xa8_15_08],
              rightCars: [0xfd_fd_f0, 0xf3_de_a0, 0xe2_bb_88],
              sticks: 0xfd_fd_f0,
            },
          }}
        />
      </div>

      {/* Content */}
      <div className="pointer-events-none relative z-10 flex min-h-screen flex-col px-4 py-8">
        {/* Back Button */}
        <Link
          className="group pointer-events-auto mb-4 inline-flex w-fit items-center gap-2 rounded-xl bg-white/10 px-4 py-2 font-medium text-sm text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-white/20"
          href="/"
        >
          <ArrowLeft className="group-hover:-translate-x-1 h-4 w-4 transition-transform" />
          <span>Back</span>
        </Link>

        {/* Header */}
        <div className="pointer-events-auto mb-6 text-center">
          <h1 className="mb-2 bg-linear-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text font-bold text-4xl text-transparent tracking-tight md:text-5xl">
            Account Profile
          </h1>
          <p className="mx-auto max-w-2xl text-gray-300 text-sm md:text-base">
            Manage your account and view your credit usage
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="pointer-events-auto mx-auto mb-4 max-w-4xl rounded-xl bg-red-500/20 px-4 py-3 text-center text-red-300 text-sm backdrop-blur-md">
            {error}
          </div>
        )}

        {profile && (
          <div className="pointer-events-auto mx-auto w-full max-w-6xl space-y-6">
            {/* User Info and Credit Balance */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* User Information Card */}
              <div className="rounded-xl bg-white/10 p-6 backdrop-blur-md">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-purple-500/20 p-2">
                    <User className="h-5 w-5 text-purple-400" />
                  </div>
                  <h2 className="font-semibold text-white text-xl">User Information</h2>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-400 text-sm">Email</p>
                    <p className="font-medium text-white">{profile.user.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">User ID</p>
                    <p className="font-mono text-gray-300 text-sm">{profile.user.id}</p>
                  </div>
                </div>
              </div>

              {/* Credit Balance Card */}
              <div className="rounded-xl bg-white/10 p-6 backdrop-blur-md">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-green-500/20 p-2">
                    <Wallet className="h-5 w-5 text-green-400" />
                  </div>
                  <h2 className="font-semibold text-white text-xl">Credit Balance</h2>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-400 text-sm">Current Balance</p>
                    <p className="font-bold text-3xl text-white">
                      {formatCredits(profile.creditBalance.balance)}
                      <span className="ml-2 font-normal text-gray-400 text-lg">credits</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Last Monthly Allocation</p>
                    <p className="font-medium text-white">
                      {formatDate(profile.creditBalance.lastMonthlyAllocation)}
                    </p>
                  </div>
                  <Link
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-purple-500 to-pink-500 px-4 py-2 font-medium text-sm text-white transition-all hover:scale-105"
                    href="/payments"
                  >
                    <CreditCard className="h-4 w-4" />
                    Purchase Credits
                  </Link>
                </div>
              </div>
            </div>

            {/* Active Plan */}
            {profile.activePlan && (
              <div className="rounded-xl bg-white/10 p-6 backdrop-blur-md">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-blue-500/20 p-2">
                    <CreditCard className="h-5 w-5 text-blue-400" />
                  </div>
                  <h2 className="font-semibold text-white text-xl">Active Subscription</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-gray-400 text-sm">Plan Name</p>
                    <p className="font-medium text-white">{profile.activePlan.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Credits Purchased</p>
                    <p className="font-medium text-white">
                      {formatCredits(profile.activePlan.credits)} credits
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Purchased On</p>
                    <p className="font-medium text-white">
                      {formatDate(profile.activePlan.purchasedAt)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Purchase History */}
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-md">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-pink-500/20 p-2">
                  <History className="h-5 w-5 text-pink-400" />
                </div>
                <h2 className="font-semibold text-white text-xl">Purchase History</h2>
              </div>
              {purchases.length > 0 ? (
                <div className="space-y-3">
                  {purchases.map((purchase) => (
                    <div
                      key={purchase.id}
                      className="flex items-center justify-between rounded-lg bg-white/5 p-4"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-white">
                          {formatCredits(purchase.creditsAdded)} credits
                        </p>
                        <p className="text-gray-400 text-sm">
                          {formatDateTime(purchase.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-400">
                          ${formatCredits(purchase.amountPaid)}
                        </p>
                        <p className="text-gray-400 text-xs uppercase">{purchase.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 text-sm">No purchases yet</p>
              )}
            </div>

            {/* Transaction History */}
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-md">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-cyan-500/20 p-2">
                  <Calendar className="h-5 w-5 text-cyan-400" />
                </div>
                <h2 className="font-semibold text-white text-xl">Credit Transaction History</h2>
              </div>
              {transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between rounded-lg bg-white/5 p-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white">
                            {getTransactionTypeLabel(transaction.type)}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              transaction.type === "deduction"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-green-500/20 text-green-400"
                            }`}
                          >
                            {transaction.type === "deduction" ? "-" : "+"}
                            {formatCredits(transaction.amount)}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm">
                          {transaction.description || "No description"}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {formatDateTime(transaction.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-sm">Balance After</p>
                        <p className="font-medium text-white">
                          {formatCredits(transaction.balanceAfter)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 text-sm">No transactions yet</p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pointer-events-auto mt-8 text-center">
          <p className="text-gray-400 text-xs">
            Credits are used for AI-powered conversations • Purchase more anytime
          </p>
        </div>
      </div>
    </div>
  );
}
