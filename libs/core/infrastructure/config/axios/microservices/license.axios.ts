import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export class AxiosLicenseService {
    private readonly axiosInstance: AxiosInstance;

    constructor() {
        const baseUrl = AxiosLicenseService.normalizeBaseUrl(
            process.env.GLOBAL_KODUS_SERVICE_BILLING,
        );
        this.axiosInstance = axios.create({
            baseURL: baseUrl ? `${baseUrl}/api/billing/` : undefined,
            headers: {
                'Content-Type': 'application/json',
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

    public async post(
        url: string,
        body: Record<string, unknown> = {},
        config: AxiosRequestConfig = {},
    ): Promise<any> {
        try {
            const { data } = await this.axiosInstance.post(url, body, config);
            return data;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }
}
