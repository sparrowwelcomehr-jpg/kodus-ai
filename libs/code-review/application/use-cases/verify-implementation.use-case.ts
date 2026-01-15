import { Injectable, Logger } from '@nestjs/common';
import { SuggestionService } from '../../infrastructure/adapters/services/suggestion.service';
import { CheckImplementationJobPayload } from '../../domain/interfaces/check-implementation-job.interface';

@Injectable()
export class VerifyImplementationUseCase {
    private readonly logger = new Logger(VerifyImplementationUseCase.name);

    constructor(private readonly suggestionService: SuggestionService) {}

    async execute(payload: CheckImplementationJobPayload): Promise<void> {
        this.logger.log(
            `Verifying implementation for PR #${payload.pullRequestNumber} in ${payload.repository.name} (Trigger: ${payload.trigger})`,
        );

        try {
            await this.suggestionService.validateImplementedSuggestions({
                organizationAndTeamData: payload.organizationAndTeamData,
                repository: payload.repository,
                pullRequestNumber: payload.pullRequestNumber,
            });
            this.logger.log(
                `Implementation verification completed for PR #${payload.pullRequestNumber}`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to verify implementation for PR #${payload.pullRequestNumber}: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }
}
