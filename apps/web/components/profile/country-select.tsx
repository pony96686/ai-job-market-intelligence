'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { getCountryOptions } from '@ai-job-market-intelligence/shared/regions';

interface CountrySelectProps {
  value: string[];
  onChange: (codes: string[]) => void;
  maxCountries?: number;
}

export function CountrySelect({ value, onChange, maxCountries = 20 }: CountrySelectProps) {
  const locale = useLocale();
  const t = useTranslations('onboarding');
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const options = useMemo(() => getCountryOptions(locale === 'zh' ? 'zh' : 'en'), [locale]);
  const selected = options.filter((c) => value.includes(c.code));
  const atLimit = value.length >= maxCountries;

  // Standard combobox behavior: focusing
  // with no query expands the full list for browsing; typing filters it in
  // real time. The list stays collapsed until focused only so the ~249
  // countries don't take up permanent space on the page.
  const suggestions = options.filter(
    (c) =>
      !value.includes(c.code) &&
      (query === '' || c.name.toLowerCase().includes(query.toLowerCase())),
  );

  function addCountry(code: string) {
    if (value.includes(code) || atLimit) return;
    onChange([...value, code]);
    setQuery('');
  }

  function removeCountry(code: string) {
    onChange(value.filter((c) => c !== code));
  }

  return (
    <div className="relative space-y-2">
      <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        {selected.map((c) => (
          <span
            key={c.code}
            className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
          >
            {c.name}
            <button
              type="button"
              onClick={() => removeCountry(c.code)}
              aria-label={`Remove ${c.name}`}
              className="rounded-sm hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder={atLimit ? undefined : t('regionsPlaceholder')}
          disabled={atLimit}
          className="min-w-[140px] flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
      </div>
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-10 max-h-56 w-full overflow-y-auto rounded-md border border-input bg-background text-sm shadow-md">
          {suggestions.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addCountry(c.code)}
                className="w-full px-3 py-2 text-left hover:bg-accent"
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
