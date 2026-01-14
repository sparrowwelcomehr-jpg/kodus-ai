import { OrganizationAndTeamData } from '@libs/core/infrastructure/config/types/general/organizationAndTeamData';

export class CheckImplementationEvent {
    public static readonly NAME = 'suggestion.check-implementation';

    constructor(
        public readonly organizationAndTeamData: OrganizationAndTeamData,
        public readonly repository: { id: string; name: string },
        public readonly pullRequestNumber: number,
        public readonly commitSha: string,
        public readonly trigger: 'synchronize' | 'closed' | 'manual',
    ) {}
}
