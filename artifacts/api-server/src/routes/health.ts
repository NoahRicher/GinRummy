import { Router } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router = Router();

// Using 'any' here satisfies 'noImplicitAny: true' 
// without needing to resolve complex Express Request/Response types
router.get("/healthz", (req: any, res: any) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;
