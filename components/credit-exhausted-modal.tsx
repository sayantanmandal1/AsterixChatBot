"use client";

import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type CreditExhaustedModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userType: "guest" | "authenticated";
};

export function CreditExhaustedModal({
  isOpen,
  onOpenChange,
  userType,
}: CreditExhaustedModalProps) {
  const router = useRouter();

  const handleNavigate = () => {
    if (userType === "guest") {
      router.push("/login");
    } else {
      router.push("/payments");
    }
    onOpenChange(false);
  };

  return (
    <AlertDialog onOpenChange={onOpenChange} open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Credits Exhausted</AlertDialogTitle>
          <AlertDialogDescription>
            {userType === "guest"
              ? "You've used all your guest credits. Please log in or register to continue using the platform and access more credits."
              : "You've run out of credits. Purchase more credits to continue generating messages."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleNavigate}>
            {userType === "guest" ? "Go to Login" : "Go to Payment Page"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
