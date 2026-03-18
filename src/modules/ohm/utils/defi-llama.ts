/** Maps a DefiLlama project slug to a human-readable name. */
export function mapProjectToName(project: string): string {
  const overrides: Record<string, string> = {
    "uniswap-v3": "Uniswap V3",
    "uniswap-v2": "Uniswap V2",
    "curve-dex": "Curve",
    curve: "Curve",
    "balancer-v2": "Balancer V2",
    balancer: "Balancer",
    "aave-v3": "Aave V3",
    "aave-v2": "Aave V2",
    aave: "Aave",
    "compound-v3": "Compound V3",
    "compound-v2": "Compound V2",
    compound: "Compound",
    dolomite: "Dolomite",
    frax: "Frax",
    fraxlend: "FraxLend",
    "camelot-v3": "Camelot V3",
    "camelot-v2": "Camelot V2",
    camelot: "Camelot",
    sushiswap: "SushiSwap",
    euler: "Euler",
    "morpho-blue": "Morpho Blue",
    morpho: "Morpho",
    spark: "Spark",
  };

  return (
    overrides[project.toLowerCase()] ??
    project
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}
