import { Router, type Request, type Response } from "express"; // 1. Add Request and Response types
import { HealthCheckResponse } from "@workspace/api-zod";

const router = Router();

// 2. Add : Request and : Response types to the arguments
router.get("/healthz", (req: Request, res: Response) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;
