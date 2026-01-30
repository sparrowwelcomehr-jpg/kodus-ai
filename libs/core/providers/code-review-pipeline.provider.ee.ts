/**
 * @license
 * Kodus Tech. All rights reserved.
 */
import { CodeReviewPipelineStrategy } from '@libs/code-review/pipeline/strategy/code-review-pipeline.strategy';
import { CodeReviewPipelineContext } from '@libs/code-review/pipeline/context/code-review-pipeline.context';
import { IPipeline } from '@libs/core/infrastructure/pipeline/interfaces/pipeline.interface';
import { PipelineExecutor } from '@libs/core/infrastructure/pipeline/services/pipeline-executor.service';
import { environment } from '@libs/ee/configs/environment';
import { Provider } from '@nestjs/common';
import { CodeReviewPipelineStrategyEE } from '@libs/ee/codeReview/strategies/code-review-pipeline.strategy.ee';
import { createLogger } from '@kodus/flow';
import { CodeReviewPipelineObserver } from '@libs/code-review/infrastructure/observers/code-review-pipeline.observer';

export const CODE_REVIEW_PIPELINE_TOKEN = 'CODE_REVIEW_PIPELINE';

const logger = createLogger('codeReviewPipelineProvider');

export const codeReviewPipelineProvider: Provider = {
    provide: CODE_REVIEW_PIPELINE_TOKEN,
    useFactory: (
        ceStrategy: CodeReviewPipelineStrategy,
        eeStrategy: CodeReviewPipelineStrategyEE,
        observer: CodeReviewPipelineObserver,
    ): IPipeline<CodeReviewPipelineContext> => {
        // INTERNAL FORK: Always use Enterprise Edition strategy (Heavy Mode)
        const isCloud = true; // Force EE/Heavy mode
        const strategy = eeStrategy; // Always use Enterprise Edition strategy

        logger.log({
            message: `🔁 Modo de execução: Cloud (EE) - INTERNAL FORK - Heavy Mode Enabled`,
            context: 'CodeReviewPipelineProvider',
            metadata: {
                mode: 'cloud-ee-internal-fork',
            },
        });

        return {
            pipeLineName: 'CodeReviewPipeline',
            execute: async (
                context: CodeReviewPipelineContext,
            ): Promise<CodeReviewPipelineContext> => {
                const stages = strategy.configureStages();
                const executor = new PipelineExecutor();
                return (await executor.execute(
                    context,
                    stages,
                    strategy.getPipelineName(),
                    undefined,
                    undefined,
                    [observer],
                )) as CodeReviewPipelineContext;
            },
        };
    },
    inject: [
        CodeReviewPipelineStrategy,
        CodeReviewPipelineStrategyEE,
        CodeReviewPipelineObserver,
    ],
};
