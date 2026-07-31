import { Card, CardContent } from '@/components/ui/card';

export function JobDescription({ description }: { description: string }) {
  return (
    <Card data-testid="job-description">
      <CardContent className="whitespace-pre-wrap p-6 text-sm">{description}</CardContent>
    </Card>
  );
}
