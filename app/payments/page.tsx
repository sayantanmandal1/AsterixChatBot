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
      <div className="relative z-10 px-4 py-16">
        {/* Back Button */}
        <Link
          className="group mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-2 text-gray-300 text-sm backdrop-blur-sm transition-all hover:bg-white/10"
          href="/"
        >
          <ArrowLeft className="group-hover:-translate-x-1 h-4 w-4 transition-transform" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="mb-16 text-center">
          <h1 className="mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text font-bold text-5xl text-transparent tracking-tight md:text-6xl lg:text-7xl">
            Choose Your Path
          </h1>
          <p className="mx-auto max-w-2xl text-gray-300 text-lg md:text-xl">
            Unlock the full potential of AI-powered conversations. Select the
            plan that fits your ambitions.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 lg:grid-cols-4">
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
                  <div className="-right-12 absolute top-8 rotate-45 bg-gradient-to-r from-purple-500 to-pink-500 px-12 py-1 font-bold text-white text-xs">
                    POPULAR
                  </div>
                )}

                <div className="relative h-full rounded-3xl bg-black/60 p-8 backdrop-blur-xl">
                  {/* Icon */}
                  <div className="mb-6 flex items-center justify-between">
                    <Icon className="h-8 w-8 text-white" />
                  </div>

                  {/* Plan Name */}
                  <h3 className="mb-2 font-bold text-2xl text-white">
                    {plan.name}
                  </h3>

                  {/* Price */}
                  <div className="mb-2">
                    <span className="font-bold text-4xl text-white">
                      {plan.price}
                    </span>
                    <span className="ml-2 text-gray-400">/{plan.period}</span>
                  </div>

                  {/* Description */}
                  <p className="mb-6 text-gray-400 text-sm">
                    {plan.description}
                  </p>

                  {/* Features */}
                  <ul className="mb-8 space-y-3">
                    {plan.features.map((feature) => (
                      <li className="flex items-start gap-3" key={feature}>
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    className={`w-full rounded-xl bg-gradient-to-r ${
                      plan.popular
                        ? "from-purple-500 to-pink-500"
                        : "from-white/10 to-white/5"
                    } px-6 py-3 font-semibold text-white transition-all hover:scale-105 hover:shadow-lg`}
                    type="button"
                  >
                    {plan.price === "$0" ? "Get Started" : "Subscribe Now"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mx-auto mt-16 max-w-3xl text-center">
          <p className="text-gray-400">
            All plans include a 14-day money-back guarantee. No questions asked.
          </p>
          <p className="mt-2 text-gray-500 text-sm">
            Need a custom solution?{" "}
            <a
              className="text-cyan-400 hover:underline"
              href="mailto:sales@example.com"
            >
              Contact our sales team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
