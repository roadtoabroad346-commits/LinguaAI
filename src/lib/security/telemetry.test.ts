import { describe, it, expect } from "vitest";
import {
  deviceFingerprintSchema,
  getNetworkContext,
  hashDevice,
  isCountryChange,
  logSecurityEvent,
} from "@/lib/security/telemetry";

describe("security telemetry", () => {
  it("reads IP and Vercel geo headers", () => {
    const req = new Request("https://x.test/api/security/device", {
      headers: {
        "x-forwarded-for": "1.2.3.4, 5.6.7.8",
        "x-vercel-ip-country": "KZ",
        "x-vercel-ip-country-region": "ALA",
        "x-vercel-ip-city": "Almaty",
        "user-agent": "TestAgent/1.0",
      },
    });
    const net = getNetworkContext(req);
    expect(net.ip).toBe("1.2.3.4");
    expect(net.country).toBe("KZ");
    expect(net.region).toBe("ALA");
    expect(net.city).toBe("Almaty");
    expect(net.userAgent).toBe("TestAgent/1.0");
  });

  it("degrades gracefully without proxy headers (local dev)", () => {
    const net = getNetworkContext(new Request("http://localhost:3000/"));
    expect(net.ip).toBe("local");
    expect(net.country).toBeNull();
  });

  it("hashes devices stably and distinctly", () => {
    const a = { platform: "Win32", screen: "1920x1080x24", timezone: "Asia/Almaty", language: "ru", cores: 8, memoryGb: 8, touch: false };
    expect(hashDevice(a)).toBe(hashDevice({ ...a }));
    expect(hashDevice({ ...a, screen: "1366x768x24" })).not.toBe(hashDevice(a));
    expect(hashDevice(a)).toMatch(/^[0-9a-f]{32}$/);
  });

  it("detects country changes only when both sides are known and differ", () => {
    expect(isCountryChange("KZ", "RU")).toBe(true);
    expect(isCountryChange("KZ", "KZ")).toBe(false);
    expect(isCountryChange(null, "KZ")).toBe(false);
    expect(isCountryChange("KZ", null)).toBe(false);
  });

  it("validates fingerprints leniently", () => {
    expect(deviceFingerprintSchema.safeParse({}).success).toBe(true);
    expect(deviceFingerprintSchema.safeParse({ cores: -1 }).success).toBe(false);
    expect(deviceFingerprintSchema.parse({ platform: "x".repeat(500) }).platform).toHaveLength(80);
  });

  it("logSecurityEvent never throws and reports status", async () => {
    const okClient = { from: () => ({ insert: async () => ({ error: null }) }) };
    const failClient = { from: () => ({ insert: async () => ({ error: { message: "boom" } }) }) };
    const throwing = { from: () => { throw new Error("down"); } };
    const net = { ip: "1.1.1.1", country: null, region: null, city: null, userAgent: null };
    expect(await logSecurityEvent(okClient, { userId: "u", type: "login", net })).toBe(true);
    expect(await logSecurityEvent(failClient, { userId: "u", type: "login", net })).toBe(false);
    expect(await logSecurityEvent(throwing, { userId: "u", type: "login", net })).toBe(false);
  });
});
