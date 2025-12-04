import React, { useEffect, useRef } from 'react';
import { QRStyleConfig } from '../types';

interface QRCanvasProps {
  data: string;
  styleConfig: QRStyleConfig;
  className?: string;
  onInstanceReady?: (instance: any) => void;
}

export const QRCanvas: React.FC<QRCanvasProps> = ({ data, styleConfig, className, onInstanceReady }) => {
  const ref = useRef<HTMLDivElement>(null);
  const qrInstance = useRef<any>(null);

  useEffect(() => {
    // Initialize standard options
    const options: any = {
      width: styleConfig.size,
      height: styleConfig.size,
      data: data,
      image: styleConfig.logoImage,
      dotsOptions: {
        type: styleConfig.dotsType,
        color: styleConfig.fgColor,
      },
      cornersSquareOptions: {
        type: styleConfig.cornerSquareType,
        color: styleConfig.customCornerColor ? styleConfig.cornerSquareColor : styleConfig.fgColor,
      },
      cornersDotOptions: {
        type: styleConfig.cornerDotType,
        color: styleConfig.customCornerColor ? styleConfig.cornerDotColor : styleConfig.fgColor,
      },
      backgroundOptions: {
        color: styleConfig.bgTransparent ? 'transparent' : styleConfig.bgColor,
      },
      imageOptions: {
        crossOrigin: "anonymous",
        margin: styleConfig.logoPadding,
        imageSize: styleConfig.logoSize
      },
      qrOptions: {
        errorCorrectionLevel: styleConfig.errorCorrectionLevel
      }
    };

    // Handle Gradients
    if (styleConfig.isGradient) {
      options.dotsOptions.gradient = {
        type: styleConfig.gradientType,
        rotation: styleConfig.gradientRotation * (Math.PI / 180),
        colorStops: [
          { offset: 0, color: styleConfig.fgColor },
          { offset: 1, color: styleConfig.fgColor2 }
        ]
      };
      // If we aren't using custom corner colors, the gradient applies to corners too usually, 
      // but styling lib handles corners separately.
      if (!styleConfig.customCornerColor) {
         options.cornersSquareOptions.gradient = options.dotsOptions.gradient;
         options.cornersDotOptions.gradient = options.dotsOptions.gradient;
         delete options.cornersSquareOptions.color;
         delete options.cornersDotOptions.color;
      }
      delete options.dotsOptions.color;
    }

    if (!qrInstance.current) {
      if (window.QRCodeStyling) {
        qrInstance.current = new window.QRCodeStyling(options);
        if (ref.current) {
          ref.current.innerHTML = '';
          qrInstance.current.append(ref.current);
          if (onInstanceReady) onInstanceReady(qrInstance.current);
        }
      }
    } else {
      qrInstance.current.update(options);
    }
  }, [data, styleConfig, onInstanceReady]);

  return <div ref={ref} className={className} />;
};