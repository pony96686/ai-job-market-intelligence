// Bumped whenever the scoring algorithm changes in a way that should trigger
// re-scoring of already-scored jobs.
// v3: region/salary preference penalties (R4/R5) + roleScore now matches
// against job tags too, not just title.
export const CURRENT_SCORING_VERSION = 'v3';
