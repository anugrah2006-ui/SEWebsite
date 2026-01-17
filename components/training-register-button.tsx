'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export default function TrainingRegisterButton({
  children,
  size,
  variant,
  className,
}: {
  children?: React.ReactNode;
  size?: any;
  variant?: any;
  className?: string;
}) {
  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      onClick={() => void signIn('google')}
    >
      {children ?? "Register here — we'll update you for upcoming trainings"}
    </Button>
  );
}
