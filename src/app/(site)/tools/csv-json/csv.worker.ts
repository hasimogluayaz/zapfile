import { exposeWorker } from "@/lib/text-tools/worker-rpc";
import { processCsv, type CsvReq, type CsvRes } from "./csv-core";

exposeWorker<CsvReq, CsvRes>((req) => processCsv(req));
