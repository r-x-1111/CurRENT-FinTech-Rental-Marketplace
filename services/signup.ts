import type { SupabaseClient } from "@supabase/supabase-js";

export function normalizeMalaysianMobile(value: string): string {
  const digits = value.replace(/[^0-9]/g, "");
  const national = digits.startsWith("60")
    ? digits.slice(2)
    : digits.startsWith("0")
      ? digits.slice(1)
      : digits;
  if (!/^1[0-9]{8,9}$/.test(national)) {
    throw new Error("Enter a valid Malaysian mobile number starting with 01.");
  }
  return `+60${national}`;
}

export function validateDemoCode(code: string): string {
  const value = code.trim();
  if (!/^[0-9]{6}$/.test(value)) {
    throw new Error("Enter the six-digit Demo OTP.");
  }
  return value;
}

export async function phoneDemoVerified(
  client: SupabaseClient,
): Promise<boolean> {
  const { data, error } = await client.rpc("demo_phone_verified");
  if (error) {
    throw new Error("Phone verification backend is unavailable. Apply the approved OTP migration.");
  }
  return data === true;
}

export async function requestDemoPhoneCode(
  client: SupabaseClient,
  phone: string,
): Promise<string> {
  const { data, error } = await client.rpc("issue_demo_phone_code", {
    p_phone: normalizeMalaysianMobile(phone),
  });
  if (error) throw new Error(error.message || "Could not issue a Demo OTP.");
  if (typeof data !== "string" || !/^[0-9]{6}$/.test(data)) {
    throw new Error("Demo OTP service returned an invalid response.");
  }
  return data;
}

export async function confirmDemoPhoneCode(
  client: SupabaseClient,
  code: string,
): Promise<void> {
  const { data, error } = await client.rpc("verify_demo_phone_code", {
    p_code: validateDemoCode(code),
  });
  if (error) throw new Error(error.message || "Demo OTP verification failed.");
  if (data !== true) {
    throw new Error("Incorrect, expired or locked Demo OTP. Try again or request a new code.");
  }
}
