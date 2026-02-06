# Cloudflare Pages 배포 가이드

## 📦 프로젝트 구조
```
d:\etc\
├── index.html              # 메인 HTML
├── style.css               # 스타일시트
├── app.js                  # 클라이언트 로직
└── functions/
    └── api/
        └── data.js         # Cloudflare Pages Function (서버리스 API)
```

## 🚀 배포 방법

### 1. Cloudflare Pages 프로젝트 생성
1. [Cloudflare Dashboard](https://dash.cloudflare.com) 접속
2. **Pages** → **Create a project** 클릭
3. Git 연동 또는 **Direct Upload** 선택

### 2. KV Namespace 생성 (데이터 저장소)
1. **Workers & Pages** → **KV** 메뉴로 이동
2. **Create a namespace** 클릭
3. 이름: `MEAL_DATA` (정확히 이 이름으로 생성)

### 3. KV 바인딩 설정
1. Pages 프로젝트 → **Settings** → **Functions** 탭
2. **KV namespace bindings** 섹션에서 **Add binding** 클릭
3. Variable name: `MEAL_DATA`
4. KV namespace: 방금 만든 `MEAL_DATA` 선택
5. **Save** 클릭

### 4. 배포
#### Git 연동 방식 (권장)
```bash
cd d:\etc
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```
Cloudflare Pages에서 자동으로 감지하여 배포됩니다.

#### Direct Upload 방식
1. `d:\etc` 폴더 전체를 ZIP으로 압축
2. Cloudflare Pages → **Upload assets** 에서 업로드

### 5. 배포 완료!
배포가 완료되면 `https://your-project.pages.dev` 형태의 URL이 생성됩니다.

## 🔧 로컬 테스트 (선택사항)
Cloudflare의 Wrangler를 사용하여 로컬에서 테스트할 수 있습니다:
```bash
npm install -g wrangler
cd d:\etc
wrangler pages dev .
```

## 📝 주의사항
- KV 바인딩 이름은 반드시 `MEAL_DATA`여야 합니다 (코드에서 `env.MEAL_DATA`로 참조)
- 무료 플랜에서도 충분히 사용 가능합니다
- 데이터는 Cloudflare KV에 영구 저장되며, 브라우저 localStorage에도 백업됩니다
