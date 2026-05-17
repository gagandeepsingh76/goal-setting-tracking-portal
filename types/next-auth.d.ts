import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "EMPLOYEE" | "MANAGER" | "ADMIN";
      department: string;
      managerId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "EMPLOYEE" | "MANAGER" | "ADMIN";
    department?: string;
    managerId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "EMPLOYEE" | "MANAGER" | "ADMIN";
    department?: string;
    managerId?: string | null;
  }
}
