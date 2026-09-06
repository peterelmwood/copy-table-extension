export default {
  printWidth: 100,
  singleQuote: false,
  trailingComma: "none",
  // Git normalises to LF in the index, but Windows checkouts land as CRLF, which
  // otherwise fails every file here while passing on the Linux runners.
  endOfLine: "auto"
};
