import { Injectable, Logger } from '@nestjs/common';
import { WorkflowJobProcessor } from '@libs/core/workflow/domain/interfaces/workflow-job-processor.interface';
import { WorkflowType } from '@libs/core/workflow/domain/enums/workflow-type.enum';
import { CheckImplementationJobPayload } from '../../domain/interfaces/check-implementation-job.interface';
import { VerifyImplementationUseCase } from '../use-cases/verify-implementation.use-case';

@Injectable()
export class ImplementationVerificationProcessor implements WorkflowJobProcessor<CheckImplementationJobPayload> {
    private readonly logger = new Logger(
        ImplementationVerificationProcessor.name,
    );

    constructor(
        private readonly verifyImplementationUseCase: VerifyImplementationUseCase,
    ) {}

    async process(payload: CheckImplementationJobPayload): Promise<void> {
        this.logger.log(
            `Processing implementation verification job for PR #${payload.pullRequestNumber}`,
        );
        await this.verifyImplementationUseCase.execute(payload);
    }

    getWorkflowType(): WorkflowType {
        return WorkflowType.CHECK_SUGGESTION_IMPLEMENTATION;
    }
}
