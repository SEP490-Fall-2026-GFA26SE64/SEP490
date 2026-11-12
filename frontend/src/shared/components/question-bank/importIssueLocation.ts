export function importIssueLocation(message: string, sourceRows: number[], excel: boolean, copy: (en: string, vi: string) => string): string {
  return message.replace(/\bRow (\d+):/g, (original, index: string) => {
    const row = sourceRows[Number(index) - 1]
    return row === undefined ? original : `${excel ? copy('Excel row', 'Dòng Excel') : copy('JSON item', 'Phần tử JSON')} ${row}:`
  })
}
