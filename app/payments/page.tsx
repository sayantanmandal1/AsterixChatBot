"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Hyperspeed from "@/components/background/background";
import SubscriptionPlans, { type SubscriptionPlan } from "@/components/subscription-plans";
import { PaymentModal } from "@/components/payment-modal";

export default function PaymentsPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check authentication status and fetch plans
  useEffect(() => {
    const checkAuthAndFetchPlans = async () => {
      try {
        // Check authentication by trying to fetch user profile
        const authResponse = await fetch("/api/user/profile");
        
        if (!authResponse.ok) {
          // User is not authenticated - redirect to login
          setIsAuthenticated(false);
          router.push("/login");
          return;
        }

        const authData = await authResponse.json();
        
        // Check if user is a guest
        if (authData.user?.type === "guest") {
          // Guest users cannot access payment page - redirect to login
          setIsAuthenticated(false);
          router.push("/login");
          return;
        }

        setIsAuthenticated(true);

        // Fetch subscription plans
        const plansResponse = await fetch("/api/payments/plans");
        
        if (!plansResponse.ok) {
          throw new Error("Failed to fetch subscription plans");
        }

        const plansData = await plansResponse.json();
        setPlans(plansData.plans || []);
      } catch (err) {
        console.error("Error loading payment page:", err);
        setError(err instanceof Error ? err.message : "Failed to load payment page");
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchPlans();
  }, [router]);

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePurchase = async () => {
    if (!selectedPlan || purchasing) {
      return;
    }

    setPurchasing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/payments/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to process purchase");
      }

      const data = await response.json();

      // Close the modal
      setShowPaymentModal(false);

      // Show success message
      setSuccessMessage(
        `Purchase successful! ${data.purchase.creditsAdded} credits added to your account. New balance: ${data.newBalance} credits.`
      );

      // Clear selected plan
      setSelectedPlan(null);

      // Optionally redirect after a delay
      setTimeout(() => {
        router.push("/");
      }, 3000);
    } catch (err) {
      console.error("Purchase failed:", err);
      setError(err instanceof Error ? err.message : "Failed to process purchase");
      setShowPaymentModal(false);
    } finally {
      setPurchasing(false);
    }
  };

  const handleCloseModal = () => {
    if (!purchasing) {
      setShowPaymentModal(false);
      setSelectedPlan(null);
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
            <p className="text-gray-300 text-sm">Loading...</p>
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
    <div className="relative h-screen w-full overflow-hidden">
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
      <div className="pointer-events-none relative z-10 flex h-full flex-col px-4 py-8">
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
            Purchase Credits
          </h1>
          <p className="mx-auto max-w-2xl text-gray-300 text-sm md:text-base">
            Select a credit package to continue using AI-powered conversations
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="pointer-events-auto mx-auto mb-4 max-w-2xl rounded-xl bg-red-500/20 px-4 py-3 text-center text-red-300 text-sm backdrop-blur-md">
            {error}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="pointer-events-auto mx-auto mb-4 max-w-2xl rounded-xl bg-green-500/20 px-4 py-3 text-center text-green-300 text-sm backdrop-blur-md">
            {successMessage}
          </div>
        )}

        {/* Pricing Cards */}
        {plans.length > 0 ? (
          <div className="pointer-events-auto">
            <SubscriptionPlans plans={plans} onSelectPlan={handleSelectPlan} />
          </div>
        ) : (
          <div className="pointer-events-auto flex flex-1 items-center justify-center">
            <p className="text-gray-400 text-sm">No subscription plans available</p>
          </div>
        )}

        {/* Payment Modal */}
        {selectedPlan && (
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={handleCloseModal}
            selectedPlan={selectedPlan}
            onConfirm={handlePurchase}
            isProcessing={purchasing}
          />
        )}

        {/* Footer */}
        <div className="pointer-events-auto mt-4 text-center">
          <p className="text-gray-400 text-xs">
            Mock payment system • Credits are added instantly
          </p>
        </div>
      </div>
    </div>
  );
}
