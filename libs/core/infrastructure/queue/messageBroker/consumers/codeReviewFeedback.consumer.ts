import {
    RabbitSubscribe,
    MessageHandlerErrorBehavior,
} from '@golevelup/nestjs-rabbitmq';
import { createLogger } from '@kodus/flow';
import { Injectable } from '@nestjs/common';
import { ConsumeMessage } from 'amqplib';

import { SaveCodeReviewFeedbackUseCase } from '@libs/code-review/application/use-cases/codeReviewFeedback/save-feedback.use-case';
import { RabbitMQErrorHandler } from '@libs/core/infrastructure/queue/rabbitmq-error.handler';
import { ObservabilityService } from '@libs/core/log/observability.service';

@Injectable()
export class CodeReviewFeedbackConsumer {
    private readonly logger = createLogger(CodeReviewFeedbackConsumer.name);
    constructor(
        private readonly saveCodeReviewFeedbackUseCase: SaveCodeReviewFeedbackUseCase,
        private readonly observability: ObservabilityService,
    ) {}

    @RabbitSubscribe({
        exchange: 'orchestrator.exchange.delayed',
        routingKey: 'codeReviewFeedback.syncCodeReviewReactions',
        queue: 'codeReviewFeedback.syncCodeReviewReactions.queue',
        allowNonJsonMessages: true,
        errorBehavior: MessageHandlerErrorBehavior.ACK,
        errorHandler: (channel, msg, err) =>
            RabbitMQErrorHandler.instance?.handle(channel, msg, err, {
                dlqRoutingKey: 'codeReviewFeedback.syncCodeReviewReactions',
            }),
        queueOptions: {
            arguments: {
                'x-queue-type': 'quorum',
                'x-dead-letter-exchange': 'orchestrator.exchange.dlx',
                'x-dead-letter-routing-key':
                    'codeReviewFeedback.syncCodeReviewReactions',
            },
        },
    })
    async handleSyncCodeReviewReactions(message: any, amqpMsg: ConsumeMessage) {
        const payload = message?.payload;
        const headers = amqpMsg?.properties?.headers;
        const correlationId =
            headers?.['x-correlation-id'] ||
            payload?.correlationId ||
            amqpMsg?.properties?.correlationId;

        if (correlationId) {
            this.observability.setContext(correlationId);
        }

        return await this.observability.runInSpan(
            'code_review.feedback.sync',
            async (span) => {
                if (payload) {
                    span.setAttributes({
                        'code_review.team_id': payload.teamId,
                        'code_review.organization_id': payload.organizationId,
                        'code_review.correlation_id': correlationId,
                    });

                    try {
                        await this.saveCodeReviewFeedbackUseCase.execute(
                            payload,
                        );
                        this.logger.debug({
                            message: `Code review feedback processing for team ${payload.teamId} completed successfully.`,
                            context: CodeReviewFeedbackConsumer.name,
                            metadata: {
                                teamId: payload.teamId,
                                organizationId: payload.organizationId,
                                timestamp: new Date().toISOString(),
                                correlationId,
                            },
                        });
                    } catch (error) {
                        span.setAttributes({
                            'error': true,
                            'exception.message': error.message,
                        });

                        this.logger.error({
                            message: `Error processing code review feedback for team ${payload.teamId}`,
                            context: CodeReviewFeedbackConsumer.name,
                            error: error.message,
                            metadata: {
                                teamId: payload.teamId,
                                organizationId: payload.organizationId,
                                timestamp: new Date().toISOString(),
                                correlationId,
                            },
                        });

                        throw error;
                    }
                } else {
                    span.setAttributes({
                        'error': true,
                        'exception.message': 'Missing payload',
                    });

                    this.logger.error({
                        message:
                            'Message without payload received by the consumer',
                        context: CodeReviewFeedbackConsumer.name,
                        metadata: {
                            message,
                            timestamp: new Date().toISOString(),
                            correlationId,
                        },
                    });

                    throw new Error('Invalid message: no payload');
                }
            },
        );
    }
}
