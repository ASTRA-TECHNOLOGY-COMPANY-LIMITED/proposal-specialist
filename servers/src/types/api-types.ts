export interface ApiResponse {
  totalCount: number;
  numOfRows: number;
  pageNo: number;
  items: any[];
  [key: string]: any;
}

export interface BidItem {
  bidNtceNo: string;
  bidNtceNm: string;
  ntceInsttNm: string;
  dminsttNm: string;
  presmptPrce: number;
  bidClseDt: string;
  bidNtceUrl: string;
  ntceSpecDocUrl1?: string;
  ntceSpecDocUrl2?: string;
  ntceSpecDocUrl3?: string;
  ntceSpecDocUrl4?: string;
  ntceSpecDocUrl5?: string;
}

export interface DownloadResult {
  filePath: string;
  filename: string;
  fileSize: number;
  fileSizeHuman: string;
  mimeType: string;
}
