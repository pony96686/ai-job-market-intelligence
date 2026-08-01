'use client';

import { Input } from '@/components/ui/input';

interface SalaryInputProps {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  placeholder?: string;
}

export function SalaryInput({ value, onChange, placeholder }: SalaryInputProps) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      min={1}
      className="w-40"
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === '' ? null : Number(raw));
      }}
    />
  );
}
