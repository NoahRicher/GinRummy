import express, { type Express } from "express";
import cors from "cors";
// 1. Import the types for the pino-http serializers
import pinoHttp, { type SerializerFn } from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      // 2. Explicitly type these as SerializerFn to stop TS7006
      req: ((req: any) => {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      }) as SerializerFn,
      res: ((res: any) => {
        return {
          statusCode: res.statusCode,
        };
      }) as SerializerFn,
    },
  }),
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
