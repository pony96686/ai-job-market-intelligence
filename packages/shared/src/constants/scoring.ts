// Bumped whenever the scoring algorithm changes in a way that should trigger
// re-scoring of already-scored jobs, see ai-scoring.md §7.1.
// v3: region/salary preference penalties (R4/R5) + roleScore now matches
// against job tags too, not just title (mvp-scope.md §8 Epic 5.9/5.10).
export const CURRENT_SCORING_VERSION = 'v3';
