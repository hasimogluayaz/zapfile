import { exposeWorker } from "@/lib/text-tools/worker-rpc";
import { processYaml, type YamlReq, type YamlRes } from "./yaml-tool";

exposeWorker<YamlReq, YamlRes>((req) => processYaml(req));
