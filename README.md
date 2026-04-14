# AI Looki

현재 폴더명으로 시작한 GitHub Pages용 정적 페이지입니다.

## 빠른 배포

```powershell
gh auth login
.\publish-github.ps1
```

기본 저장소 이름은 폴더명을 기준으로 만들되, 공백은 `-`로 바꿉니다.

예: `AI Looki` -> `AI-Looki`

원하면 직접 이름을 지정할 수도 있습니다.

```powershell
.\publish-github.ps1 -RepoName "AI-Looki"
```
