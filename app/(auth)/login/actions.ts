"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";

type LoginActionResult = {
  error?: string;
  redirectTo?: string;
};

export async function loginWithCredentials(
  email: string,
  password: string
): Promise<LoginActionResult> {
  try {
    const redirectTo = await signIn("credentials", {
      email,
      password,
      redirect: false,
      redirectTo: "/dashboard"
    });

    return {
      redirectTo:
        typeof redirectTo === "string"
          ? redirectTo
          : "/dashboard"
    };
  } catch (error) {
    if (
      error instanceof AuthError &&
      error.type === "CredentialsSignin"
    ) {
      return {
        error: "Invalid email or password."
      };
    }

    console.error("Unable to sign in", error);

    return {
      error:
        "Unable to sign in right now. Please try again."
    };
  }
}
