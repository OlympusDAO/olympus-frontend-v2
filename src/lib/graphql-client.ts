import { GraphQLClient } from "graphql-request";
import { GRAPHQL_ENDPOINT } from "@/lib/constants";

export const cdsGraphqlClient = new GraphQLClient(GRAPHQL_ENDPOINT);

const COOLER_SUBGRAPH_URL = import.meta.env.VITE_COOLER_METRICS_SUBGRAPH;

export const coolerGraphqlClient = new GraphQLClient(COOLER_SUBGRAPH_URL || "");
