export function isSubmissionComplete(requiredPlantIds, submissionPlants) {
  if (!requiredPlantIds || requiredPlantIds.length === 0) return false;

  const answered = new Set(
    submissionPlants
      .filter((p) => (p.proposedName || '').trim().length > 0)
      .map((p) => p.refPlantId)
  );

  return requiredPlantIds.every((id) => answered.has(id));
}
