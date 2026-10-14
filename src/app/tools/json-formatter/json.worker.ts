import { exposeWorker } from "@/lib/text-tools/worker-rpc";
import { processJson, type JsonReq, type JsonRes } from "./json-tool";

exposeWorker<JsonReq, JsonRes>((req) => processJson(req));
