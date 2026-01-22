import { Test, TestingModule } from '@nestjs/testing';
import { WebhookContextService } from './webhook-context.service';
import { INTEGRATION_CONFIG_SERVICE_TOKEN } from '@libs/integrations/domain/integrationConfigs/contracts/integration-config.service.contracts';
import { IntegrationConfigKey } from '@libs/core/domain/enums/Integration-config-key.enum';
import { PlatformType } from '@libs/core/domain/enums/platform-type.enum';

describe('WebhookContextService', () => {
    let service: WebhookContextService;
    let integrationConfigServiceMock: any;

    beforeEach(async () => {
        integrationConfigServiceMock = {
            findIntegrationConfigWithTeams: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WebhookContextService,
                {
                    provide: INTEGRATION_CONFIG_SERVICE_TOKEN,
                    useValue: integrationConfigServiceMock,
                },
            ],
        }).compile();

        service = module.get<WebhookContextService>(WebhookContextService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should return context when config is found', async () => {
        const platformType = PlatformType.GITHUB;
        const repositoryId = '123';
        const config = {
            team: {
                uuid: 'team-uuid',
                organization: {
                    uuid: 'org-uuid',
                },
            },
        };

        integrationConfigServiceMock.findIntegrationConfigWithTeams.mockResolvedValue(
            [config],
        );

        const result = await service.getContext(platformType, repositoryId);

        expect(result).toEqual({
            organizationId: 'org-uuid',
            teamId: 'team-uuid',
        });
        expect(
            integrationConfigServiceMock.findIntegrationConfigWithTeams,
        ).toHaveBeenCalledWith(
            IntegrationConfigKey.REPOSITORIES,
            repositoryId,
            platformType,
        );
    });

    it('should return null when config is not found', async () => {
        integrationConfigServiceMock.findIntegrationConfigWithTeams.mockResolvedValue(
            [],
        );

        const result = await service.getContext(PlatformType.GITHUB, '123');

        expect(result).toBeNull();
    });

    it('should return null when config is incomplete', async () => {
        const config = {
            team: {
                // missing uuid
                organization: {
                    uuid: 'org-uuid',
                },
            },
        };
        integrationConfigServiceMock.findIntegrationConfigWithTeams.mockResolvedValue(
            [config],
        );

        const result = await service.getContext(PlatformType.GITHUB, '123');

        expect(result).toBeNull();
    });
});
