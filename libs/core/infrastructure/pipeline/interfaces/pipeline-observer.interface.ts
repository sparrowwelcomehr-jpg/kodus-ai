import { PipelineContext } from './pipeline-context.interface';
import { StageVisibility } from '../enums/stage-visibility.enum';

export interface IPipelineObserver {
    onStageStart(
        stageName: string,
        context: PipelineContext,
        options?: { visibility?: StageVisibility; label?: string },
    ): Promise<void>;
    onStageFinish(
        stageName: string,
        context: PipelineContext,
        options?: { visibility?: StageVisibility; label?: string },
    ): Promise<void>;
    onStageError(
        stageName: string,
        error: Error,
        context: PipelineContext,
        options?: { visibility?: StageVisibility; label?: string },
    ): Promise<void>;
    onStageSkipped(
        stageName: string,
        reason: string,
        context: PipelineContext,
        options?: { visibility?: StageVisibility; label?: string },
    ): Promise<void>;
}
