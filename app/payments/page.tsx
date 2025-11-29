"use client";

import { ArrowLeft, Check, Crown, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import Hyperspeed from "@/components/background/background";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started",
    icon: Sparkles,
    features: [
      "100 messages per day",
      "Basic AI models",
      "Standard response time",
      "Community support",
      "Local processing",
    ],
    gradient: "from-gray-500/20 to-gray-600/20",
    shadowColor: "gray-500/30",
  },
  {
    name: "Pro",
    price: "$20",
    period: "per month",
    description: "For power users and professionals",
    icon: Zap,
    popular: true,
    features: [
      "Unlimited messages",
      "Advanced AI models",
      "Priority response time",
      "Email support",
      "Custom model fine-tuning",
      "API access",
      "Advanced analytics",
    ],
    gradient: "from-purple-500/20 to-pink-500/20",
    shadowColor: "purple-500/50",
  },
  {
    name: "Business",
    price: "$40",
    period: "per month",
    description: "For teams and growing businesses",
    icon: Crown,
    features: [
      "Everything in Pro",
      "Team collaboration (up to 10 users)",
      "Dedicated support",
      "Custom integrations",
      "Advanced security features",
      "Usage analytics dashboard",
      "SLA guarantee",
      "Priority model updates",
    ],
    gradient: "from-cyan-500/20 to-blue-500/20",
    shadowColor: "cyan-500/50",
  },
  {
    name: "Enterprise",
    price: "$200",
    period: "per month",
    description: "For large organizations",
    icon: Crown,
    features: [
      "Everything in Business",
      "Unlimited team members",
      "24/7 dedicated support",
      "Custom model training",
      "On-premise deployment option",
      "White-label solution",
      "Custom SLA",
      "Dedicated account manager",
      "Advanced compliance features",
    ],
    gradient: "from-amber-500/20 to-orange-500/20",
    shadowColor: "amber-500/50",
  },
];

export default function PaymentsPage() {
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
          <h1 className="mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text font-bold text-4xl text-transparent tracking-tight md:text-5xl">
            Choose Your Path
          </h1>
          <p className="mx-auto max-w-2xl text-gray-300 text-sm md:text-base">
            Unlock the full potential of AI-powered conversations
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="pointer-events-auto mx-auto grid w-full max-w-7xl flex-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                className={`group relative overflow-hidden rounded-3xl bg-linear-to-br ${plan.gradient} p-[2px] backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-${plan.shadowColor} ${
                  plan.popular ? "ring-2 ring-purple-500/50" : ""
                }`}
                key={plan.name}
              >
                {plan.popular && (
                  <div className="-right-12 absolute top-8 z-10 rotate-45 bg-linear-to-r from-purple-500 to-pink-500 px-12 py-1 font-bold text-white text-xs">
                    POPULAR
                  </div>
                )}

                <div className="relative flex h-full flex-col rounded-3xl bg-black/60 p-4 backdrop-blur-xl md:p-6">
                  {/* Icon & Name */}
                  <div className="mb-3 flex items-center justify-between">
                    <Icon className="h-6 w-6 text-white" />
                  </div>

                  <h3 className="mb-1 font-bold text-white text-xl">
                    {plan.name}
                  </h3>

                  {/* Price */}
                  <div className="mb-2">
                    <span className="font-bold text-3xl text-white">
                      {plan.price}
                    </span>
                    <span className="ml-1 text-gray-400 text-xs">
                      /{plan.period}
                    </span>
                  </div>

                  {/* Features */}
                  <ul className="mb-4 flex-1 space-y-1.5">
                    {plan.features.slice(0, 5).map((feature) => (
                      <li className="flex items-start gap-2" key={feature}>
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                        <span className="text-gray-300 text-xs leading-tight">
                          {feature}
                        </span>
                      </li>
                    ))}
                    {plan.features.length > 5 && (
                      <li className="text-gray-400 text-xs">
                        +{plan.features.length - 5} more features
                      </li>
                    )}
                  </ul>

                  {/* CTA Button */}
                  <button
                    className={`w-full rounded-xl bg-gradient-to-r ${
                      plan.popular
                        ? "from-purple-500 to-pink-500"
                        : "from-white/10 to-white/5"
                    } px-4 py-2 font-semibold text-sm text-white transition-all hover:scale-105 hover:shadow-lg`}
                    type="button"
                  >
                    {plan.price === "$0" ? "Get Started" : "Subscribe"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pointer-events-auto mt-4 text-center">
          <p className="text-gray-400 text-xs">
            14-day money-back guarantee •{" "}
            <a
              className="text-cyan-400 hover:underline"
              href="mailto:sales@example.com"
            >
              Contact sales
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
