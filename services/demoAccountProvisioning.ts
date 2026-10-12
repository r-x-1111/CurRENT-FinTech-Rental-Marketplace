export interface DemoAuthAdmin {
  listUsers(options: { page: number; perPage: number }): Promise<{
    data: { users: Array<{ id: string; email?: string | null }> };
    error: { code?: string } | null;
  }>;
  updateUserById(
    id: string,
    attributes: {
      password: string;
      email_confirm: true;
      app_metadata: { account_kind: "demo"; verified_demo: true };
    },
  ): Promise<{ error: { code?: string } | null }>;
  createUser(attributes: {
    email: string;
    password: string;
    email_confirm: true;
    app_metadata: { account_kind: "demo"; verified_demo: true };
  }): Promise<{ error: { code?: string } | null }>;
}

const demoMetadata = {
  account_kind: "demo" as const,
  verified_demo: true as const,
};

export async function provisionDemoAccount(
  admin: DemoAuthAdmin,
  email: string,
  password: string,
): Promise<void> {
  let existingUser: { id: string } | undefined;
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.listUsers({ page, perPage: 100 });
    if (error) {
      throw new Error(
        `Demo account provisioning failed (${error.code || "AUTH_ERROR"}).`,
      );
    }
    existingUser = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );
    if (existingUser || data.users.length < 100) break;
  }

  if (existingUser) {
    const { error } = await admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      app_metadata: demoMetadata,
    });
    if (error) {
      throw new Error(
        `Demo account provisioning failed (${error.code || "AUTH_ERROR"}).`,
      );
    }
  } else {
    const { error } = await admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: demoMetadata,
    });
    if (error) {
      throw new Error(
        `Demo account provisioning failed (${error.code || "AUTH_ERROR"}).`,
      );
    }
  }
}
