export type SubmissionFailureKind = "known" | "ambiguous";

export function classifySubmissionFailure(diagnostic: string): SubmissionFailureKind;
export function submissionArguments(sourceArchive: string): string[];
