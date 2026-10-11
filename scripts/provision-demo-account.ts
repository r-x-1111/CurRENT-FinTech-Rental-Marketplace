import { createClient } from "@supabase/supabase-js";
import {
  authenticateWithPassword,
  DEMO_ACCOUNT_EMAIL,
  signOutAuthenticatedAccount,
} from "../services/auth";
import { provisionDemoAccount } from "../services/demoAccountProvisioning";
import { existsSync } from "node:fs";
import { createSeed } from "../data/seed";
import {
  loadMarketplaceWorkspace,
  saveMarketplaceWorkspace,
} from "../services/marketplacePersistence";

function getPrivateSupabaseConfig(): {
  supabaseUrl: string;
  serviceRoleKey: string;
  publishableKey: string;
} {
  for (const envFile of [".env.local", ".env"]) {
    if (existsSync(envFile)) process.loadEnvFile(envFile);
  }
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl) {
    throw new Error(
      "Set SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL in the local environment.",
    );
  }
  if (!serviceRoleKey) {
    throw new Error(
      "Add SUPABASE_SERVICE_ROLE_KEY to the ignored .env.local file. Never use an EXPO_PUBLIC_ variable for this key.",
    );
  }
  if (!publishableKey) {
    throw new Error(
      "Set EXPO_PUBLIC_SUPABASE_ANON_KEY in the local Expo environment.",
    );
  }
  return { supabaseUrl, serviceRoleKey, publishableKey };
}
function readHiddenPassword(): Promise<string> {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Run provisioning from a private interactive terminal.");
  }
  return new Promise<string>((resolve, reject) => {
    let password = "";
    process.stdout.write("Enter the approved Demo password: ");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const finish = (error?: Error) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(password);
    };
    const onData = (input: Buffer) => {
      for (const character of input.toString("utf8")) {
        if (character === "\u0003") {
          finish(new Error("Provisioning cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b") {
          password = password.slice(0, -1);
        } else {
          password += character;
        }
      }
    };
    process.stdin.on("data", onData);
  });
}

async function main() {
  const { supabaseUrl, serviceRoleKey, publishableKey } =
    getPrivateSupabaseConfig();
  const password = await readHiddenPassword();
  if (!password) {
    throw new Error("A password is required.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await provisionDemoAccount(supabase.auth.admin, DEMO_ACCOUNT_EMAIL, password);
  const publicClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const wrongPasswordAttempt = await publicClient.auth.signInWithPassword({
    email: DEMO_ACCOUNT_EMAIL,
    password: `${password}-invalid`,
  });
  if (!wrongPasswordAttempt.error || wrongPasswordAttempt.data.user) {
    await publicClient.auth.signOut();
    throw new Error("Demo password verification rejected an invalid password.");
  }

  const account = await authenticateWithPassword(
    publicClient.auth,
    DEMO_ACCOUNT_EMAIL,
    password,
  );
  if (account.accountKind !== "demo") {
    await signOutAuthenticatedAccount(publicClient.auth);
    throw new Error("The provisioned account is not marked as Demo.");
  }
  const workspace = await loadMarketplaceWorkspace(
    publicClient,
    account.id,
    "demo",
  );
  const demoWorkspace = workspace ?? createSeed("admin_demo");
  if (!workspace) {
    await saveMarketplaceWorkspace(
      publicClient,
      account.id,
      "demo",
      demoWorkspace,
    );
  }
  if (
    !demoWorkspace.profiles.some((profile) => profile.id === "demo-renter") ||
    !demoWorkspace.bookings.some(
      (booking) => booking.renterId === "demo-renter",
    ) ||
    !demoWorkspace.bookings.some((booking) => booking.ownerId !== "demo-renter")
  ) {
    await signOutAuthenticatedAccount(publicClient.auth);
    throw new Error("The Demo workspace is missing its Renter or Lender data.");
  }
  await signOutAuthenticatedAccount(publicClient.auth);

  const relogin = await authenticateWithPassword(
    publicClient.auth,
    DEMO_ACCOUNT_EMAIL,
    password,
  );
  if (relogin.accountKind !== "demo") {
    await signOutAuthenticatedAccount(publicClient.auth);
    throw new Error("Demo re-login returned an unexpected account type.");
  }
  const restoredWorkspace = await loadMarketplaceWorkspace(
    publicClient,
    relogin.id,
    "demo",
  );
  if (!restoredWorkspace) {
    await signOutAuthenticatedAccount(publicClient.auth);
    throw new Error("The Demo workspace was not restored on re-login.");
  }
  await signOutAuthenticatedAccount(publicClient.auth);
  process.stdout.write(
    "Demo account provisioned; invalid password rejected; real sign-in, workspace load, sign-out, re-login, and sign-out passed. Password was not displayed or logged.\n",
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Demo account provisioning failed."}\n`,
  );
  process.exitCode = 1;
});
