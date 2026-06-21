# BlueBird

> 불안할 때 내린 결정이 맞았는지 *결과로 확인하는* 의사결정 도구 (심리적 캘리브레이션 PWA)
> A decision-making tool that lets you seal a prediction and check it against reality — built to calibrate the judgments anxiety distorts.

**🔗 라이브 데모: https://bluebird-mvp.vercel.app**
**만든 사람: haesol** · 1인 사이드 프로젝트 (기획·디자인·풀스택 개발)

---

## 한눈에

BlueBird는 "그만둘까·말할까·정리할까" 같은 결정을 기록할 때 **얼마나 확신하는지와 검토 기한을 함께 봉인**해 두었다가, 나중에 **실제 결과와 맞춰 보며 내 예측의 정확도를 쌓아가는** 도구입니다. 인지행동치료·전망이론·예측 검증(캘리브레이션) 연구에 근거를 두고, 결정을 흔드는 인지 왜곡(생각 습관)을 결정 흐름 안에서 함께 짚어줍니다.

조언하지 않습니다 — **거울처럼 비춰주고 판단은 사용자가** 합니다.

## 주요 기능

- **결정 기록 + 예측 봉인** — 결정·고려한 선택지·예상 결과·확신도(0~100)·검토 기한을 기록.
- **두 갈래 분기 (Tame / Wild)** — 되돌릴 수 있는 결정은 결과로 *맞춰 보고*(캘리브레이션), 되돌릴 수 없는 큰 결정은 일부러 *점수를 매기지 않고* 가치·후회·수용을 짚습니다(false-precision 방지).
- **복기 → 캘리브레이션** — 검토 기한이 되면 예측과 실제를 나란히 대조. "내가 80%라 확신한 일이 실제로는 몇 %였나"를 데이터로.
- **인지 왜곡 점검(임베드)** — 결정을 적는 순간, 그 판단을 부풀리는 생각 습관을 함께 점검.
- **인사이트** — *결정 패턴*(예측 정확도)과 *생각 패턴*(왜곡 분포·강도·추이)을 한 화면 두 탭으로.
- **모닝·이브닝 체크인** — 가벼운 기분·성찰 기록 + 추이 차트.
- **안전 가드** — 위기 신호 감지(Crisis Detection)와 위기 상담 자원 안내.
- **PWA** — 홈 화면 설치, 오프라인 폴백, 웹 푸시 복기 리마인더, **다크모드**(시스템 연동 + 수동).

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| Frontend | **Next.js 16 (App Router)** · React · TypeScript |
| Styling | **Tailwind CSS** (CSS 변수 토큰 디자인 시스템, 다크모드) · Pretendard |
| Backend | **Supabase** — PostgreSQL · Row Level Security · Auth |
| AI 분석 | **Google Gemini** (JSON mode) |
| 데이터 시각화 | Recharts |
| PWA / 알림 | Serwist 워커 · Web Push (VAPID) |
| 배포 | **Vercel** (CI 자동 배포) |
| 테스트 | Vitest |

## 엔지니어링 하이라이트

- **RLS 우선 보안** — 모든 사용자 데이터는 Row Level Security로 격리. `service_role` 사용 경로를 명시적으로 최소화·인벤토리.
- **토큰 기반 디자인 시스템** — 색을 CSS 변수 토큰으로 추상화해, 호출부 변경 없이 브랜드 색 교체·다크모드 전환(`.dark` 클래스 플립).
- **회귀 보호** — 300+ 단위 테스트 + 커스텀 **카피 톤 린터**(브랜드 보이스·금지 표현 자동 검사) + 타입 게이트.
- **안전 설계** — 결정/생각 입력 시점 위기 감지, 프롬프트 인젝션 방어, 안전 응답 우선(fail-safe).
- **단일 진실 공급원 헬퍼** — 트랙(Tame/Wild)별로 다른 복기 완료 판정을 한 곳(`lib/decision/review-status.ts`)에 캡슐화해 화면 간 불일치 방지.
- **무가입 데모 퍼널** — 가입 없이 결정 루프를 체험하는 `/sample` (실제 엔진 로직으로 렌더).

## 프로젝트 구조

```
app/              # Next.js App Router — 화면·API 라우트
components/        # UI·차트·안전·알림 컴포넌트
lib/              # 도메인 로직 (decision·safety·analytics·theme·ai)
supabase/         # 마이그레이션 (스키마·RLS·RPC)
scripts/          # 운영 스크립트 (RLS 감사·카피 톤 린터)
tests/            # Vitest 회귀 테스트
worker/           # PWA 서비스 워커
```

## 라이선스 · 고지

- 사용한 오픈소스 라이선스: [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) (폰트 Pretendard는 SIL Open Font License).
- 본 저장소는 BlueBird의 **공개 코드 버전**으로, 일부 핵심 로직·AI 프롬프트·연구 데이터는 비공개 처리되어 있습니다. 제품 자체의 권리는 제작자(haesol)에게 있으며, 무단 복제·재배포·상업적 이용을 허용하지 않습니다.

---

*BlueBird는 의료·진단·치료 서비스가 아니며, 정신건강 위기 시 전문기관(자살예방상담전화 1393) 이용을 안내합니다.*
