import { Injectable } from '@nestjs/common';
import { WorkflowJobQueueService } from '@libs/core/workflow/application/services/workflow-job-queue.service';
import { WorkflowType } from '@libs/core/workflow/domain/enums/workflow-type.enum';
import { CheckImplementationJobPayload } from '../../domain/interfaces/check-implementation-job.interface';

@Injectable()
export class EnqueueImplementationCheckUseCase {
    constructor(
        private readonly workflowJobQueueService: WorkflowJobQueueService,
    ) {}

    async execute(payload: CheckImplementationJobPayload): Promise<string> {
        return this.workflowJobQueueService.enqueue({
            workflowType: WorkflowType.CHECK_SUGGESTION_IMPLEMENTATION,
            payload,
            correlationId: `check-impl-${payload.repository.id}-${payload.pullRequestNumber}-${payload.commitSha}`,
        });
    }
}
