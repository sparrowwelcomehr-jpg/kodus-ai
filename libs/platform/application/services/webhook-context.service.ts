import { Inject, Injectable } from '@nestjs/common';
import {
    IIntegrationConfigService,
    INTEGRATION_CONFIG_SERVICE_TOKEN,
} from '@libs/integrations/domain/integrationConfigs/contracts/integration-config.service.contracts';
import { IntegrationConfigKey } from '@libs/core/domain/enums/Integration-config-key.enum';
import { PlatformType } from '@libs/core/domain/enums/platform-type.enum';
import { OrganizationAndTeamData } from '@libs/core/infrastructure/config/types/general/organizationAndTeamData';
import {
    ITeamAutomationService,
    TEAM_AUTOMATION_SERVICE_TOKEN,
} from '@libs/automation/domain/teamAutomation/contracts/team-automation.service';
import {
    AUTOMATION_SERVICE_TOKEN,
    IAutomationService,
} from '@libs/automation/domain/automation/contracts/automation.service';
import { AutomationType } from '@libs/automation/domain/automation/enum/automation-type';

@Injectable()
export class WebhookContextService {
    constructor(
        @Inject(INTEGRATION_CONFIG_SERVICE_TOKEN)
        private readonly integrationConfigService: IIntegrationConfigService,
        @Inject(TEAM_AUTOMATION_SERVICE_TOKEN)
        private readonly teamAutomationService: ITeamAutomationService,
        @Inject(AUTOMATION_SERVICE_TOKEN)
        private readonly automationService: IAutomationService,
    ) {}

    /**
     * Retrieves the organization, team, and active automation context.
     */
    async getContext(
        platformType: PlatformType,
        repositoryId: string,
    ): Promise<{
        organizationAndTeamData: OrganizationAndTeamData;
        teamAutomationId: string;
    } | null> {
        const configs =
            await this.integrationConfigService.findIntegrationConfigWithTeams(
                IntegrationConfigKey.REPOSITORIES,
                repositoryId,
                platformType,
            );

        if (!configs?.length) {
            return null;
        }

        const automations = await this.automationService.find({
            automationType: AutomationType.AUTOMATION_CODE_REVIEW,
        });
        const automation = automations?.[0];

        if (!automation) {
            return null;
        }

        for (const config of configs) {
            if (!config?.team?.organization?.uuid || !config?.team?.uuid) {
                continue;
            }

            const teamAutomations = await this.teamAutomationService.find({
                automation: { uuid: automation.uuid },
                status: true,
                team: { uuid: config.team.uuid },
            });

            if (teamAutomations?.length > 0) {
                return {
                    organizationAndTeamData: {
                        organizationId: config.team.organization.uuid,
                        teamId: config.team.uuid,
                    },
                    teamAutomationId: teamAutomations[0].uuid,
                };
            }
        }

        return null;
    }
}
