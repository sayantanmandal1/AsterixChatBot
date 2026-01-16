"use client";

import { CreditMeter } from "@/components/credit-meter";
import { useCreditBalance } from "@/hooks/use-credit-balance";

interface CreditMeterWrapperProps {
  showLastDeduction?: boolean;
  className?: string;
}

export function CreditMeterWrapper({
  showLastDeduction = false,
  className,
}: CreditMeterWrapperProps) {
  const { balance, lastDeduction, isLoading } = useCreditBalance();

  return (
    <CreditMeter
      balance={balance}
      className={className}
      isLoading={isLoading}
      lastDeduction={lastDeduction ?? undefined}
      showLastDeduction={showLastDeduction}
    />
  );
}
