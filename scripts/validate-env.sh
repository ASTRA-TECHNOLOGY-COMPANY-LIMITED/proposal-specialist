#!/bin/bash
# validate-env.sh
# SessionStart 훅: API 키 환경 변수 설정 여부를 검증한다.
# 비블로킹(exit 0) — 경고만 제공하고 세션 시작을 중단하지 않는다.

WARNINGS=""

# 필수: 공공데이터포털 API 키
if [ -z "$DATA_GO_KR_API_KEY" ]; then
  WARNINGS="${WARNINGS}[필수] DATA_GO_KR_API_KEY가 설정되지 않았습니다. 나라장터/K-스타트업 등 API를 사용하려면 data.go.kr에서 API 키를 발급받아 환경 변수를 설정하세요.\n"
fi

# 선택: 기업 자료 디렉토리
if [ -z "$COMPANY_DOCS_DIR" ]; then
  WARNINGS="${WARNINGS}[선택] COMPANY_DOCS_DIR가 설정되지 않았습니다. 기업 자료 디렉토리를 지정하면 명령어 실행 시 경로를 생략할 수 있습니다.\n"
elif [ ! -d "$COMPANY_DOCS_DIR" ]; then
  WARNINGS="${WARNINGS}[경고] COMPANY_DOCS_DIR(${COMPANY_DOCS_DIR})가 존재하지 않는 디렉토리입니다.\n"
fi

# 선택: 기업마당 API 키
if [ -z "$BIZINFO_API_KEY" ]; then
  WARNINGS="${WARNINGS}[선택] BIZINFO_API_KEY가 설정되지 않았습니다. 기업마당 API를 사용하려면 bizinfo.go.kr에서 API 키를 발급받으세요.\n"
fi

# 선택: NTIS API 키
if [ -z "$NTIS_API_KEY" ]; then
  WARNINGS="${WARNINGS}[선택] NTIS_API_KEY가 설정되지 않았습니다. NTIS R&D 과제 검색을 사용하려면 ntis.go.kr에서 API 키를 발급받으세요.\n"
fi

if [ -n "$WARNINGS" ]; then
  echo -e "[proposal-specialist] 환경 변수 검증 결과:"
  echo -e "$WARNINGS"
fi

exit 0
