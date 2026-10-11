import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeMalaysianMobile,
  validateDemoCode,
  checkExampleOtp,
  DEMO_OTP,
} from "../services/signup";

test("Malaysian mobile numbers normalize to +60 E.164", () => {
  assert.equal(normalizeMalaysianMobile("012 345 6789"), "+60123456789");
  assert.equal(normalizeMalaysianMobile("011-1234 5678"), "+601112345678");
  assert.equal(normalizeMalaysianMobile("+60123456789"), "+60123456789");
});

test("Sign Up rejects a blank or invalid Malaysian mobile number", () => {
  for (const phone of ["", "123", "01912", "+6581234567", "00123456789"]) {
    assert.throws(() => normalizeMalaysianMobile(phone), /valid Malaysian mobile/);
  }
});

test("The OTP input must have precisely six digits", () => {
  assert.equal(validateDemoCode(" 012345 "), "012345");
  for (const value of ["", "12345", "1234567", "abcdef", "12 456"]) {
    assert.throws(() => validateDemoCode(value), /six-digit Demo OTP/);
  }
});

test("Demo OTP is a deliberate fixed visual example, not SMS or backend verification", () => {
  assert.equal(DEMO_OTP, "123456");
  assert.doesNotThrow(() => checkExampleOtp("123456"));
  assert.throws(() => checkExampleOtp("654321"), /example six-digit code/);
});
