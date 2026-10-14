import ExcelJS from "exceljs"
import PDFDocument from "pdfkit"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

export interface InvoiceLine {
  itemCode: string
  description: string
  size: string
  quantity: number
  rate: number
  currency?: string
}

export interface InvoiceData {
  title: "Invoice" | "Proforma Invoice"
  invoiceNumber?: string | null
  date: string
  buyerPo?: string | null
  consignee: string
  consigneeAddress?: string | null
  currency: string
  lines: InvoiceLine[]
}

export interface PackingData {
  invoiceNumber?: string | null
  date: string
  consignee: string
  consigneeAddress?: string | null
  cartons: Array<{
    cartonNumber: string
    items: Array<{
      itemCode: string
      quantity: number
      description?: string | null
    }>
    grossWeightKg: number
    netWeightKg: number
    dimensions: string
  }>
}

async function workbookFromTemplate(path: string | undefined): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook()
  if (path) {
    try {
      await workbook.xlsx.readFile(path)
      return workbook
    } catch {
      // Fall through to a small workbook for local development.
    }
  }
  workbook.addWorksheet("Sheet1")
  return workbook
}

export async function createInvoiceXlsx(data: InvoiceData): Promise<Buffer> {
  const workbook = await workbookFromTemplate(process.env.MOSAIC_INVOICE_TEMPLATE)
  const sheet = workbook.worksheets[0]
  sheet.name = "Invoice"
  sheet.getCell("C1").value = data.title
  sheet.getCell("H2").value = `Invoice No : ${data.invoiceNumber ?? ""}`
  sheet.getCell("I2").value = `Date: ${data.date}`
  sheet.getCell("H3").value = `Buyer's P. O no. : ${data.buyerPo ?? ""}`
  sheet.getCell("C19").value = "Consignee"
  sheet.getCell("C20").value = data.consignee
  sheet.getCell("C21").value = data.consigneeAddress ?? ""
  const firstRow = 33
  data.lines.forEach((line, index) => {
    const row = firstRow + index
    sheet.getCell(`C${row}`).value = index + 1
    sheet.getCell(`D${row}`).value = line.itemCode
    sheet.getCell(`F${row}`).value = line.quantity
    sheet.getCell(`G${row}`).value = line.description
    sheet.getCell(`H${row}`).value = line.size
    sheet.getCell(`I${row}`).value = line.quantity
    sheet.getCell(`J${row}`).value = line.rate
    sheet.getCell(`K${row}`).value = { formula: `I${row}*J${row}` }
  })
  const totalRow = firstRow + data.lines.length + 2
  sheet.getCell(`J${totalRow}`).value = "TOTAL -"
  sheet.getCell(`K${totalRow}`).value = { formula: `SUM(K${firstRow}:K${firstRow + data.lines.length - 1})` }
  sheet.pageSetup.printArea = `A1:K${Math.max(75, totalRow + 10)}`
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

export async function createPackingXlsx(data: PackingData): Promise<Buffer> {
  const workbook = await workbookFromTemplate(process.env.MOSAIC_PL_TEMPLATE)
  const sheet = workbook.worksheets[0]
  sheet.name = "Packing List"
  sheet.getCell("A1").value = "PACKING LIST"
  sheet.getCell("F2").value = `Invoice No : ${data.invoiceNumber ?? ""}`
  sheet.getCell("G2").value = `Date: ${data.date}`
  sheet.getCell("A21").value = "CONSIGNEE"
  sheet.getCell("A22").value = data.consignee
  sheet.getCell("A23").value = data.consigneeAddress ?? ""
  const firstRow = 37
  const originalTotalsRow = 69
  const bodyRows = data.cartons.reduce((total, carton) => total + Math.max(3, carton.items.length) + 1, 0)
  const requiredTotalsRow = firstRow + bodyRows
  const totalsRow = Math.max(originalTotalsRow, requiredTotalsRow)
  const extraRows = Math.max(0, totalsRow - originalTotalsRow)

  if (extraRows > 0) {
    sheet.spliceRows(originalTotalsRow, 0, ...Array.from({ length: extraRows }, () => []))
  }

  // Remove the template's fixed three-row carton merges before creating
  // variable-height groups for cartons with more than three items.
  const mergedRanges = Object.keys((sheet as unknown as { _merges: Record<string, unknown> })._merges ?? {})
  for (const merged of mergedRanges) {
    const range = merged.split(":")
    const start = Number(sheet.getCell(range[0]).row)
    const end = Number(sheet.getCell(range[range.length - 1]).row)
    if (start <= totalsRow && end >= firstRow) sheet.unMergeCells(merged)
  }

  const styleSource = sheet.getRow(firstRow)
  for (let row = firstRow; row < totalsRow; row += 1) {
    const target = sheet.getRow(row)
    target.height = styleSource.height
    for (let column = 1; column <= 9; column += 1) {
      target.getCell(column).style = { ...styleSource.getCell(column).style }
    }
    for (let column = 1; column <= 9; column += 1) target.getCell(column).value = null
  }

  let cursor = firstRow
  const totalQuantityFormulaRows: number[] = []
  for (const carton of data.cartons) {
    const itemRows = Math.max(3, carton.items.length)
    const endRow = cursor + itemRows - 1
    sheet.mergeCells(`A${cursor}:A${endRow}`)
    sheet.mergeCells(`E${cursor}:E${endRow}`)
    sheet.mergeCells(`F${cursor}:F${endRow}`)
    sheet.mergeCells(`G${cursor}:G${endRow}`)
    sheet.getCell(`A${cursor}`).value = carton.cartonNumber
    sheet.getCell(`E${cursor}`).value = carton.netWeightKg
    sheet.getCell(`F${cursor}`).value = carton.grossWeightKg
    sheet.getCell(`G${cursor}`).value = carton.dimensions

    carton.items.forEach((item, itemIndex) => {
      const row = cursor + itemIndex
      sheet.getCell(`B${row}`).value = item.quantity
      sheet.getCell(`C${row}`).value = item.itemCode
      sheet.getCell(`D${row}`).value = item.description ?? null
      totalQuantityFormulaRows.push(row)
    })
    cursor = endRow + 2
  }

  const finalTotalsRow = Math.max(totalsRow, cursor)
  for (let row = cursor; row < finalTotalsRow + 3; row += 1) {
    for (let column = 1; column <= 9; column += 1) sheet.getCell(row, column).value = null
  }
  sheet.getCell(`A${finalTotalsRow}`).value = "TOTAL QUANTITY (Pcs):"
  sheet.getCell(`B${finalTotalsRow}`).value = totalQuantityFormulaRows.length
    ? { formula: totalQuantityFormulaRows.map((row) => `B${row}`).join("+") }
    : 0
  sheet.getCell(`A${finalTotalsRow + 1}`).value = "NET WEIGHT (Kg):"
  sheet.getCell(`B${finalTotalsRow + 1}`).value = data.cartons.reduce((total, carton) => total + carton.netWeightKg, 0)
  sheet.getCell(`A${finalTotalsRow + 2}`).value = "GROSS WEIGHT (Kg):"
  sheet.getCell(`B${finalTotalsRow + 2}`).value = data.cartons.reduce((total, carton) => total + carton.grossWeightKg, 0)
  sheet.pageSetup.printArea = `A1:I${Math.max(77, finalTotalsRow + 8)}`
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

export async function createSimplePdf(title: string, rows: string[]): Promise<Buffer> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    const pdf = new PDFDocument({ size: "A4", margin: 40 })
    pdf.on("data", (chunk) => chunks.push(chunk))
    pdf.on("end", () => resolve(Buffer.concat(chunks)))
    pdf.fontSize(18).text(title, { align: "center" })
    pdf.moveDown()
    pdf.fontSize(10)
    rows.forEach((row) => pdf.text(row))
    pdf.end()
  })
}

export async function convertXlsxToPdf(xlsx: Buffer, filename: string): Promise<Buffer> {
  const directory = await mkdtemp(join(tmpdir(), "mosaic-doc-"))
  const inputPath = join(directory, filename)
  const outputPath = join(directory, `${basename(filename, ".xlsx")}.pdf`)
  const converter = process.env.MOSAIC_PDF_CONVERTER ?? "libreoffice"
  try {
    await writeFile(inputPath, xlsx)
    await execFileAsync(converter, ["--headless", "--convert-to", "pdf", "--outdir", directory, inputPath], { timeout: 60_000 })
    return await readFile(outputPath)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
