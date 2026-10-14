import ExcelJS from "exceljs"
import PDFDocument from "pdfkit"

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
    quantity: number
    itemCodes: string
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
  data.cartons.forEach((carton, index) => {
    const row = firstRow + index * 4
    sheet.getCell(`A${row}`).value = carton.cartonNumber
    sheet.getCell(`B${row}`).value = carton.quantity
    sheet.getCell(`C${row}`).value = carton.itemCodes
    sheet.getCell(`E${row}`).value = carton.netWeightKg
    sheet.getCell(`F${row}`).value = carton.grossWeightKg
    sheet.getCell(`G${row}`).value = carton.dimensions
  })
  const endRow = firstRow + Math.max(0, data.cartons.length - 1) * 4
  sheet.getCell(`A${endRow + 3}`).value = "TOTAL QUANTITY (Pcs):"
  sheet.getCell(`B${endRow + 3}`).value = { formula: `SUM(B${firstRow}:B${endRow})` }
  sheet.getCell(`A${endRow + 4}`).value = "NET WEIGHT (Kg):"
  sheet.getCell(`B${endRow + 4}`).value = { formula: `SUM(E${firstRow}:E${endRow})` }
  sheet.getCell(`A${endRow + 5}`).value = "GROSS WEIGHT (Kg):"
  sheet.getCell(`B${endRow + 5}`).value = { formula: `SUM(F${firstRow}:F${endRow})` }
  sheet.pageSetup.printArea = `A1:I${Math.max(77, endRow + 8)}`
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
