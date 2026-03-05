/**
 * Tests for API authentication & role-based access patterns.
 *
 * We don't spin up a real HTTP server. Instead we test the *pattern* by
 * extracting the auth-check logic into a helper and verifying it returns
 * the correct HTTP status for different session scenarios.
 */

/* ---------- tiny mock helpers ---------- */
type MockSession = {
  user: { id: string; name: string; email: string; role: string };
} | null;

function checkAuth(session: MockSession) {
  if (!session) return { error: "Unauthorized", status: 401 };
  return null; // authenticated
}

function checkOwnerRole(session: MockSession) {
  if (!session || session.user.role !== "OWNER") {
    return { error: "Forbidden", status: 403 };
  }
  return null; // authorized
}

/* ---------- tests ---------- */
describe("API Auth & Role Guards", () => {
  const ownerSession: MockSession = {
    user: { id: "1", name: "Owner", email: "owner@aims.com", role: "OWNER" },
  };

  const staffSession: MockSession = {
    user: { id: "2", name: "Staff", email: "staff@aims.com", role: "STAFF" },
  };

  // ── Authentication ──────────────────────────────────────
  describe("checkAuth – any authenticated user", () => {
    it("returns 401 when no session", () => {
      const result = checkAuth(null);
      expect(result).toEqual({ error: "Unauthorized", status: 401 });
    });

    it("passes for OWNER session", () => {
      expect(checkAuth(ownerSession)).toBeNull();
    });

    it("passes for STAFF session", () => {
      expect(checkAuth(staffSession)).toBeNull();
    });
  });

  // ── Owner-only routes ───────────────────────────────────
  describe("checkOwnerRole – owner-only routes", () => {
    it("returns 403 when no session", () => {
      const result = checkOwnerRole(null);
      expect(result).toEqual({ error: "Forbidden", status: 403 });
    });

    it("returns 403 for STAFF user", () => {
      const result = checkOwnerRole(staffSession);
      expect(result).toEqual({ error: "Forbidden", status: 403 });
    });

    it("passes for OWNER user", () => {
      expect(checkOwnerRole(ownerSession)).toBeNull();
    });
  });
});
