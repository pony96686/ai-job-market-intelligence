'use client';

import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagInputProps {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  maxTagLength?: number;
}

export function TagInput({ id, value, onChange, placeholder, maxTags, maxTagLength = 50 }: TagInputProps) {
  const [draft, setDraft] = useState('');

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag || tag.length > maxTagLength) return;
    if (value.includes(tag)) return;
    if (maxTags && value.length >= maxTags) return;
    onChange([...value, tag]);
    setDraft('');
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  }

  return (
    <div
      className={cn(
        'flex min-h-10 flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm',
        'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
      )}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            aria-label={`Remove ${tag}`}
            className="rounded-sm hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(draft)}
        placeholder={value.length === 0 ? placeholder : undefined}
        className="min-w-[140px] flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
