"use client";

import { useRef, useState, useTransition } from "react";
import { LockKeyhole, Mail, Target } from "lucide-react";

import { loginWithCredentials } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import {
  Alert,
  AlertDescription
} from "@/components/ui/alert";

const quickLogins = [
  {
    label: "Login as Employee (Alice)",
    email: "alice@company.com"
  },
  {
    label: "Login as Manager",
    email: "manager@company.com"
  },
  {
    label: "Login as Admin",
    email: "admin@company.com"
  }
];

export function LoginForm() {
  const [email, setEmail] = useState(
    "alice@company.com"
  );

  const [password, setPassword] =
    useState("Password@123");

  const [error, setError] = useState("");

  const [isPending, setIsPending] =
    useState(false);

  const [, startTransition] =
    useTransition();

  const isSubmittingRef = useRef(false);

  function submit(
    selectedEmail = email,
    selectedPassword = password
  ) {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setError("");
    setIsPending(true);

    startTransition(() => {
      void loginWithCredentials(
        selectedEmail,
        selectedPassword
      )
        .then((result) => {
          if (result.redirectTo) {
            window.location.replace(
              result.redirectTo
            );
            return;
          }

          setError(
            result.error ??
              "Unable to sign in right now. Please try again."
          );

          isSubmittingRef.current = false;
          setIsPending(false);
        })
        .catch(() => {
          setError(
            "Unable to sign in right now. Please try again."
          );

          isSubmittingRef.current = false;
          setIsPending(false);
        });
    });
  }

  function quickLogin(selectedEmail: string) {
    const demoPassword = "Password@123";

    setEmail(selectedEmail);
    setPassword(demoPassword);
    void submit(
      selectedEmail,
      demoPassword
    );
  }

  function handleSubmit() {
    void submit();
  }

  return (
    <Card className="w-full max-w-md border-border/80 bg-card/95 shadow-elevated">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-glow">
          <Target className="h-6 w-6" />
        </div>

        <CardTitle>
          Goal Setting & Tracking Portal
        </CardTitle>

        <CardDescription>
          Sign in with your company credentials.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {error ? (
          <Alert className="alert-danger">
            <AlertDescription className="text-inherit">
              {error}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="email">
            Email
          </Label>

          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

            <Input
              id="email"
              className="pl-9"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">
            Password
          </Label>

          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

            <Input
              id="password"
              type="password"
              className="pl-9"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
            />
          </div>
        </div>

        <Button
          type="button"
          className="w-full"
          disabled={isPending}
          onClick={handleSubmit}
        >
          {isPending
            ? "Signing in..."
            : "Sign in"}
        </Button>

        <div className="space-y-2 rounded-md border bg-muted/35 p-3">
          <p className="text-sm font-medium">
            Quick Login
          </p>

          <div className="grid gap-2">
            {quickLogins.map((login) => (
              <Button
                key={login.email}
                variant="outline"
                type="button"
                disabled={isPending}
                onClick={() =>
                  quickLogin(login.email)
                }
              >
                {login.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
