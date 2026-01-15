import { OrganizationAndTeamData } from '@libs/core/domain/types/organization-and-team-data.type';

export interface CheckImplementationJobPayload {
    organizationAndTeamData: OrganizationAndTeamData;
    repository: { id: string; name: string };
    pullRequestNumber: number;
    commitSha: string;
    trigger: 'synchronize' | 'closed';
}
