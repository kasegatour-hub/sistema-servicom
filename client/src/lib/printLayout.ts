export const KEEP_TOGETHER_PRINT_DECLARATION = "break-inside:avoid;page-break-inside:avoid;-webkit-column-break-inside:avoid";

export function getKeepTogetherPrintCss(selector: string) {
  return `${selector}{${KEEP_TOGETHER_PRINT_DECLARATION}}`;
}

export function getReceiptTicketPrintCss(selector: string) {
  return `@media print{.page-break{page-break-before:always}${getKeepTogetherPrintCss(selector)}}`;
}
