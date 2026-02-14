import type { ApiResponse } from '../types/api-types.js';

const API_KEY = process.env.DATA_GO_KR_API_KEY;

export interface ApiCallOptions {
  responseFormatKey?: string; // 'type' (G2B/MSS) or 'returnType' (K-Startup)
  serviceKeyName?: string;    // 'serviceKey' (default) or 'ServiceKey' (MSIT)
}

export async function callDataGoKrApi(
  baseUrl: string,
  operation: string,
  params: Record<string, string | number>,
  options?: ApiCallOptions
): Promise<ApiResponse> {
  if (!API_KEY) {
    throw new Error(
      'DATA_GO_KR_API_KEY 환경 변수가 설정되지 않았습니다. ' +
      'data.go.kr에서 API 키를 발급받아 설정하세요.'
    );
  }

  const formatKey = options?.responseFormatKey ?? 'type';
  const serviceKeyName = options?.serviceKeyName ?? 'serviceKey';

  const url = new URL(`${baseUrl}/${operation}`);
  url.searchParams.set(serviceKeyName, API_KEY);
  url.searchParams.set(formatKey, 'json');

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  // 공공데이터포털 표준 응답 구조 처리
  if (data.response) {
    const header = data.response.header;
    if (header?.resultCode !== '00') {
      throw new Error(`API Error [${header?.resultCode}]: ${header?.resultMsg}`);
    }
    return data.response.body;
  }

  // K-스타트업 등 비표준 응답 구조
  return data;
}
