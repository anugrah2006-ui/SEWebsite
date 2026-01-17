import type { CSSProperties, HTMLAttributes, DetailedHTMLProps } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Use loose typing to avoid conflicts with Next's JSX types across versions
      'lottie-player': any;
    }
  }
}
