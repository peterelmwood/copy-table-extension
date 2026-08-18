# Validation Record: Copy Table as Structured Formats

**Status**: Pending GUI-capable owner validation  
**Automated command**: `$env:npm_config_script_shell = 'C:\Program Files\PowerShell\7\pwsh.exe'; npm run verify`

## Firefox interaction matrix

| Scenario | Firefox/version | Fixture | Expected | Observed | Elapsed | Pass |
|---|---|---|---|---|---|---|
| Copy as HTML | Pending | complex table | safe standalone table | Pending | Pending | [ ] |
| Copy as Markdown | Pending | spans and pipes | exact reviewed Markdown | Pending | Pending | [ ] |
| Copy as Plain text | Pending | multiline cells | tab/LF matrix | Pending | Pending | [ ] |
| Copy as CSV | Pending | quotes/commas/newlines | exact reviewed CSV | Pending | Pending | [ ] |
| Nested target | Pending | nested tables | nearest nested table only | Pending | Pending | [ ] |
| No table | Pending | ordinary paragraph | feedback; clipboard unchanged | Pending | Pending | [ ] |
| Protected page | Pending | browser-protected URL | restriction feedback; clipboard unchanged | Pending | Pending | [ ] |
| Keyboard menu | Pending | semantic table | discover and complete without popup | Pending | Pending | [ ] |

## Performance record

Record 20 attempts against the reviewed 100×50 fixture. At least 19 must finish within 2 seconds.

| Attempts | Within 2 seconds | Slowest | Environment | Pass |
|---|---|---|---|---|
| Pending | Pending | Pending | Pending | [ ] |

## Notes and interventions

- Pending.
