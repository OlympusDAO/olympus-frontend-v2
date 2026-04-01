import type { FC, ImgHTMLAttributes, ReactElement } from "react";

interface IColorModeWrapperProps {
  light: ReactElement;
  dark: ReactElement;
}

export const ColorModeWrapper: FC<IColorModeWrapperProps> = ({ light, dark }) => {
  return (
    <>
      <div data-hide-on-theme="dark">{light}</div>
      <div data-hide-on-theme="light">{dark}</div>
    </>
  );
};

interface IColorModeImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  srcLight: string;
  srcDark: string;
}

export const ColorModeImage: FC<IColorModeImageProps> = ({ srcLight, srcDark, alt, ...props }) => {
  return (
    <ColorModeWrapper
      light={<img src={srcLight} alt={alt} {...props} />}
      dark={<img src={srcDark} alt={alt} {...props} />}
    />
  );
};
