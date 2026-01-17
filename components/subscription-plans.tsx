"use client";

import { Check, Crown, Sparkles, Zap } from "lucide-react";
import { useState } from "react";

export interface SubscriptionPlan {
  id: string;
  name: string;
  credits: number;
  price: number;
  description: string | null;
  displayOrder: number;
}

interface SubscriptionPlansProps {
  plans: SubscriptionPlan[];
  onSelectPlan: (plan: SubscriptionPlan) => void;
}

// Icon mapping for plan names
const getIconForPlan = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("free")) {
    return Sparkles;
  }
  if (lowerName.includes("starter") || lowerName.includes("basic")) {
    return Sparkles;
  }
  if (lowerName.includes("pro") || lowerName.includes("premium")) {
    return Zap;
  }
  return Crown;
};

// Determine if a plan should be highlighted as recommended
const isRecommendedPlan = (plan: SubscriptionPlan, allPlans: SubscriptionPlan[]) => {
  // Recommend the middle plan if there are 3+ plans
  if (allPlans.length >= 3) {
    const middleIndex = Math.floor(allPlans.length / 2);
    return allPlans[middleIndex].id === plan.id;
  }
  return false;
};

// Get gradient colors based on plan position
const getGradientForPlan = (index: number, total: number) => {
  const gradients = [
    { gradient: "from-gray-500/20 to-gray-600/20", shadowColor: "gray-500/30" },
    { gradient: "from-purple-500/20 to-pink-500/20", shadowColor: "purple-500/50" },
    { gradient: "from-cyan-500/20 to-blue-500/20", shadowColor: "cyan-500/50" },
    { gradient: "from-amber-500/20 to-orange-500/20", shadowColor: "amber-500/50" },
  ];
  
  return gradients[index % gradients.length];
};

export default function SubscriptionPlans({ plans, onSelectPlan }: SubscriptionPlansProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlanId(plan.id);
    onSelectPlan(plan);
  };

  return (
    <div className="mx-auto grid w-full max-w-7xl flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {plans.map((plan, index) => {
        const Icon = getIconForPlan(plan.name);
        const isRecommended = isRecommendedPlan(plan, plans);
        const { gradient, shadowColor } = getGradientForPlan(index, plans.length);
        const isSelected = selectedPlanId === plan.id;
        const isFree = Number.parseFloat(plan.price.toString()) === 0;

        return (
          <div
            className={`group relative overflow-hidden rounded-3xl bg-linear-to-br ${gradient} p-[2px] backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-${shadowColor} ${
              isRecommended ? "ring-2 ring-purple-500/50" : ""
            } ${isSelected ? "ring-2 ring-cyan-500" : ""}`}
            key={plan.id}
          >
            {isRecommended && (
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

              {/* Credits */}
              <div className="mb-2">
                <span className="font-bold text-2xl text-white">
                  {plan.credits.toLocaleString()}
                </span>
                <span className="ml-1 text-gray-400 text-xs">
                  credits
                </span>
              </div>

              {/* Price */}
              <div className="mb-3">
                {isFree ? (
                  <span className="font-bold text-3xl text-white">Free</span>
                ) : (
                  <span className="font-bold text-3xl text-white">
                    ${plan.price.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Description */}
              {plan.description && (
                <p className="mb-4 flex-1 text-gray-300 text-sm leading-relaxed">
                  {plan.description}
                </p>
              )}

              {/* Features - calculated based on credits */}
              <ul className="mb-4 flex-1 space-y-1.5">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                  <span className="text-gray-300 text-xs leading-tight">
                    {plan.credits.toLocaleString()} credits
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                  <span className="text-gray-300 text-xs leading-tight">
                    ~{Math.floor(plan.credits * 20).toLocaleString()} characters of output
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                  <span className="text-gray-300 text-xs leading-tight">
                    Never expires
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                  <span className="text-gray-300 text-xs leading-tight">
                    Instant activation
                  </span>
                </li>
              </ul>

              {/* CTA Button */}
              <button
                className={`w-full rounded-xl bg-linear-to-r ${
                  isRecommended
                    ? "from-purple-500 to-pink-500"
                    : "from-white/10 to-white/5"
                } px-4 py-2 font-semibold text-sm text-white transition-all hover:scale-105 hover:shadow-lg ${
                  isSelected ? "ring-2 ring-cyan-400" : ""
                }`}
                onClick={() => handleSelectPlan(plan)}
                type="button"
              >
                {isSelected ? "Selected" : isFree ? "Get Started" : "Select Plan"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
