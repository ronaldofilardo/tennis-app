$files = @(
  'src/components/MatchStatsModal.tsx',
  'src/components/ResumeScoreModal.tsx',
  'src/components/ResumeScoreInputs.tsx',
  'src/hooks/useScoreboardEngine.ts',
  'src/hooks/useScoreboardHandlers.ts',
  'src/state/scoreboardUIState.ts',
  'src/services/matchService.ts',
  'src/components/Dashboard.tsx',
  'src/components/MatchSetup.tsx',
  'src/components/ScoreboardV2.tsx',
  'src/core/scoring/TennisScoring.ts'
)

$summary = @()
foreach ($file in $files) {
  if (Test-Path $file) {
    $lines = (Get-Content $file | Measure-Object -Line).Lines
    $status = if ($lines -le 550) { '✅' } else { '❌' }
    $summary += "$status $file`: $lines lines"
  }
}

$summary | Sort-Object
