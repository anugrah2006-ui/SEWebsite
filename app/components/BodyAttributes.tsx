"use client";

import { useEffect } from 'react';

type BodyAttributesProps = {
  attributes: Record<string, string>;
};

export default function BodyAttributes({ attributes }: BodyAttributesProps) {
  useEffect(() => {
    if (!attributes) return;
    Object.entries(attributes).forEach(([key, value]) => {
      document.body.setAttribute(key, value);
    });
  }, [attributes]);

  return null;
}
