# Expected table outputs

Feature 002 serializer fixtures store the reviewed byte-exact HTML, Markdown, plain-text, and CSV strings for each semantic-table fixture as JSON. The suite includes `rowspan="0"`, positive row-span clipping, and distinct row-group boundaries. JSON escapes make CRLF records, tabs, and no-trailing-newline requirements reviewable without relying on checkout line-ending conversion. These expected-output files are consumed by the serializer unit suite; browser integration uses controlled representative payloads for transport and clipboard behavior.
