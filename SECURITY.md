# Security Policy

`@stackline/xlsx` is an independently maintained, SheetJS-compatible fork with
additional hardening for spreadsheet parsing and conversion workflows.

## Supported versions

Security fixes are released in the latest public `1.x` version.

| Version | Security support |
|:--- |:--- |
| Latest `1.x` release | Yes |
| Earlier `1.x` releases | Upgrade to the latest `1.x` release |
| `0.20.2-stackline.x` and prereleases | No; migration support only |
| SheetJS or other upstream releases | Report to the relevant upstream project |

The current supported version is published under the npm `latest` tag. Do not
use an unpublished branch, commit, or prerelease as a security boundary.

## Private reporting

Report suspected vulnerabilities through
[GitHub Private Vulnerability Reporting](https://github.com/alexandroit/sheetjs/security/advisories/new).
Do not open a public issue with exploit details or attach sensitive workbooks.

Include as much of the following information as possible:

- affected `@stackline/xlsx` version and runtime;
- minimal reproduction steps or a bounded proof of concept;
- expected and observed behavior;
- impact and realistic attack prerequisites;
- affected parser, format, option, or public API;
- suggested mitigation, when known.

Use synthetic files. Remove credentials, customer data, personal information,
and proprietary workbook content before submitting a report.

## Response targets

- Acknowledgment within three business days.
- Initial assessment within seven business days.
- Status updates at least every fourteen days while a confirmed report remains
  unresolved.

Resolution time depends on severity, compatibility risk, and the availability of
a safe patch. These are response targets, not a guarantee of a specific release
date.

## Scope

Reports are in scope when they demonstrate a security impact in code maintained
or distributed by `@stackline/xlsx`, including:

- prototype pollution or unsafe object-key handling;
- denial of service from parser complexity or unbounded resource use;
- unsafe archive, relationship, formula, metadata, or worksheet parsing;
- unexpected file-system or code-execution behavior;
- a bypass of an existing security control or regression test;
- a compromised release, build, provenance, or package artifact.

General support questions, feature requests, vulnerabilities that only affect an
unmodified upstream package, and findings without a security boundary impact are
out of scope for private reporting.

## Existing advisories

The fork includes fixes and regression coverage for:

- [GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6), prototype pollution;
- [GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9), regular expression denial of service.

Report a new bypass or regression privately. Duplicate reports that only restate
the published advisories may be closed with a reference to the existing fix.

## Fix and disclosure process

Confirmed fixes must include focused regression tests and compatibility coverage.
Parser denial-of-service tests must use bounded malicious input and deterministic
limits instead of fragile wall-clock assertions. Prototype-pollution tests must
verify that `Object.prototype` and parser-owned dictionaries remain unchanged.

Maintainers will coordinate disclosure with the reporter. Do not publish exploit
details before a fix or mitigation is available unless coordinated disclosure
has ended or immediate public notice is necessary to protect users.
