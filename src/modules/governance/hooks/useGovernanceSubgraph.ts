const GOVERNANCE_SUBGRAPH_ID = "AQoLCXebY1Ga7DrqVaVQ85KMwS7iFof73tv9XMVGRtyJ";

export function getGovernanceSubgraphUrl(): string {
  const apiKey = import.meta.env.VITE_THEGRAPH_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_THEGRAPH_API_KEY is required for governance subgraph");
  }
  return `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${GOVERNANCE_SUBGRAPH_ID}`;
}
