import { Inject, Injectable } from '@nestjs/common';
import {
    IJobQueueService,
    JOB_QUEUE_SERVICE_TOKEN,
} from '@libs/core/workflow/domain/contracts/job-queue.service.contract';
import { CheckImplementationJobPayload } from '../../domain/interfaces/check-implementation-job.interface';
import { createLogger } from '@kodus/flow';
import { WorkflowType } from '@libs/core/workflow/domain/enums/workflow-type.enum';

@Injectable()
export class EnqueueImplementationCheckUseCase {
    private readonly logger = createLogger(
        EnqueueImplementationCheckUseCase.name,
    );

    constructor(
        @Inject(JOB_QUEUE_SERVICE_TOKEN)
        private readonly jobQueueService: IJobQueueService,
    ) {}

    async execute(payload: CheckImplementationJobPayload): Promise<string> {
        this.logger.log({
            message: 'Enqueuing implementation check job',
            context: EnqueueImplementationCheckUseCase.name,
            metadata: {
                prNumber: payload.pullRequestNumber,
                repositoryId: payload.repository.id,
                trigger: payload.trigger,
            },
        });

        const jobId = await this.jobQueueService.enqueue({
            workflowType: WorkflowType.CHECK_SUGGESTION_IMPLEMENTATION,
            payload: payload as unknown as Record<string, unknown>,
            organizationAndTeam: payload.organizationAndTeamData,
            correlationId: `check-impl-${payload.repository.id}-${payload.pullRequestNumber}-${payload.commitSha}`,
        });

        return jobId;
    }
}
