"use client";

import { Check, CreditCard, Sparkles } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface SubscriptionPlan {
  id: string;
  name: string;
  credits: number;
  price: number;
  description: string | null;
  displayOrder: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: SubscriptionPlan;
  onConfirm: () => Promise<void>;
  isProcessing?: boolean;
}

export function PaymentModal({
  isOpen,
  onClose,
  selectedPlan,
  onConfirm,
  isProcessing = false,
}: PaymentModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  const isFree = selectedPlan.price === 0;

  return (
    <AlertDialog onOpenChange={onClose} open={isOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-2xl">
            {isFree ? (
              <Sparkles className="h-6 w-6 text-purple-500" />
            ) : (
              <CreditCard className="h-6 w-6 text-purple-500" />
            )}
            {isFree ? "Claim Free Credits" : "Confirm Purchase"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {isFree
              ? "Claim your free credits to get started"
              : "Review your purchase details before confirming"}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Plan Details */}
        <div className="space-y-4 py-4">
          {/* Plan Name */}
          <div className="rounded-lg bg-linear-to-br from-purple-500/10 to-pink-500/10 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-lg">{selectedPlan.name}</h3>
              <Sparkles className="h-5 w-5 text-purple-500" />
            </div>
            {selectedPlan.description && (
              <p className="text-muted-foreground text-sm">
                {selectedPlan.description}
              </p>
            )}
          </div>

          {/* Purchase Summary */}
          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Credits</span>
              <span className="font-semibold">
                {selectedPlan.credits.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                Estimated Output
              </span>
              <span className="font-semibold text-sm">
                ~{Math.floor(selectedPlan.credits * 20).toLocaleString()}{" "}
                characters
              </span>
            </div>
            <div className="border-t pt-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-xl">
                  {isFree ? "Free" : `$${selectedPlan.price.toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <p className="font-medium text-sm">What you get:</p>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                <span className="text-muted-foreground text-sm">
                  {selectedPlan.credits.toLocaleString()} credits added
                  instantly
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                <span className="text-muted-foreground text-sm">
                  Credits never expire
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                <span className="text-muted-foreground text-sm">
                  Use across all AI models
                </span>
              </li>
            </ul>
          </div>

          {/* Mock Payment Notice */}
          {!isFree && (
            <div className="rounded-lg bg-blue-500/10 p-3">
              <p className="text-blue-400 text-xs">
                <strong>Note:</strong> This is a mock payment system. No actual
                charges will be made. Credits will be added to your account
                immediately upon confirmation.
              </p>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isProcessing}
            onClick={handleConfirm}
          >
            {isProcessing
              ? "Processing..."
              : isFree
                ? "Claim Credits"
                : "Confirm Purchase"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
