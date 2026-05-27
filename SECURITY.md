# Security Policy

`@stackline/xlsx` is maintained as a SheetJS-compatible fork with additional
security hardening for spreadsheet parsing and conversion workflows.

## Supported versions

| Version | Supported |
|:--- |:--- |
| `1.0.x` | Yes |
| `0.20.2-stackline.x` | Yes |
| Older Stackline prereleases | No |
| Upstream `xlsx` releases | See the upstream project |

## Reporting a vulnerability

- Use GitHub Security Advisories for the repository when available.
- If private advisory reporting is not available, open a public issue without
  exploit details and ask for a private disclosure channel.
- Include the affected version, minimal reproduction steps and expected impact.
- Do not attach private workbooks or customer data.

## Security expectations

Security fixes should include regression tests. For parser issues, tests should
verify both the malicious input behavior and normal compatibility behavior.

For prototype pollution reports, tests should assert that `Object.prototype` is
not modified. For denial of service reports, tests should use bounded malicious
inputs and verify a controlled error or reasonable processing time.
