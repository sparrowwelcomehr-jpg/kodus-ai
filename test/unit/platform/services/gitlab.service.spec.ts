import { Test, TestingModule } from '@nestjs/testing';
import { GitlabService } from '@libs/platform/infrastructure/adapters/services/gitlab.service';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '@libs/core/cache/cache.service';
import { MCPManagerService } from '@libs/mcp-server/services/mcp-manager.service';
import { INTEGRATION_SERVICE_TOKEN } from '@libs/integrations/domain/integrations/contracts/integration.service.contracts';
import { AUTH_INTEGRATION_SERVICE_TOKEN } from '@libs/integrations/domain/authIntegrations/contracts/auth-integration.service.contracts';
import { INTEGRATION_CONFIG_SERVICE_TOKEN } from '@libs/integrations/domain/integrationConfigs/contracts/integration-config.service.contracts';

describe('GitlabService - getChangedFilesSinceLastCommit', () => {
    let service: GitlabService;
    let mockGitlabAPI: any;

    const mockOrganizationAndTeamData = {
        organizationId: 'org-123',
        teamId: 'team-456',
        organization: {
            uuid: 'org-123',
        },
        team: {
            uuid: 'team-456',
        },
    };

    const mockRepository = {
        id: 12345,
        name: 'test-repo',
    };

    const mockLastCommit = {
        id: 'old-commit-sha',
        created_at: '2024-01-01T10:00:00Z',
    };

    beforeEach(async () => {
        // Mock do GitLab API
        mockGitlabAPI = {
            MergeRequests: {
                allCommits: jest.fn(),
            },
            Commits: {
                showDiff: jest.fn(),
            },
        };

        const mockIntegrationService = {
            findOne: jest.fn(),
        };

        const mockIntegrationConfigService = {
            findOne: jest.fn(),
        };

        const mockAuthIntegrationService = {
            findByIntegrationConfig: jest.fn(),
        };

        const mockConfigService = {
            get: jest.fn(),
        };

        const mockCacheService = {
            get: jest.fn(),
            set: jest.fn(),
        };

        const mockMCPManagerService = {
            getMCPContext: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GitlabService,
                {
                    provide: INTEGRATION_SERVICE_TOKEN,
                    useValue: mockIntegrationService,
                },
                {
                    provide: INTEGRATION_CONFIG_SERVICE_TOKEN,
                    useValue: mockIntegrationConfigService,
                },
                {
                    provide: AUTH_INTEGRATION_SERVICE_TOKEN,
                    useValue: mockAuthIntegrationService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
                {
                    provide: CacheService,
                    useValue: mockCacheService,
                },
                {
                    provide: MCPManagerService,
                    useValue: mockMCPManagerService,
                },
            ],
        }).compile();

        service = module.get<GitlabService>(GitlabService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('deduplicação de arquivos em múltiplos commits', () => {
        it('deve retornar apenas a versão mais recente de cada arquivo quando o mesmo arquivo aparece em múltiplos commits', async () => {
            // Arrange: Configurar 3 commits com datas crescentes
            const commit1Date = '2024-01-01T11:00:00Z'; // Mais antigo
            const commit2Date = '2024-01-01T12:00:00Z'; // Meio
            const commit3Date = '2024-01-01T13:00:00Z'; // Mais recente

            // Mock dos commits retornados pela API (após o lastCommit)
            const mockCommits = [
                {
                    id: 'commit-1-sha',
                    created_at: commit1Date,
                },
                {
                    id: 'commit-2-sha',
                    created_at: commit2Date,
                },
                {
                    id: 'commit-3-sha',
                    created_at: commit3Date,
                },
            ];

            // Mock dos diffs de cada commit
            // Todos os 3 commits modificam os mesmos 3 arquivos (file1.ts, file2.ts, file3.ts)
            const commit1Diff = [
                {
                    new_path: 'file1.ts',
                    new_file: false,
                    deleted_file: false,
                    renamed_file: false,
                    diff: '@@ -1,5 +1,10 @@\n+line1\n+line2\n+line3\n+line4\n+line5\ncommit1 version',
                },
                {
                    new_path: 'file2.ts',
                    new_file: false,
                    deleted_file: false,
                    renamed_file: false,
                    diff: '@@ -1,10 +1,20 @@\n+line1\n+line2\ncommit1 version',
                },
                {
                    new_path: 'file3.ts',
                    new_file: true,
                    deleted_file: false,
                    renamed_file: false,
                    diff: '@@ -0,0 +1,30 @@\n+line1\n+line2\ncommit1 version',
                },
            ];

            const commit2Diff = [
                {
                    new_path: 'file1.ts',
                    new_file: false,
                    deleted_file: false,
                    renamed_file: false,
                    diff: '@@ -1,10 +1,15 @@\n+line1\n+line2\n+line3\ncommit2 version',
                },
                {
                    new_path: 'file2.ts',
                    new_file: false,
                    deleted_file: false,
                    renamed_file: false,
                    diff: '@@ -1,20 +1,25 @@\n+line1\n+line2\ncommit2 version',
                },
                {
                    new_path: 'file3.ts',
                    new_file: false,
                    deleted_file: false,
                    renamed_file: false,
                    diff: '@@ -1,30 +1,35 @@\n+line1\n+line2\ncommit2 version',
                },
            ];

            const commit3Diff = [
                {
                    new_path: 'file1.ts',
                    new_file: false,
                    deleted_file: false,
                    renamed_file: false,
                    diff: '@@ -1,15 +1,20 @@\n+line1\ncommit3 version (LATEST)',
                },
                {
                    new_path: 'file2.ts',
                    new_file: false,
                    deleted_file: false,
                    renamed_file: false,
                    diff: '@@ -1,25 +1,30 @@\n+line1\n+line2\n+line3\n+line4\n+line5\ncommit3 version (LATEST)',
                },
                {
                    new_path: 'file3.ts',
                    new_file: false,
                    deleted_file: false,
                    renamed_file: false,
                    diff: '@@ -1,35 +1,40 @@\n+line1\ncommit3 version (LATEST)',
                },
            ];

            // Mock do getAuthDetails
            jest.spyOn(service as any, 'getAuthDetails').mockResolvedValue({
                authIntegration: {},
            });

            // Mock do instanceGitlabApi
            jest.spyOn(service as any, 'instanceGitlabApi').mockReturnValue(
                mockGitlabAPI,
            );

            // Mock do countChanges (método privado usado no GitlabService)
            jest.spyOn(service as any, 'countChanges').mockImplementation(
                (diff: string) => {
                    const adds = (diff.match(/\n\+/g) || []).length;
                    const deletes = (diff.match(/\n-/g) || []).length;
                    return { adds, deletes };
                },
            );

            // Mock do mapGitlabStatus
            jest.spyOn(service as any, 'mapGitlabStatus').mockImplementation(
                (change: any) => {
                    if (change.new_file) return 'added';
                    if (change.deleted_file) return 'removed';
                    if (change.renamed_file) return 'renamed';
                    return 'modified';
                },
            );

            // Mock do allCommits para retornar os commits
            mockGitlabAPI.MergeRequests.allCommits.mockResolvedValue(
                mockCommits,
            );

            // Mock do showDiff para retornar os diffs de cada commit
            mockGitlabAPI.Commits.showDiff
                .mockResolvedValueOnce(commit1Diff)
                .mockResolvedValueOnce(commit2Diff)
                .mockResolvedValueOnce(commit3Diff);

            // Act: Executar o método
            const result = await service.getChangedFilesSinceLastCommit({
                organizationAndTeamData: mockOrganizationAndTeamData,
                repository: mockRepository,
                prNumber: 123,
                lastCommit: mockLastCommit,
            });

            // Assert: Verificar que retornou apenas 3 arquivos (sem duplicatas)
            expect(result).toHaveLength(3);

            // Verificar que cada arquivo tem a versão do commit3 (mais recente)
            const file1Result = result.find(
                (f: any) => f.filename === 'file1.ts',
            );
            expect(file1Result).toBeDefined();
            expect(file1Result.status).toBe('modified');
            expect(file1Result.patch).toContain('commit3 version (LATEST)');

            const file2Result = result.find(
                (f: any) => f.filename === 'file2.ts',
            );
            expect(file2Result).toBeDefined();
            expect(file2Result.status).toBe('modified');
            expect(file2Result.patch).toContain('commit3 version (LATEST)');

            const file3Result = result.find(
                (f: any) => f.filename === 'file3.ts',
            );
            expect(file3Result).toBeDefined();
            expect(file3Result.status).toBe('modified');
            expect(file3Result.patch).toContain('commit3 version (LATEST)');

            // Verificar que showDiff foi chamado 3 vezes (uma para cada commit)
            expect(mockGitlabAPI.Commits.showDiff).toHaveBeenCalledTimes(3);
        });

        it('deve filtrar apenas os commits mais recentes que o lastCommit', async () => {
            // Arrange: Commits antes e depois do lastCommit
            const lastCommitDate = '2024-01-01T12:00:00Z';
            const oldCommitDate = '2024-01-01T10:00:00Z'; // Antes do lastCommit
            const newCommitDate = '2024-01-01T14:00:00Z'; // Depois do lastCommit

            const mockCommits = [
                {
                    id: 'old-commit-sha',
                    created_at: oldCommitDate,
                },
                {
                    id: 'new-commit-sha',
                    created_at: newCommitDate,
                },
            ];

            const newCommitDiff = [
                {
                    new_path: 'new-file.ts',
                    new_file: true,
                    deleted_file: false,
                    renamed_file: false,
                    diff: '@@ -0,0 +1,10 @@\n+line1\n+line2\nnew file',
                },
            ];

            jest.spyOn(service as any, 'getAuthDetails').mockResolvedValue({
                authIntegration: {},
            });

            jest.spyOn(service as any, 'instanceGitlabApi').mockReturnValue(
                mockGitlabAPI,
            );

            jest.spyOn(service as any, 'countChanges').mockReturnValue({
                adds: 10,
                deletes: 0,
            });

            jest.spyOn(service as any, 'mapGitlabStatus').mockReturnValue(
                'added',
            );

            mockGitlabAPI.MergeRequests.allCommits.mockResolvedValue(
                mockCommits,
            );

            // Apenas o commit novo deve ser processado
            mockGitlabAPI.Commits.showDiff.mockResolvedValueOnce(
                newCommitDiff,
            );

            // Act
            const result = await service.getChangedFilesSinceLastCommit({
                organizationAndTeamData: mockOrganizationAndTeamData,
                repository: mockRepository,
                prNumber: 123,
                lastCommit: {
                    id: 'last-commit-sha',
                    created_at: lastCommitDate,
                },
            });

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].filename).toBe('new-file.ts');

            // Verificar que apenas 1 commit foi processado (não o commit antigo)
            expect(mockGitlabAPI.Commits.showDiff).toHaveBeenCalledTimes(1);
            expect(mockGitlabAPI.Commits.showDiff).toHaveBeenCalledWith(
                mockRepository.id,
                'new-commit-sha',
            );
        });

        it('deve retornar array vazio quando não houver novos commits', async () => {
            // Arrange: Todos os commits são mais antigos que o lastCommit
            const lastCommitDate = '2024-01-01T15:00:00Z';
            const oldCommitDate = '2024-01-01T10:00:00Z';

            const mockCommits = [
                {
                    id: 'old-commit-sha',
                    created_at: oldCommitDate,
                },
            ];

            jest.spyOn(service as any, 'getAuthDetails').mockResolvedValue({
                authIntegration: {},
            });

            jest.spyOn(service as any, 'instanceGitlabApi').mockReturnValue(
                mockGitlabAPI,
            );

            mockGitlabAPI.MergeRequests.allCommits.mockResolvedValue(
                mockCommits,
            );

            // Act
            const result = await service.getChangedFilesSinceLastCommit({
                organizationAndTeamData: mockOrganizationAndTeamData,
                repository: mockRepository,
                prNumber: 123,
                lastCommit: {
                    id: 'last-commit-sha',
                    created_at: lastCommitDate,
                },
            });

            // Assert
            expect(result).toHaveLength(0);
            expect(mockGitlabAPI.Commits.showDiff).not.toHaveBeenCalled();
        });

        it('deve lidar corretamente com arquivos adicionados, modificados e renomeados', async () => {
            // Arrange
            const commit1Date = '2024-01-01T11:00:00Z';

            const mockCommits = [
                {
                    id: 'commit-1-sha',
                    created_at: commit1Date,
                },
            ];

            const commitDiff = [
                {
                    new_path: 'added-file.ts',
                    new_file: true,
                    deleted_file: false,
                    renamed_file: false,
                    diff: '@@ -0,0 +1,10 @@\n+line1\n+line2',
                },
                {
                    new_path: 'modified-file.ts',
                    new_file: false,
                    deleted_file: false,
                    renamed_file: false,
                    diff: '@@ -1,5 +1,8 @@\n+line1\n-line2',
                },
                {
                    new_path: 'renamed-file-new.ts',
                    new_file: false,
                    deleted_file: false,
                    renamed_file: true,
                    diff: '@@ -0,0 +0,0 @@',
                },
            ];

            jest.spyOn(service as any, 'getAuthDetails').mockResolvedValue({
                authIntegration: {},
            });

            jest.spyOn(service as any, 'instanceGitlabApi').mockReturnValue(
                mockGitlabAPI,
            );

            jest.spyOn(service as any, 'countChanges').mockImplementation(
                (diff: string) => {
                    const adds = (diff.match(/\n\+/g) || []).length;
                    const deletes = (diff.match(/\n-/g) || []).length;
                    return { adds, deletes };
                },
            );

            jest.spyOn(service as any, 'mapGitlabStatus').mockImplementation(
                (change: any) => {
                    if (change.new_file) return 'added';
                    if (change.deleted_file) return 'removed';
                    if (change.renamed_file) return 'renamed';
                    return 'modified';
                },
            );

            mockGitlabAPI.MergeRequests.allCommits.mockResolvedValue(
                mockCommits,
            );

            mockGitlabAPI.Commits.showDiff.mockResolvedValueOnce(commitDiff);

            // Act
            const result = await service.getChangedFilesSinceLastCommit({
                organizationAndTeamData: mockOrganizationAndTeamData,
                repository: mockRepository,
                prNumber: 123,
                lastCommit: mockLastCommit,
            });

            // Assert
            expect(result).toHaveLength(3);

            const addedFile = result.find(
                (f: any) => f.filename === 'added-file.ts',
            );
            expect(addedFile.status).toBe('added');

            const modifiedFile = result.find(
                (f: any) => f.filename === 'modified-file.ts',
            );
            expect(modifiedFile.status).toBe('modified');

            const renamedFile = result.find(
                (f: any) => f.filename === 'renamed-file-new.ts',
            );
            expect(renamedFile.status).toBe('renamed');
        });
    });
});
