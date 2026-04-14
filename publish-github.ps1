param(
  [string]$RepoName
)

$ErrorActionPreference = "Stop"

$displayName = Split-Path -Leaf (Get-Location)

if (-not $RepoName) {
  $RepoName = $displayName -replace "\s+", "-"
  $RepoName = $RepoName -replace "[^A-Za-z0-9._-]", ""
}

if (-not $RepoName) {
  throw "Repository name could not be derived from the current folder."
}

gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
  throw "GitHub login is required. Run 'gh auth login' first."
}

$owner = (gh api user -q .login).Trim()
$displayLogin = (gh api user -q .login).Trim()
$displayName = (gh api user -q .name).Trim()
$publicEmail = (gh api user -q .email).Trim()
$userId = (gh api user -q .id).Trim()

if (-not $displayName) {
  $displayName = $displayLogin
}

if (-not $publicEmail) {
  $publicEmail = "$userId+$displayLogin@users.noreply.github.com"
}

git config user.name *> $null
if ($LASTEXITCODE -ne 0) {
  git config user.name $displayName
}

git config user.email *> $null
if ($LASTEXITCODE -ne 0) {
  git config user.email $publicEmail
}

git rev-parse --is-inside-work-tree *> $null
if ($LASTEXITCODE -ne 0) {
  git init -b main
}

$currentBranch = (git branch --show-current).Trim()
if (-not $currentBranch) {
  git checkout -b main
} elseif ($currentBranch -ne "main") {
  git branch -M main
}

git add .

git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  git commit -m "Initial GitHub Pages site"
}

gh repo view $RepoName --json nameWithOwner *> $null
$repoExists = $LASTEXITCODE -eq 0

if (-not $repoExists) {
  gh repo create $RepoName --public --source . --remote origin --push
} else {
  git remote get-url origin *> $null
  if ($LASTEXITCODE -ne 0) {
    git remote add origin "https://github.com/$owner/$RepoName.git"
  }

  git push -u origin main
}

gh api "repos/$owner/$RepoName/pages" *> $null
if ($LASTEXITCODE -eq 0) {
  gh api `
    --method PUT `
    "repos/$owner/$RepoName/pages" `
    -f build_type=legacy `
    -f "source[branch]=main" `
    -f "source[path]=/"
} else {
  gh api `
    --method POST `
    "repos/$owner/$RepoName/pages" `
    -f build_type=legacy `
    -f "source[branch]=main" `
    -f "source[path]=/"
}

$pagesUrl = "https://$owner.github.io/$RepoName/"
Write-Host ""
Write-Host "Repository: https://github.com/$owner/$RepoName"
Write-Host "Pages URL: $pagesUrl"
