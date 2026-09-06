# Data Model: Firefox Build and Public Publishing

## Release Candidate

Represents the immutable input eligible for public submission.

| Field           | Meaning                  | Validation                                |
| --------------- | ------------------------ | ----------------------------------------- |
| revision        | Repository commit SHA    | Exactly the triggering immutable revision |
| tag             | Release marker           | Exact `vX.Y.Z` grammar                    |
| version         | Stable extension version | Equals tag without `v`                    |
| packageVersion  | `package.json` version   | Equals `version`                          |
| manifestVersion | source manifest version  | Equals `version`                          |
| extensionId     | Firefox add-on identity  | Exactly `copy-table@peterelmwood.com`     |

Identity is the pair `(extensionId, version)`. A version is submitted at most
once to the listed channel.

## Extension Artifact

Represents the deterministic unsigned package retained for CI evidence and the
runtime file set supplied to Mozilla by `web-ext`.

| Field         | Meaning                  | Validation                           |
| ------------- | ------------------------ | ------------------------------------ |
| filename      | Versioned ZIP name       | Contains the validated version       |
| revision      | Originating commit       | Equals release candidate revision    |
| sha256        | Artifact digest          | Stable for identical committed input |
| entries       | Runtime files            | Exact reviewed allowlist, no extras  |
| retentionDays | Hosted artifact lifetime | Exactly 30 for ordinary CI           |

## Reviewer Source Package

Represents human-readable source and reproducibility instructions uploaded with
every listed version.

| Field           | Meaning                    | Validation                                                |
| --------------- | -------------------------- | --------------------------------------------------------- |
| filename        | Versioned source ZIP name  | `copy-table-source-X.Y.Z.zip`                             |
| revision        | Originating commit         | Equals release candidate revision                         |
| sha256          | Source digest              | Stable for identical committed input                      |
| entries         | Allowed source/config/docs | Matches explicit allowlist                                |
| excludedClasses | Forbidden material         | No generated, dependency, history, state, or secret paths |

The package rejects symbolic links instead of following them.

## Public Listing Metadata

Represents the owner-reviewed values needed to create or update the AMO listing.

| Field       | Value/Rule                                               |
| ----------- | -------------------------------------------------------- |
| extensionId | `copy-table@peterelmwood.com` from the manifest          |
| summary     | At least one locale; English describes four copy formats |
| category    | `web-development`                                        |
| license     | `ISC`                                                    |
| channel     | `listed` only                                            |

## Submission Result

Represents what the automation can honestly assert after contacting AMO.

| State     | Meaning                                         | Next state                                 |
| --------- | ----------------------------------------------- | ------------------------------------------ |
| validated | All local gates passed                          | packaged                                   |
| packaged  | Extension and reviewer source exist             | submitted or failed                        |
| submitted | AMO accepted the submission request             | pending, published, or rejected externally |
| pending   | Review is not yet confirmed                     | published or rejected externally           |
| published | AMO confirms public availability                | terminal for this version                  |
| rejected  | AMO rejects or disables the version             | owner remediation                          |
| failed    | A known local or remote gate failed             | correct and create a new eligible attempt  |
| ambiguous | Upload may have succeeded but response was lost | inspect Developer Hub before retry         |

Automation transitions only through `submitted`; it does not infer `published`
without separate evidence from AMO.
