import { Router } from "express";
import { db, roomsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// POST /api/rooms — create a new room with initial session state
router.post("/rooms", async (req, res) => {
  const { session } = req.body as { session: Record<string, unknown> };
  if (!session || typeof session.noahScore !== "number") {
    res.status(400).json({ error: "Invalid session data" });
    return;
  }

  let code = generateCode();
  for (let attempt = 0; attempt < 10; attempt++) {
    const existing = await db
      .select()
      .from(roomsTable)
      .where(eq(roomsTable.code, code))
      .limit(1);
    if (existing.length === 0) break;
    code = generateCode();
  }

  await db.insert(roomsTable).values({ code, sessionData: session });
  res.status(201).json({ code });
});

// GET /api/rooms/:code — fetch current session state
router.get("/rooms/:code", async (req, res) => {
  const code = req.params.code.toUpperCase();
  const rows = await db
    .select()
    .from(roomsTable)
    .where(eq(roomsTable.code, code))
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const room = rows[0];
  res.json({ session: room.sessionData, updatedAt: room.updatedAt });
});

// PUT /api/rooms/:code — update session state
router.put("/rooms/:code", async (req, res) => {
  const code = req.params.code.toUpperCase();
  const { session } = req.body as { session: Record<string, unknown> };

  if (!session || typeof session.noahScore !== "number") {
    res.status(400).json({ error: "Invalid session data" });
    return;
  }

  const result = await db
    .update(roomsTable)
    .set({ sessionData: session, updatedAt: new Date() })
    .where(eq(roomsTable.code, code))
    .returning();

  if (result.length === 0) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  res.json({ ok: true, updatedAt: result[0].updatedAt });
});

export default router;
