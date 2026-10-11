import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the private provisioning environment.",
  );
}
function readHiddenPassword() {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Run provisioning from a private interactive terminal.");
  }
  return new Promise((resolve, reject) => {
    let password = "";
    process.stdout.write("Enter the founder-provided Demo password: ");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const finish = (error) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(password);
    };
    const onData = (input) => {
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

const password = await readHiddenPassword();
if (!password) {
  throw new Error("A password is required.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
let existingUser;
for (let page = 1; ; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page,
    perPage: 100,
  });
  if (error) {
    throw new Error(
      `Demo account provisioning failed (${error.code || "AUTH_ERROR"}).`,
    );
  }
  existingUser = data.users.find(
    (user) => user.email?.toLowerCase() === "democurrent@gmail.com",
  );
  if (existingUser || data.users.length < 100) break;
}

if (existingUser) {
  const { error } = await supabase.auth.admin.updateUserById(existingUser.id, {
    app_metadata: {
      account_kind: "demo",
      verified_demo: true,
    },
  });
  if (error) {
    throw new Error(
      `Demo account provisioning failed (${error.code || "AUTH_ERROR"}).`,
    );
  }
} else {
  const password = await readHiddenPassword();
  if (!password) {
    throw new Error("A password is required.");
  }
  const { error } = await supabase.auth.admin.createUser({
    email: "DemoCurRENT@gmail.com",
    password,
    email_confirm: true,
    app_metadata: {
      account_kind: "demo",
      verified_demo: true,
    },
  });
  if (error) {
    throw new Error(
      `Demo account provisioning failed (${error.code || "AUTH_ERROR"}).`,
    );
  }
}
process.stdout.write(
  "Demo Auth account provisioned with restricted Demo metadata. Existing passwords are preserved; no password was displayed or saved.\n",
);
