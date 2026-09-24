"use client";

import { SignInButton, SignOutButton } from "@clerk/nextjs";
import { LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Primary "Se connecter" button opening the Clerk sign-in modal. */
export function SignInCta({ className }: { className?: string }) {
  return (
    <SignInButton mode="modal">
      <Button type="button" className={cn("h-11 text-base sm:text-sm", className)}>
        <LogIn aria-hidden />
        Se connecter
      </Button>
    </SignInButton>
  );
}

/** "Se déconnecter" button (back to the home page). */
export function SignOutCta({ className }: { className?: string }) {
  return (
    <SignOutButton redirectUrl="/">
      <Button type="button" variant="ghost" className={cn("h-11 sm:h-9", className)}>
        <LogOut aria-hidden />
        Se déconnecter
      </Button>
    </SignOutButton>
  );
}
