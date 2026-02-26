import { GraphQLClient } from "graphql-request";
import { CDS_GRAPHQL_ENDPOINT } from "@/lib/constants";

export const cdsGraphqlClient = new GraphQLClient(CDS_GRAPHQL_ENDPOINT);

const COOLER_SUBGRAPH_URL = import.meta.env.VITE_COOLER_METRICS_SUBGRAPH;

export const coolerGraphqlClient = new GraphQLClient(COOLER_SUBGRAPH_URL || "");
