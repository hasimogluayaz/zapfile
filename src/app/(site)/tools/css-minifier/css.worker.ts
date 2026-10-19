import { exposeWorker } from "@/lib/text-tools/worker-rpc";
import { processCss, type CssReq, type CssRes } from "./css-core";

exposeWorker<CssReq, CssRes>((req) => processCss(req));
