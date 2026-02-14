# 외부 API 레퍼런스

## 1. 공공데이터포털 (data.go.kr) 기반 API

### 공통 사항

| 항목 | 값 |
|------|-----|
| 인증 방식 | Query Parameter `serviceKey` |
| API 키 발급 | [data.go.kr](https://data.go.kr) 회원가입 → 활용신청 → 키 발급 |
| 트래픽 제한 | 개발계정 10,000건/월 (운영계정 신청 시 상향) |
| 응답 형식 | JSON / XML (`type` 또는 `returnType` 파라미터) |

> 하나의 API 키로 나라장터, K-스타트업, 중소벤처기업부, 과기부 API를 모두 사용 가능

---

## 2. 나라장터 API

### 2.1 입찰공고정보서비스

| 항목 | 값 |
|------|-----|
| 공공데이터포털 ID | 15129394 |
| Base URL | `https://apis.data.go.kr/1230000/ad/BidPublicInfoService` |

**오퍼레이션 (주요):**

| 오퍼레이션 | 설명 |
|-----------|------|
| `getBidPblancListInfoServc` | 용역 입찰공고 목록 |
| `getBidPblancListInfoThng` | 물품 입찰공고 목록 |
| `getBidPblancListInfoCnstwk` | 공사 입찰공고 목록 |
| `getBidPblancListInfoFrgcpt` | 외자 입찰공고 목록 |

**요청 파라미터:**

| 파라미터 | 필수 | 타입 | 설명 |
|---------|------|------|------|
| `serviceKey` | Y | string | 공공데이터포털 인증키 |
| `pageNo` | Y | number | 페이지 번호 |
| `numOfRows` | Y | number | 한 페이지 결과 수 (최대 999) |
| `inqryDiv` | Y | number | 조회구분 (1: 공고일시, 2: 개찰일시) |
| `inqryBgnDt` | N | string | 조회시작일시 (yyyyMMddHHmm) |
| `inqryEndDt` | N | string | 조회종료일시 (yyyyMMddHHmm) |
| `bidNtceNo` | N | string | 입찰공고번호 |
| `bidNtceNm` | N | string | 입찰공고명 (키워드 검색) |
| `ntceInsttNm` | N | string | 공고기관명 |
| `dminsttNm` | N | string | 수요기관명 |
| `presmptPrceBgn` | N | number | 추정가격 시작 |
| `presmptPrceEnd` | N | number | 추정가격 종료 |
| `type` | N | string | 응답형식 (json/xml) |

**응답 주요 필드:**

| 필드 | 설명 |
|------|------|
| `bidNtceNo` | 입찰공고번호 |
| `bidNtceNm` | 입찰공고명 |
| `ntceInsttNm` | 공고기관명 |
| `dminsttNm` | 수요기관명 |
| `presmptPrce` | 추정가격 |
| `bidClseDt` | 입찰마감일시 |
| `opengDt` | 개찰일시 |
| `bidNtceUrl` | 입찰공고 상세 URL |
| `ntceSpecDocUrl1~5` | 공고규격서 파일 URL (최대 5개) |

**호출 예시:**

```
GET https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoServc
    ?serviceKey={key}
    &pageNo=1
    &numOfRows=20
    &inqryDiv=1
    &inqryBgnDt=202601150000
    &inqryEndDt=202602142359
    &bidNtceNm=AI
    &type=json
```

---

### 2.2 사전규격정보서비스

| 항목 | 값 |
|------|-----|
| 공공데이터포털 ID | 15129437 |
| Base URL | `https://apis.data.go.kr/1230000/ao/HrcspSsstndrdInfoService` |

**오퍼레이션:**

| 오퍼레이션 | 설명 |
|-----------|------|
| `getPublicPrcureThngInfoServc` | 사전규격 용역 목록 |
| `getPublicPrcureThngInfoThng` | 사전규격 물품 목록 |
| `getPublicPrcureThngInfoCnstwk` | 사전규격 공사 목록 |

**추가 파라미터:**

| 파라미터 | 설명 |
|---------|------|
| `prdctClsfcNoNm` | 품명/사업명 (키워드) |
| `orderInsttNm` | 발주기관명 |
| `rlDminsttNm` | 실수요기관명 |
| `bfSpecRgstNo` | 사전규격등록번호 |

**응답 주요 필드:**

| 필드 | 설명 |
|------|------|
| `bfSpecRgstNo` | 사전규격등록번호 |
| `prdctClsfcNoNm` | 품명(사업명) |
| `asignBdgtAmt` | 배정예산금액 |
| `orderInsttNm` | 발주기관명 |
| `specDocFileUrl1~5` | 규격문서 파일 URL |

---

### 2.3 낙찰정보서비스

| 항목 | 값 |
|------|-----|
| 공공데이터포털 ID | 15129397 |
| Base URL | `https://apis.data.go.kr/1230000/as/ScsbidInfoService` |

**오퍼레이션:**

| 오퍼레이션 | 설명 |
|-----------|------|
| `getScsbidListSttusServc` | 용역 낙찰 목록 |
| `getScsbidListSttusThng` | 물품 낙찰 목록 |
| `getScsbidListSttusCnstwk` | 공사 낙찰 목록 |
| `getOpengResultListInfoServc` | 용역 개찰결과 목록 |

**응답 주요 필드:**

| 필드 | 설명 |
|------|------|
| `bidwinnrNm` | 낙찰업체명 |
| `sucsfbidAmt` | 낙찰금액 |
| `sucsfbidRate` | 낙찰률 |
| `prtcptCnum` | 참가업체수 |

---

### 2.4 계약과정통합공개서비스

| 항목 | 값 |
|------|-----|
| 공공데이터포털 ID | 15129459 |
| Base URL | `https://apis.data.go.kr/1230000/ao/CntrctProcssIntgOpenService` |

사전규격 → 입찰공고 → 낙찰 → 계약의 전체 프로세스를 통합 조회.

---

## 3. K-스타트업 API

| 항목 | 값 |
|------|-----|
| 공공데이터포털 ID | 15125364 |
| Base URL | `https://apis.data.go.kr/B552735/kisedKstartupService01` |

**오퍼레이션:**

| 오퍼레이션 | 설명 |
|-----------|------|
| `getAnnouncementInformation01` | 지원사업 공고 정보 |
| `getBusinessInformation01` | 통합공고 지원사업 정보 |

**요청 파라미터:**

| 파라미터 | 필수 | 설명 |
|---------|------|------|
| `serviceKey` | Y | 인증키 |
| `page` | N | 페이지 (기본: 1) |
| `perPage` | N | 페이지당 결과 수 (기본: 10) |
| `returnType` | N | json/xml (기본: xml) |

**공고 정보 응답 필드:**

| 필드 | 설명 |
|------|------|
| `pbanc_sn` | 공고일련번호 |
| `biz_pbanc_nm` | 사업공고명 |
| `pbanc_ctnt` | 공고내용 |
| `supt_biz_clsfc` | 지원사업분류 |
| `pbanc_rcpt_bgng_dt` | 접수시작일 |
| `pbanc_rcpt_end_dt` | 접수종료일 |
| `aply_trgt` | 신청대상 |
| `supt_regin` | 지원지역 |
| `rcrt_prgs_yn` | 모집진행여부 (Y/N) |

---

## 4. 중소벤처기업부 사업공고 API

| 항목 | 값 |
|------|-----|
| 공공데이터포털 ID | 15113297 |
| Base URL | `https://apis.data.go.kr/1421000/mssBizService_v2` |
| 오퍼레이션 | `getbizList_v2` |
| 트래픽 제한 | 100건/일 |

**요청 파라미터:**

| 파라미터 | 필수 | 설명 |
|---------|------|------|
| `serviceKey` | Y | 인증키 |
| `pageNo` | Y | 페이지 번호 |
| `numOfRows` | Y | 페이지당 결과 수 |
| `startDate` | N | 공고등록일 검색시작 (YYYY-MM-DD) |
| `endDate` | N | 공고등록일 검색종료 (YYYY-MM-DD) |

**응답 필드:**

| 필드 | 설명 |
|------|------|
| `title` | 공고 제목 |
| `dataContents` | 공고 내용 |
| `viewUrl` | 상세페이지 URL |
| `fileName` | 첨부파일명 |
| `fileUrl` | 첨부파일 다운로드 URL |
| `applicationStartDate` | 신청시작일 |
| `applicationEndDate` | 신청종료일 |

---

## 5. 과학기술정보통신부 사업공고 API

| 항목 | 값 |
|------|-----|
| 공공데이터포털 ID | 15074634 |
| Base URL | `https://apis.data.go.kr/1721000/msitannouncementinfo` |
| 오퍼레이션 | `businessAnnouncMentList` |

**요청 파라미터:**

| 파라미터 | 필수 | 설명 |
|---------|------|------|
| `ServiceKey` | Y | 인증키 (대문자 S 주의) |
| `pageNo` | Y | 페이지 번호 |
| `numOfRows` | Y | 페이지당 결과 수 |
| `returnType` | N | json/xml |

**응답 필드:**

| 필드 | 설명 |
|------|------|
| `subject` | 공고 제목 |
| `viewUrl` | 상세페이지 URL |
| `deptName` | 담당부서명 |
| `pressDt` | 게시일 |
| `fileName` | 첨부파일명 |
| `fileUrl` | 첨부파일 다운로드 URL |

---

## 6. 기업마당 API

| 항목 | 값 |
|------|-----|
| 제공기관 | 중소벤처기업부 기업마당 |
| API URL | `https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do` |
| API 키 발급 | [bizinfo.go.kr/apiList.do](https://www.bizinfo.go.kr/apiList.do) |

지원사업정보 API와 행사정보 API 2종을 제공한다.

---

## 7. NTIS API

| 항목 | 값 |
|------|-----|
| 포털 | [ntis.go.kr/rndopen/api/mng/apiMain.do](https://www.ntis.go.kr/rndopen/api/mng/apiMain.do) |
| API 키 발급 | NTIS 포털에서 별도 활용 신청 |

국가R&D 과제검색, 성과검색, 연구보고서 검색 등 14개 API를 제공한다.

---

## 8. API 키 설정 가이드

### 필수: 공공데이터포털 API 키

1. [data.go.kr](https://data.go.kr) 회원가입
2. 다음 API 활용 신청:
   - 조달청_나라장터 입찰공고정보서비스
   - 조달청_나라장터 사전규격정보서비스
   - 조달청_나라장터 낙찰정보서비스
   - 조달청_나라장터 계약과정통합공개서비스
   - 창업진흥원_K-Startup 조회서비스
   - 중소벤처기업부_사업공고
   - 과학기술정보통신부_사업공고
3. 발급된 인코딩 키를 환경 변수에 설정:
   ```bash
   export DATA_GO_KR_API_KEY="your_encoded_key_here"
   ```

### 선택: 기업마당 API 키

1. [bizinfo.go.kr](https://www.bizinfo.go.kr) 접속
2. API 활용 신청
3. 환경 변수 설정:
   ```bash
   export BIZINFO_API_KEY="your_key_here"
   ```

### 선택: NTIS API 키

1. [ntis.go.kr](https://www.ntis.go.kr) 접속
2. OpenAPI 활용 신청
3. 환경 변수 설정:
   ```bash
   export NTIS_API_KEY="your_key_here"
   ```
