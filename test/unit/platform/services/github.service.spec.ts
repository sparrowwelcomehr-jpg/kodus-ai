import { Test, TestingModule } from '@nestjs/testing';
import { GithubService } from '@libs/platform/infrastructure/adapters/services/github/github.service';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '@libs/core/cache/cache.service';
import { MCPManagerService } from '@libs/mcp-server/services/mcp-manager.service';
import { INTEGRATION_SERVICE_TOKEN } from '@libs/integrations/domain/integrations/contracts/integration.service.contracts';
import { AUTH_INTEGRATION_SERVICE_TOKEN } from '@libs/integrations/domain/authIntegrations/contracts/auth-integration.service.contracts';
import { INTEGRATION_CONFIG_SERVICE_TOKEN } from '@libs/integrations/domain/integrationConfigs/contracts/integration-config.service.contracts';

describe('GithubService - getChangedFilesSinceLastCommit', () => {
    let service: GithubService;
    let mockOctokit: any;

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
        id: 'repo-789',
        name: 'test-repo',
    };

    const mockLastCommit = {
        sha: 'old-commit-sha',
        created_at: '2024-01-01T10:00:00Z',
    };

    beforeEach(async () => {
        // Mock do Octokit com suporte a paginate
        mockOctokit = {
            paginate: jest.fn(),
            pulls: {
                listCommits: jest.fn(),
            },
            repos: {
                getCommit: jest.fn(),
            },
        };

        const mockIntegrationService = {
            findOne: jest.fn(),
        };

        const mockAuthIntegrationService = {
            findByIntegrationConfig: jest.fn(),
        };

        const mockIntegrationConfigService = {
            findOne: jest.fn(),
        };

        const mockCacheService = {
            get: jest.fn(),
            set: jest.fn(),
        };

        const mockConfigService = {
            get: jest.fn(),
        };

        const mockMCPManagerService = {
            getMCPContext: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GithubService,
                {
                    provide: INTEGRATION_SERVICE_TOKEN,
                    useValue: mockIntegrationService,
                },
                {
                    provide: AUTH_INTEGRATION_SERVICE_TOKEN,
                    useValue: mockAuthIntegrationService,
                },
                {
                    provide: INTEGRATION_CONFIG_SERVICE_TOKEN,
                    useValue: mockIntegrationConfigService,
                },
                {
                    provide: CacheService,
                    useValue: mockCacheService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
                {
                    provide: MCPManagerService,
                    useValue: mockMCPManagerService,
                },
            ],
        }).compile();

        service = module.get<GithubService>(GithubService);
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
                    sha: 'commit-1-sha',
                    commit: {
                        author: {
                            date: commit1Date,
                        },
                    },
                },
                {
                    sha: 'commit-2-sha',
                    commit: {
                        author: {
                            date: commit2Date,
                        },
                    },
                },
                {
                    sha: 'commit-3-sha',
                    commit: {
                        author: {
                            date: commit3Date,
                        },
                    },
                },
            ];

            // Mock dos arquivos em cada commit
            // Todos os 3 commits modificam os mesmos 3 arquivos (file1.ts, file2.ts, file3.ts)
            const commit1Files = [
                {
                    filename: 'file1.ts',
                    status: 'modified',
                    additions: 10,
                    deletions: 5,
                    changes: 15,
                    patch: '@@ -1,5 +1,10 @@ commit1 version',
                },
                {
                    filename: 'file2.ts',
                    status: 'modified',
                    additions: 20,
                    deletions: 10,
                    changes: 30,
                    patch: '@@ -1,10 +1,20 @@ commit1 version',
                },
                {
                    filename: 'file3.ts',
                    status: 'added',
                    additions: 30,
                    deletions: 0,
                    changes: 30,
                    patch: '@@ -0,0 +1,30 @@ commit1 version',
                },
            ];

            const commit2Files = [
                {
                    filename: 'file1.ts',
                    status: 'modified',
                    additions: 15,
                    deletions: 3,
                    changes: 18,
                    patch: '@@ -1,10 +1,15 @@ commit2 version',
                },
                {
                    filename: 'file2.ts',
                    status: 'modified',
                    additions: 25,
                    deletions: 8,
                    changes: 33,
                    patch: '@@ -1,20 +1,25 @@ commit2 version',
                },
                {
                    filename: 'file3.ts',
                    status: 'modified',
                    additions: 35,
                    deletions: 2,
                    changes: 37,
                    patch: '@@ -1,30 +1,35 @@ commit2 version',
                },
            ];

            const commit3Files = [
                {
                    filename: 'file1.ts',
                    status: 'modified',
                    additions: 20,
                    deletions: 1,
                    changes: 21,
                    patch: '@@ -1,15 +1,20 @@ commit3 version (LATEST)',
                },
                {
                    filename: 'file2.ts',
                    status: 'modified',
                    additions: 30,
                    deletions: 5,
                    changes: 35,
                    patch: '@@ -1,25 +1,30 @@ commit3 version (LATEST)',
                },
                {
                    filename: 'file3.ts',
                    status: 'modified',
                    additions: 40,
                    deletions: 1,
                    changes: 41,
                    patch: '@@ -1,35 +1,40 @@ commit3 version (LATEST)',
                },
            ];

            // Mock do getGithubAuthDetails
            jest.spyOn(service as any, 'getGithubAuthDetails').mockResolvedValue({
                org: 'test-org',
                authIntegration: {},
            });

            // Mock do instanceOctokit
            jest.spyOn(service as any, 'instanceOctokit').mockResolvedValue(
                mockOctokit,
            );

            // Mock do paginate para retornar os commits
            mockOctokit.paginate.mockResolvedValue(mockCommits);

            // Mock do getCommit para retornar os arquivos de cada commit
            mockOctokit.repos.getCommit
                .mockResolvedValueOnce({
                    data: { files: commit1Files },
                })
                .mockResolvedValueOnce({
                    data: { files: commit2Files },
                })
                .mockResolvedValueOnce({
                    data: { files: commit3Files },
                });

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
            expect(file1Result.additions).toBe(20); // Valores do commit3
            expect(file1Result.deletions).toBe(1);
            expect(file1Result.changes).toBe(21);
            expect(file1Result.patch).toContain('commit3 version (LATEST)');

            const file2Result = result.find(
                (f: any) => f.filename === 'file2.ts',
            );
            expect(file2Result).toBeDefined();
            expect(file2Result.additions).toBe(30); // Valores do commit3
            expect(file2Result.deletions).toBe(5);
            expect(file2Result.changes).toBe(35);
            expect(file2Result.patch).toContain('commit3 version (LATEST)');

            const file3Result = result.find(
                (f: any) => f.filename === 'file3.ts',
            );
            expect(file3Result).toBeDefined();
            expect(file3Result.additions).toBe(40); // Valores do commit3
            expect(file3Result.deletions).toBe(1);
            expect(file3Result.changes).toBe(41);
            expect(file3Result.patch).toContain('commit3 version (LATEST)');
        });

        it('deve filtrar apenas os commits mais recentes que o lastCommit', async () => {
            // Arrange: Commits antes e depois do lastCommit
            const lastCommitDate = '2024-01-01T12:00:00Z';
            const oldCommitDate = '2024-01-01T10:00:00Z'; // Antes do lastCommit
            const newCommitDate = '2024-01-01T14:00:00Z'; // Depois do lastCommit

            const mockCommits = [
                {
                    sha: 'old-commit-sha',
                    commit: {
                        author: {
                            date: oldCommitDate,
                        },
                    },
                },
                {
                    sha: 'new-commit-sha',
                    commit: {
                        author: {
                            date: newCommitDate,
                        },
                    },
                },
            ];

            const newCommitFiles = [
                {
                    filename: 'new-file.ts',
                    status: 'added',
                    additions: 10,
                    deletions: 0,
                    changes: 10,
                    patch: '@@ -0,0 +1,10 @@ new file',
                },
            ];

            jest.spyOn(service as any, 'getGithubAuthDetails').mockResolvedValue({
                org: 'test-org',
                authIntegration: {},
            });

            jest.spyOn(service as any, 'instanceOctokit').mockResolvedValue(
                mockOctokit,
            );

            mockOctokit.paginate.mockResolvedValue(mockCommits);

            // Apenas o commit novo deve ser processado
            mockOctokit.repos.getCommit.mockResolvedValueOnce({
                data: { files: newCommitFiles },
            });

            // Act
            const result = await service.getChangedFilesSinceLastCommit({
                organizationAndTeamData: mockOrganizationAndTeamData,
                repository: mockRepository,
                prNumber: 123,
                lastCommit: {
                    sha: 'last-commit-sha',
                    created_at: lastCommitDate,
                },
            });

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].filename).toBe('new-file.ts');

            // Verificar que apenas 1 commit foi processado (não o commit antigo)
            expect(mockOctokit.repos.getCommit).toHaveBeenCalledTimes(1);
            expect(mockOctokit.repos.getCommit).toHaveBeenCalledWith({
                owner: 'test-org',
                repo: 'test-repo',
                ref: 'new-commit-sha',
            });
        });

        it('deve retornar array vazio quando não houver novos commits', async () => {
            // Arrange: Todos os commits são mais antigos que o lastCommit
            const lastCommitDate = '2024-01-01T15:00:00Z';
            const oldCommitDate = '2024-01-01T10:00:00Z';

            const mockCommits = [
                {
                    sha: 'old-commit-sha',
                    commit: {
                        author: {
                            date: oldCommitDate,
                        },
                    },
                },
            ];

            jest.spyOn(service as any, 'getGithubAuthDetails').mockResolvedValue({
                org: 'test-org',
                authIntegration: {},
            });

            jest.spyOn(service as any, 'instanceOctokit').mockResolvedValue(
                mockOctokit,
            );

            mockOctokit.paginate.mockResolvedValue(mockCommits);

            // Act
            const result = await service.getChangedFilesSinceLastCommit({
                organizationAndTeamData: mockOrganizationAndTeamData,
                repository: mockRepository,
                prNumber: 123,
                lastCommit: {
                    sha: 'last-commit-sha',
                    created_at: lastCommitDate,
                },
            });

            // Assert
            expect(result).toHaveLength(0);
            expect(mockOctokit.repos.getCommit).not.toHaveBeenCalled();
        });

        it('deve lidar corretamente com commits que não possuem arquivos', async () => {
            // Arrange
            const commit1Date = '2024-01-01T11:00:00Z';

            const mockCommits = [
                {
                    sha: 'commit-1-sha',
                    commit: {
                        author: {
                            date: commit1Date,
                        },
                    },
                },
            ];

            jest.spyOn(service as any, 'getGithubAuthDetails').mockResolvedValue({
                org: 'test-org',
                authIntegration: {},
            });

            jest.spyOn(service as any, 'instanceOctokit').mockResolvedValue(
                mockOctokit,
            );

            mockOctokit.paginate.mockResolvedValue(mockCommits);

            // Commit sem arquivos
            mockOctokit.repos.getCommit.mockResolvedValueOnce({
                data: { files: undefined },
            });

            // Act
            const result = await service.getChangedFilesSinceLastCommit({
                organizationAndTeamData: mockOrganizationAndTeamData,
                repository: mockRepository,
                prNumber: 123,
                lastCommit: mockLastCommit,
            });

            // Assert
            expect(result).toHaveLength(0);
        });
    });
});
