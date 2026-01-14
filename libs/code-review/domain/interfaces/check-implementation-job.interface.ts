import { OrganizationAndTeamData } from '@libs/core/infrastructure/config/types/general/organizationAndTeamData';

export interface CheckImplementationJobPayload {
    organizationAndTeamData: OrganizationAndTeamData;
    repository: {
        id: string;
        name: string;
    };
    pullRequestNumber: number;
    commitSha: string;
    trigger: 'synchronize' | 'closed' | 'manual';
}
