"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CreditMeterProps {
  balance: number;
  lastDeduction?: number;
  showLastDeduction?: boolean;
  isLoading?: boolean;
  className?: string;
}

function PureCreditMeter({
  balance,
  lastDeduction,
  showLastDeduction = false,
  isLoading = false,
  className,
}: CreditMeterProps) {
  const isLowBalance = balance < 50;
  const formattedBalance = balance.toFixed(2);

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="h-6 w-20 animate-pulse rounded-full bg-zinc-500/30" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-2", className)}>
            <Badge
              className={cn(
                "cursor-default font-mono text-xs",
                isLowBalance &&
                  "border-destructive bg-destructive/10 text-destructive hover:bg-destructive/20"
              )}
              variant={isLowBalance ? "destructive" : "secondary"}
            >
              <svg
                className="mr-1.5 size-3"
                fill="none"
                height="16"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width="16"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                <path d="M12 18V6" />
              </svg>
              {formattedBalance}
            </Badge>

            {showLastDeduction &&
              lastDeduction !== null &&
              lastDeduction !== undefined && (
                <span className="text-muted-foreground text-xs">
                  -{lastDeduction.toFixed(2)}
                </span>
              )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="space-y-1">
            <p className="font-semibold">Credit Balance</p>
            <p className="text-xs">
              {isLowBalance && (
                <span className="text-destructive">⚠️ Low balance! </span>
              )}
              {formattedBalance} credits remaining
            </p>
            {showLastDeduction &&
              lastDeduction !== null &&
              lastDeduction !== undefined && (
                <p className="text-muted-foreground text-xs">
                  Last deduction: {lastDeduction.toFixed(2)} credits
                </p>
              )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const CreditMeter = memo(PureCreditMeter, (prevProps, nextProps) => {
  return (
    prevProps.balance === nextProps.balance &&
    prevProps.lastDeduction === nextProps.lastDeduction &&
    prevProps.showLastDeduction === nextProps.showLastDeduction &&
    prevProps.isLoading === nextProps.isLoading
  );
});

CreditMeter.displayName = "CreditMeter";
