declare module 'qrcode' {
  export interface QRCodeToDataURLOptions {
    width?: number;
    margin?: number;
    scale?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    type?: string;
    quality?: number;
    rendererOpts?: {
      quality?: number;
    };
  }

  export function toDataURL(
    text: string,
    options?: QRCodeToDataURLOptions
  ): Promise<string>;

  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: QRCodeToDataURLOptions
  ): Promise<HTMLCanvasElement>;

  export function toString(
    text: string,
    options?: QRCodeToDataURLOptions
  ): Promise<string>;

  export function toFile(
    path: string,
    text: string,
    options?: QRCodeToDataURLOptions
  ): Promise<void>;
}