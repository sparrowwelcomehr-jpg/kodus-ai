import axios, { AxiosInstance } from 'axios';

export class AxiosAzureReposService {
    private axiosInstance: AxiosInstance;

    constructor({ tenantId = '', organization = '' }) {
        const baseUrl = AxiosAzureReposService.normalizeBaseUrl(
            process.env.KODUS_SERVICE_AZURE_REPOS,
        );
        this.axiosInstance = axios.create({
            baseURL: baseUrl,
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': tenantId,
                'x-organization': organization,
            },
        });
    }

    private static normalizeBaseUrl(baseUrl?: string): string | undefined {
        if (!baseUrl) {
            return undefined;
        }

        if (/^https?:\/\//i.test(baseUrl)) {
            return baseUrl;
        }

        const scheme = /:443(\/|$)/.test(baseUrl) ? 'https://' : 'http://';
        return `${scheme}${baseUrl}`;
    }

    // Methods for encapsulating axios calls
    public async get(url: string, config = {}) {
        try {
            const { data } = await this.axiosInstance.get(url, config);
            return data;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    public async post(url: string, body = {}, config = {}) {
        try {
            const { data } = await this.axiosInstance.post(url, body, config);
            return data;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }
}
