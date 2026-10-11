/**
 * Classroom presentation helpers only.
 * The example OTP is deliberately public and is NOT a security credential.
 * Authentication is still handled separately by Supabase email/password.
 */
export const DEMO_OTP = "123456";

export function normalizeMalaysianMobile(value: string): string {
  const digits = value.replace(/[^0-9]/g, "");
  const national = digits.startsWith("60") ? digits.slice(2)
    : digits.startsWith("0") ? digits.slice(1) : digits;
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

export function checkExampleOtp(code: string): void {
  if (validateDemoCode(code) !== DEMO_OTP) {
    throw new Error("Enter the example six-digit code shown above.");
  }
}
