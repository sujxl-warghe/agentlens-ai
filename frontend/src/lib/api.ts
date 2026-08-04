import type { ScanResponse, PullRequestResponse } from "@/types/scan";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // response wasn't JSON; keep statusText
    }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async createScanFromUrl(repoUrl: string, ownerId: string): Promise<ScanResponse> {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/scan?owner_id=${encodeURIComponent(ownerId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl }),
      },
    );
    return handleResponse<ScanResponse>(res);
  },

  async createScanFromDemo(demoId: string, ownerId: string): Promise<ScanResponse> {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/scan/demo?owner_id=${encodeURIComponent(ownerId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demo_id: demoId }),
      },
    );
    return handleResponse<ScanResponse>(res);
  },

  async createScanFromUpload(file: File, ownerId: string): Promise<ScanResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(
      `${API_BASE_URL}/api/v1/scan/upload?owner_id=${encodeURIComponent(ownerId)}`,
      { method: "POST", body: formData },
    );
    return handleResponse<ScanResponse>(res);
  },

  async getScan(scanId: string): Promise<ScanResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/scan/${scanId}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      return await handleResponse<ScanResponse>(res);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new ApiError(
          `Timed out reaching the backend at ${API_BASE_URL}. Is it running?`,
          0,
        );
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  },

  async listScans(ownerId: string): Promise<ScanResponse[]> {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/scans?owner_id=${encodeURIComponent(ownerId)}`,
      { cache: "no-store" },
    );
    return handleResponse<ScanResponse[]>(res);
  },

  async createPullRequest(
    scanId: string,
    acceptedItemIndices: number[],
    githubToken: string,
  ): Promise<PullRequestResponse> {
    const res = await fetch(`${API_BASE_URL}/api/v1/scan/${scanId}/pull-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accepted_item_indices: acceptedItemIndices,
        github_token: githubToken,
      }),
    });
    return handleResponse<PullRequestResponse>(res);
  },
};
