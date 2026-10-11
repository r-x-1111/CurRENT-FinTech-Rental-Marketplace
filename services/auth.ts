export type MarketplaceAccountKind = "normal" | "demo";
export const DEMO_ACCOUNT_EMAIL = "democurrent@gmail.com";
export interface AuthenticatedMarketplaceAccount {
  accountKind: MarketplaceAccountKind;
  id: string;
  email: string;
  name: string;
  verified: boolean;
}

export interface PasswordAuthGateway {
  signInWithPassword(credentials: {
    email: string;
    password: string;
  }): Promise<{
    data: {
      user: {
        id: string;
        email?: string;
        app_metadata: Record<string, unknown>;
        user_metadata?: Record<string, unknown>;
      } | null;
    };
    error: unknown;
  }>;
  signOut(): Promise<{ error: unknown }>;
}

export function describeSupabaseAuthError(
  error: unknown,
  operation: "sign-up" | "password reset",
): string {
  if (!error || typeof error !== "object") {
    return `Supabase ${operation} failed: ${String(error || "Unknown Auth error")}`;
  }
  const authError = error as {
    message?: unknown;
    code?: unknown;
    status?: unknown;
  };
  const message =
    typeof authError.message === "string" && authError.message.trim()
      ? authError.message.trim()
      : "Unknown Auth error";
  const code =
    typeof authError.code === "string" && authError.code
      ? ` [${authError.code}]`
      : "";
  const status =
    typeof authError.status === "number" ? ` (HTTP ${authError.status})` : "";
  const triggerHint =
    operation === "sign-up" && /database error saving new user/i.test(message)
      ? " Supabase rejected the Auth user hook; verify the initial profiles migration and handle_new_user trigger in the Dashboard."
      : "";
  return `Supabase ${operation} failed${code}${status}: ${message}${triggerHint}`;
}

export async function authenticateWithPassword(
  auth: PasswordAuthGateway,
  email: string,
  password: string,
): Promise<AuthenticatedMarketplaceAccount> {
  const { data, error } = await auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error || !data.user) {
    throw new Error("Email or password is incorrect.");
  }

  const submittedEmail = email.trim().toLowerCase();
  const authenticatedEmail = data.user.email;
  const accountKind = data.user.app_metadata.account_kind;
  if (accountKind === "demo") {
    if (
      submittedEmail !== DEMO_ACCOUNT_EMAIL ||
      !authenticatedEmail ||
      authenticatedEmail.toLowerCase() !== DEMO_ACCOUNT_EMAIL ||
      data.user.app_metadata.verified_demo !== true
    ) {
      await auth.signOut();
      throw new Error("Email or password is incorrect.");
    }
    return {
      accountKind: "demo",
      id: data.user.id,
      email: authenticatedEmail,
      name:
        typeof data.user.user_metadata?.full_name === "string"
          ? data.user.user_metadata.full_name
          : "Alex Tan",
      verified: true,
    };
  }
  if (!authenticatedEmail) {
    await auth.signOut();
    throw new Error("Email or password is incorrect.");
  }
  if (submittedEmail === DEMO_ACCOUNT_EMAIL) {
    await auth.signOut();
    throw new Error("Email or password is incorrect.");
  }
  if (accountKind !== undefined && accountKind !== "normal") {
    await auth.signOut();
    throw new Error("Email or password is incorrect.");
  }
  return {
    accountKind: "normal",
    id: data.user.id,
    email: authenticatedEmail,
    name:
      typeof data.user.user_metadata?.full_name === "string"
        ? data.user.user_metadata.full_name
        : authenticatedEmail.split("@")[0],
    verified: data.user.app_metadata.verification_status === "verified",
  };
}

export async function signOutAuthenticatedAccount(
  auth: PasswordAuthGateway,
): Promise<void> {
  const { error } = await auth.signOut();
  if (error) {
    throw new Error("Could not sign out. Please try again.");
  }
}
