"use client";

import { useCallback, useEffect, useState } from "react";
import { ChatSDKError } from "@/lib/errors";

interface CreditBalance {
  balance: number;
  lastMonthlyAllocation: string | null;
  isGuest: boolean;
}

interface UseCreditBalanceReturn {
  balance: number;
  lastDeduction: number | null;
  isLoading: boolean;
  error: string | null;
  isGuest: boolean;
  refetch: () => Promise<void>;
  updateBalance: (newBalance: number, deductionAmount?: number) => void;
}

export function useCreditBalance(): UseCreditBalanceReturn {
  const [balance, setBalance] = useState<number>(0);
  const [lastDeduction, setLastDeduction] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);

  const fetchBalance = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/credits/balance");

      if (!response.ok) {
        const errorData = await response.json();
        throw new ChatSDKError(
          errorData.type || "bad_request:api",
          errorData.message || "Failed to fetch credit balance"
        );
      }

      const data: CreditBalance = await response.json();
      setBalance(data.balance);
      setIsGuest(data.isGuest);
    } catch (err) {
      const errorMessage =
        err instanceof ChatSDKError
          ? err.message
          : "Failed to fetch credit balance";
      setError(errorMessage);
      console.error("Error fetching credit balance:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch balance on mount
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Optimistic update function
  const updateBalance = useCallback(
    (newBalance: number, deductionAmount?: number) => {
      setBalance(newBalance);
      if (deductionAmount !== undefined) {
        setLastDeduction(deductionAmount);
      }
    },
    []
  );

  return {
    balance,
    lastDeduction,
    isLoading,
    error,
    isGuest,
    refetch: fetchBalance,
    updateBalance,
  };
}
