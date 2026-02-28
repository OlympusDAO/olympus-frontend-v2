import { GraphQLClient } from "graphql-request";
import { CD_SUBGRAPH_URL, COOLER_SUBGRAPH_URL } from "@/lib/constants";

export const cdsGraphqlClient = new GraphQLClient(CD_SUBGRAPH_URL);

export const coolerGraphqlClient = new GraphQLClient(COOLER_SUBGRAPH_URL || "");
