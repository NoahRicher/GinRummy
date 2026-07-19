import express, { type Express } from "express";
import cors from "cors";
// Use * as to import the entire module as an object
import * as pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Use the default export if it exists, otherwise use the module itself
const pinoMiddleware = (pinoHttp.default || pinoHttp) as any;

app.use(
  pinoMiddleware({
    logger,
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  })
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
