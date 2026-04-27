import type { SVGProps } from "react";
import * as AllIcons from "../icons";

export type IconName = keyof typeof AllIcons;

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number | string;
  color?: string;
}

export function Icon(props: IconProps) {
  const { name, size = 24, color = "currentColor", ...rest } = props;

  // biome-ignore lint/performance/noDynamicNamespaceImportAccess: dynamic icon lookup by name prop
  const SvgComponent = AllIcons[name];
  return <SvgComponent width={size} height={size} fill={color} {...rest} />;
}
