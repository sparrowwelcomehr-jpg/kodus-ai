import { Injectable } from '@nestjs/common';
import { IJobProcessorStrategy } from '@libs/core/workflow/domain/interfaces/job-processor-strategy.interface';
import { WorkflowType } from '@libs/core/workflow/domain/enums/workflow-type.enum';
import { IWorkflowJob } from '@libs/core/workflow/domain/interfaces/workflow-job.interface';
import { VerifyImplementationUseCase } from '../use-cases/verify-implementation.use-case';
import { CheckImplementationJobPayload } from '../../domain/interfaces/check-implementation-job.interface';
import { createLogger } from '@kodus/flow';

@Injectable()
export class ImplementationVerificationProcessor implements IJobProcessorStrategy {
    private readonly logger = createLogger(
        ImplementationVerificationProcessor.name,
    );

    constructor(
        private readonly verifyImplementationUseCase: VerifyImplementationUseCase,
    ) {}

    canHandle(job: IWorkflowJob): boolean {
        return (
            job.workflowType === WorkflowType.CHECK_SUGGESTION_IMPLEMENTATION
        );
    }

    async process(job: IWorkflowJob): Promise<void> {
        this.logger.log({
            message: 'Processing implementation verification job',
            context: ImplementationVerificationProcessor.name,
            metadata: { jobId: job.uuid },
        });

        const payload = job.payload as unknown as CheckImplementationJobPayload;
        await this.verifyImplementationUseCase.execute(payload);
    }
}
