import { exposeWorker } from "@/lib/text-tools/worker-rpc";
import { processXml, type XmlReq, type XmlRes } from "./xml-core";

exposeWorker<XmlReq, XmlRes>((req) => processXml(req));
