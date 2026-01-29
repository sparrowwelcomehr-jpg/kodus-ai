import { PipelineReason } from '../interfaces/pipeline-reason.interface';

export const PipelineReasons = {
    CONFIG: {
        DISABLED: {
            message: 'Automated Review is disabled',
            action: "Enable 'Automated Code Review' in General Settings",
        } as PipelineReason,
        IGNORED_TITLE: {
            message: 'Title Ignored',
            action: "Remove keywords defined in 'Ignore title keywords' setting",
        } as PipelineReason,
        DRAFT: {
            message: 'Draft PR Skipped',
            action: "Enable 'Running on Draft Pull Requests' in settings or mark as Ready",
        } as PipelineReason,
        BRANCH_MISMATCH: {
            message: 'Branch Mismatch',
            action: 'Review only runs on specific target branches',
        } as PipelineReason,
    },
    FILES: {
        NO_CHANGES: {
            message: 'No Files Changed',
        } as PipelineReason,
        ALL_IGNORED: {
            message: 'All Files Ignored',
            action: "Check your 'Ignored files' patterns in settings",
        } as PipelineReason,
        TOO_MANY: {
            message: 'Too Many Files',
            action: 'Reduce PR size for better review quality',
        } as PipelineReason,
    },
    COMMITS: {
        NO_NEW: {
            message: 'No New Commits',
            description: 'We already reviewed the latest changes',
        } as PipelineReason,
        ONLY_MERGE: {
            message: 'Only Merge Commits',
            description: 'Merge commits are skipped to avoid noise',
        } as PipelineReason,
    },
    PREREQUISITES: {
        CLOSED: {
            message: 'PR is Closed',
        } as PipelineReason,
        LOCKED: {
            message: 'PR is Locked',
        } as PipelineReason,
    },
    SUGGESTIONS: {
        VALIDATION_FAILED: {
            message: 'Suggestion Validation Failed',
            action: 'Contact support if this persists',
        } as PipelineReason,
        NO_RESULTS: {
            message: 'No Validated Suggestions',
            description: 'Validation filtered out all suggestions',
        } as PipelineReason,
    },
    FINE_TUNING: {
        DISABLED: {
            message: 'Fine-Tuning Disabled',
            description: 'Context skipped as per configuration',
        } as PipelineReason,
        NO_MATCHES: {
            message: 'No Matching Examples',
            description: 'No relevant fine-tuning examples found',
        } as PipelineReason,
    },
};
