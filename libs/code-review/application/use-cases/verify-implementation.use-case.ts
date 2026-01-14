import { Inject, Injectable } from '@nestjs/common';
import { createLogger } from '@kodus/flow';
import { CheckImplementationJobPayload } from '../../domain/interfaces/check-implementation-job.interface';
import {
    ISuggestionService,
    SUGGESTION_SERVICE_TOKEN,
} from '@libs/code-review/domain/contracts/SuggestionService.contract';
import {
    IPullRequestsService,
    PULL_REQUESTS_SERVICE_TOKEN,
} from '@libs/platformData/domain/pullRequests/contracts/pullRequests.service.contracts';
import {
    ICodeManagementService,
    CODE_MANAGEMENT_SERVICE_TOKEN,
} from '@libs/platform/domain/platformIntegrations/contracts/codeManagement.service.contract';
import { DeliveryStatus } from '@libs/core/infrastructure/config/types/general/codeReview.type';
import { ImplementationStatus } from '@libs/core/infrastructure/config/types/general/types/codeReview.types';

@Injectable()
export class VerifyImplementationUseCase {
    private readonly logger = createLogger(VerifyImplementationUseCase.name);

    constructor(
        @Inject(SUGGESTION_SERVICE_TOKEN)
        private readonly suggestionService: ISuggestionService,
        @Inject(PULL_REQUESTS_SERVICE_TOKEN)
        private readonly pullRequestService: IPullRequestsService,
        @Inject(CODE_MANAGEMENT_SERVICE_TOKEN)
        private readonly codeManagementService: ICodeManagementService,
    ) {}

    async execute(payload: CheckImplementationJobPayload): Promise<void> {
        const {
            organizationAndTeamData,
            pullRequestNumber,
            repository,
            commitSha,
        } = payload;

        this.logger.log({
            message: 'Executing implementation verification',
            context: VerifyImplementationUseCase.name,
            metadata: {
                prNumber: pullRequestNumber,
                repositoryId: repository.id,
                commitSha,
            },
        });

        // 1. Fetch changed files for the current state of the PR
        const changedFiles =
            await this.codeManagementService.getFilesByPullRequestId({
                organizationAndTeamData,
                repository,
                prNumber: pullRequestNumber,
            });

        if (!changedFiles || changedFiles.length === 0) {
            this.logger.log({
                message: 'No changed files found for PR, skipping verification',
                context: VerifyImplementationUseCase.name,
                metadata: { prNumber: pullRequestNumber },
            });
            return;
        }

        // 2. Iterate over changed files to find relevant suggestions
        for (const file of changedFiles) {
            // Fetch suggestions associated with this file and PR that are NOT yet implemented
            const savedSuggestions =
                await this.pullRequestService.findSuggestionsByPRAndFilename(
                    pullRequestNumber,
                    repository.name, // Assuming repositoryFullName is stored or name is sufficient context based on existing service logic
                    file.filename,
                    organizationAndTeamData,
                );

            if (!savedSuggestions || savedSuggestions.length === 0) {
                continue;
            }

            // Filter for Sent suggestions that are not yet implemented
            const pendingSuggestions = savedSuggestions.filter(
                (suggestion) =>
                    suggestion.deliveryStatus === DeliveryStatus.SENT &&
                    suggestion.implementationStatus !==
                        ImplementationStatus.IMPLEMENTED, // We re-check NOT_IMPLEMENTED and PARTIALLY_IMPLEMENTED
            );

            if (pendingSuggestions.length === 0) {
                continue;
            }

            // 3. Delegate to SuggestionService to validate against the patch
            // Note: Reuse existing logic which calls LLM
            await this.suggestionService.validateImplementedSuggestions(
                organizationAndTeamData,
                file.patch,
                pendingSuggestions,
                pullRequestNumber,
            );
        }

        this.logger.log({
            message: 'Finished implementation verification',
            context: VerifyImplementationUseCase.name,
            metadata: { prNumber: pullRequestNumber },
        });
    }
}
