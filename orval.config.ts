import { defineConfig } from "orval";
import { config } from "dotenv";

config();

const API_URL =
  process.env.OLYMPUS_API_URL ?? "https://dev-olympus-api.callisto.finance/openapi.json";

export default defineConfig({
  olympusUnits: {
    input: {
      target: API_URL,
    },
    output: {
      target: "src/generated/olympusUnits.ts",
      client: "react-query",
      clean: true,
      override: {
        mutator: {
          path: "src/api/customHttpClient.ts",
          name: "customHttpClient",
        },
        useTypeOverInterfaces: true,
        query: {
          useQuery: true,
          useMutation: true,
          useInfinite: false,
        },
        fetch: {
          includeHttpResponseReturnType: false,
        },
      },
    },
    // hooks: {
    //   afterAllFilesWrite: "biome check --write",
    // },
  },
});
