import type { z } from 'zod';

type Translator = (key: string, values?: Record<string, string | number>) => string;

const FIELD_LABEL_KEYS = ['skills', 'experienceYears', 'preferredRoles'] as const;
type FieldLabelKey = (typeof FIELD_LABEL_KEYS)[number];

function isFieldLabelKey(key: string): key is FieldLabelKey {
  return (FIELD_LABEL_KEYS as readonly string[]).includes(key);
}

function fieldLabel(t: Translator, path: (string | number)[]): string {
  const key = String(path[0] ?? '');
  return isFieldLabelKey(key) ? t(`fieldLabels.${key}`) : key;
}

// Zod validation errors must be mapped to localized messages rather than
// shown as Zod's raw English text. Passed to
// zodResolver's `schemaOptions.errorMap` so react-hook-form's field errors
// come back already translated for the current locale.
export function createZodErrorMap(t: Translator): z.ZodErrorMap {
  return (issue, ctx) => {
    const field = fieldLabel(t, issue.path);

    switch (issue.code) {
      case 'too_small':
        if (issue.type === 'array') return { message: t('arrayTooSmall', { field, min: Number(issue.minimum) }) };
        if (issue.type === 'string') return { message: t('stringTooShort', { field }) };
        if (issue.type === 'number') return { message: t('numberTooSmall', { field, min: Number(issue.minimum) }) };
        break;
      case 'too_big':
        if (issue.type === 'array') return { message: t('arrayTooBig', { field, max: Number(issue.maximum) }) };
        if (issue.type === 'string') return { message: t('stringTooLong', { field, max: Number(issue.maximum) }) };
        if (issue.type === 'number') return { message: t('numberTooBig', { field, max: Number(issue.maximum) }) };
        break;
      case 'invalid_type':
        if (issue.received === 'undefined' || issue.received === 'null') {
          return { message: t('required', { field }) };
        }
        return { message: t('invalidType', { field }) };
    }

    return { message: ctx.defaultError };
  };
}
