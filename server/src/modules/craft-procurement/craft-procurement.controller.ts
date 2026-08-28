import type { NextFunction, Request, Response } from "express";
import PDFDocument from "pdfkit";
import { z } from "zod";
import { AppError } from "../../shared/errors/AppError";
import { sendSuccess } from "../../shared/utils/response";
import { storageService } from '../../shared/storage';
import { getCraftBusinessUnit } from "../craft-orders/craft-orders.helpers";
import {
  contactSchema,
  contactUpdateSchema,
  goodsReceiptSchema,
  purchaseOrderSchema,
  purchaseOrderUpdateSchema,
  purchaseRequestSchema,
  supplierCreateSchema,
  supplierInvoiceSchema,
  supplierUpdateSchema,
} from "./craft-procurement.schema";
import { CraftProcurementRepository } from "./craft-procurement.repository";
import { CraftProcurementService } from "./craft-procurement.service";
import type {
  ProcurementActor,
  ProcurementListFilters,
} from "./craft-procurement.types";

const id = (value: unknown, label = "ID") => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw || ""), 10);
  if (!Number.isInteger(parsed) || parsed <= 0)
    throw new AppError(400, "INVALID_ID", `${label} tidak valid.`);
  return parsed;
};

export class CraftProcurementController {
  private repository = new CraftProcurementRepository();
  private service = new CraftProcurementService();
  private async actor(req: Request): Promise<ProcurementActor> {
    return {
      ...(await getCraftBusinessUnit()),
      userId: Number((req as any).user.id),
    };
  }
  private filters(query: Request["query"]): ProcurementListFilters {
    const page = query.page ? Number.parseInt(String(query.page), 10) : 1;
    const limit = query.limit ? Number.parseInt(String(query.limit), 10) : 25;
    return {
      page: Number.isFinite(page) ? page : 1,
      limit: Number.isFinite(limit) ? limit : 25,
      search: typeof query.search === "string" ? query.search : undefined,
      status: typeof query.status === "string" ? query.status : undefined,
      supplierId: query.supplierId
        ? id(String(query.supplierId), "ID pemasok")
        : undefined,
    };
  }
  private nextValidation(error: unknown, next: NextFunction) {
    next(
      error instanceof z.ZodError
        ? new AppError(
            400,
            "VALIDATION_ERROR",
            "Data Pengadaan tidak valid.",
            error.issues,
          )
        : error,
    );
  }

  overview = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const craft = await getCraftBusinessUnit();
      sendSuccess(res, await this.repository.getOverview(craft));
    } catch (error) {
      next(error);
    }
  };
  references = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const craft = await getCraftBusinessUnit();
      sendSuccess(res, await this.repository.getReferences(craft));
    } catch (error) {
      next(error);
    }
  };
  supplierDuplicates = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const craft = await getCraftBusinessUnit();
      const input = z
        .object({
          display_name: z.string().trim().max(200).optional(),
          legal_name: z.string().trim().max(250).nullable().optional(),
          email: z
            .string()
            .trim()
            .email()
            .nullable()
            .optional()
            .or(z.literal("")),
          phone: z.string().trim().max(50).nullable().optional(),
          tax_id: z.string().trim().max(100).nullable().optional(),
        })
        .parse(req.body);
      sendSuccess(
        res,
        await this.repository.findSupplierDuplicates(input, craft),
      );
    } catch (error) {
      this.nextValidation(error, next);
    }
  };
  listSuppliers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const craft = await getCraftBusinessUnit();
      sendSuccess(
        res,
        await this.repository.listSuppliers(craft, this.filters(req.query)),
      );
    } catch (error) {
      next(error);
    }
  };
  createSupplier = async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(
        res,
        await this.service.createSupplier(
          supplierCreateSchema.parse(req.body),
          await this.actor(req),
        ),
        undefined,
        201,
      );
    } catch (error) {
      this.nextValidation(error, next);
    }
  };
  getSupplier = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const craft = await getCraftBusinessUnit();
      const detail = await this.repository.getSupplierDetail(
        id(req.params.id, "ID pemasok"),
        craft,
      );
      if (!detail)
        throw new AppError(
          404,
          "SUPPLIER_NOT_FOUND",
          "Pemasok tidak ditemukan.",
        );
      sendSuccess(res, detail);
    } catch (error) {
      next(error);
    }
  };
  updateSupplier = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.updateSupplier(
        id(req.params.id, "ID pemasok"),
        supplierUpdateSchema.parse(req.body),
        await this.actor(req),
      );
      sendSuccess(res, { message: "Pemasok berhasil diperbarui." });
    } catch (error) {
      this.nextValidation(error, next);
    }
  };
  setSupplierStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const input = z.object({ active: z.boolean() }).parse(req.body);
      await this.service.setSupplierActive(
        id(req.params.id, "ID pemasok"),
        input.active,
        await this.actor(req),
      );
      sendSuccess(res, {
        message: input.active
          ? "Pemasok diaktifkan."
          : "Pemasok dinonaktifkan.",
      });
    } catch (error) {
      this.nextValidation(error, next);
    }
  };
  createSupplierContact = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      sendSuccess(
        res,
        await this.service.createContact(
          id(req.params.id, "ID pemasok"),
          contactSchema.parse(req.body),
          await this.actor(req),
        ),
        undefined,
        201,
      );
    } catch (error) {
      this.nextValidation(error, next);
    }
  };
  updateSupplierContact = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      await this.service.updateContact(
        id(req.params.id, "ID pemasok"),
        id(req.params.contactId, "ID kontak"),
        contactUpdateSchema.parse(req.body),
        await this.actor(req),
      );
      sendSuccess(res, { message: "Kontak pemasok berhasil diperbarui." });
    } catch (error) {
      this.nextValidation(error, next);
    }
  };
  deleteSupplierContact = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      await this.service.deleteContact(
        id(req.params.id, "ID pemasok"),
        id(req.params.contactId, "ID kontak"),
        await this.actor(req),
      );
      sendSuccess(res, { message: "Kontak pemasok dihapus." });
    } catch (error) {
      next(error);
    }
  };

  listRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const craft = await getCraftBusinessUnit();
      sendSuccess(
        res,
        await this.repository.listPurchaseRequests(
          craft,
          this.filters(req.query),
        ),
      );
    } catch (error) {
      next(error);
    }
  };
  createRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(
        res,
        await this.service.createPurchaseRequest(
          purchaseRequestSchema.parse(req.body),
          await this.actor(req),
        ),
        undefined,
        201,
      );
    } catch (error) {
      this.nextValidation(error, next);
    }
  };
  getRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const craft = await getCraftBusinessUnit();
      const record = await this.repository.getPurchaseRequest(
        id(req.params.id, "ID permintaan"),
        craft,
      );
      if (!record)
        throw new AppError(
          404,
          "PURCHASE_REQUEST_NOT_FOUND",
          "Permintaan pembelian tidak ditemukan.",
        );
      sendSuccess(res, record);
    } catch (error) {
      next(error);
    }
  };
  updateRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.updatePurchaseRequest(
        id(req.params.id, "ID permintaan"),
        purchaseRequestSchema.parse(req.body),
        await this.actor(req),
      );
      sendSuccess(res, { message: "Permintaan pembelian diperbarui." });
    } catch (error) {
      this.nextValidation(error, next);
    }
  };
  submitRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.submitPurchaseRequest(
        id(req.params.id, "ID permintaan"),
        await this.actor(req),
      );
      sendSuccess(res, { message: "Permintaan pembelian diajukan." });
    } catch (error) {
      next(error);
    }
  };
  approveRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.approvePurchaseRequest(
        id(req.params.id, "ID permintaan"),
        await this.actor(req),
      );
      sendSuccess(res, { message: "Permintaan pembelian disetujui." });
    } catch (error) {
      next(error);
    }
  };
  rejectRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = z
        .object({ reason: z.string().trim().min(3).max(500) })
        .parse(req.body);
      await this.service.rejectPurchaseRequest(
        id(req.params.id, "ID permintaan"),
        input.reason,
        await this.actor(req),
      );
      sendSuccess(res, { message: "Permintaan pembelian ditolak." });
    } catch (error) {
      this.nextValidation(error, next);
    }
  };
  closeRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.closePurchaseRequest(
        id(req.params.id, "ID permintaan"),
        await this.actor(req),
      );
      sendSuccess(res, { message: "Permintaan pembelian ditutup." });
    } catch (error) {
      next(error);
    }
  };

  listOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const craft = await getCraftBusinessUnit();
      sendSuccess(
        res,
        await this.repository.listPurchaseOrders(
          craft,
          this.filters(req.query),
        ),
      );
    } catch (error) {
      next(error);
    }
  };
  createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(
        res,
        await this.service.createPurchaseOrder(
          purchaseOrderSchema.parse(req.body),
          await this.actor(req),
        ),
        undefined,
        201,
      );
    } catch (error) {
      this.nextValidation(error, next);
    }
  };
  getOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const craft = await getCraftBusinessUnit();
      const record = await this.repository.getPurchaseOrder(
        id(req.params.id, "ID PO"),
        craft,
      );
      if (!record)
        throw new AppError(
          404,
          "PURCHASE_ORDER_NOT_FOUND",
          "Pesanan pembelian tidak ditemukan.",
        );
      sendSuccess(res, record);
    } catch (error) {
      next(error);
    }
  };
  updateOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.updatePurchaseOrder(
        id(req.params.id, "ID PO"),
        purchaseOrderUpdateSchema.parse(req.body),
        await this.actor(req),
      );
      sendSuccess(res, { message: "PO diperbarui." });
    } catch (error) {
      this.nextValidation(error, next);
    }
  };
  sendOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.markPurchaseOrderSent(
        id(req.params.id, "ID PO"),
        await this.actor(req),
      );
      sendSuccess(res, { message: "PO ditandai terkirim." });
    } catch (error) {
      next(error);
    }
  };
  confirmOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.confirmPurchaseOrder(
        id(req.params.id, "ID PO"),
        await this.actor(req),
      );
      sendSuccess(res, { message: "PO dikonfirmasi." });
    } catch (error) {
      next(error);
    }
  };
  cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.cancelPurchaseOrder(
        id(req.params.id, "ID PO"),
        await this.actor(req),
      );
      sendSuccess(res, { message: "PO dibatalkan." });
    } catch (error) {
      next(error);
    }
  };
  closeOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.closePurchaseOrder(
        id(req.params.id, "ID PO"),
        await this.actor(req),
      );
      sendSuccess(res, { message: "PO ditutup." });
    } catch (error) {
      next(error);
    }
  };
  downloadOrderPdf = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const craft = await getCraftBusinessUnit();
      const record = await this.repository.getPurchaseOrder(
        id(req.params.id, "ID PO"),
        craft,
      );
      if (!record)
        throw new AppError(
          404,
          "PURCHASE_ORDER_NOT_FOUND",
          "Pesanan pembelian tidak ditemukan.",
        );
      const doc = new PDFDocument({ margin: 48 });
      res
        .status(200)
        .setHeader("Content-Type", "application/pdf")
        .setHeader(
          "Content-Disposition",
          `attachment; filename="${record.order.po_number}.pdf"`,
        );
      doc.pipe(res);
      doc.fontSize(20).text("PURCHASE ORDER");
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .text(
          `Nomor: ${record.order.po_number}\nTanggal: ${record.order.order_date}\nPemasok: ${record.order.supplier_name}\nStatus: ${record.order.status_code}`,
        );
      doc.moveDown();
      record.items.forEach((item: any, index: number) =>
        doc.text(
          `${index + 1}. ${item.description} — ${item.quantity} ${item.unit_symbol || ""} × ${item.unit_price} = ${item.line_total}`,
        ),
      );
      doc.moveDown();
      doc
        .fontSize(12)
        .text(
          `Total: ${record.order.currency_code} ${Number(record.order.total_amount).toLocaleString("id-ID")}`,
          { align: "right" },
        );
      if (record.order.notes) {
        doc.moveDown();
        doc.fontSize(9).text(`Catatan: ${record.order.notes}`);
      }
      doc.end();
    } catch (error) {
      next(error);
    }
  };

  listReceipts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const craft = await getCraftBusinessUnit();
      sendSuccess(
        res,
        await this.repository.listGoodsReceipts(craft, this.filters(req.query)),
      );
    } catch (error) {
      next(error);
    }
  };
  createReceipt = async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(
        res,
        await this.service.createGoodsReceipt(
          goodsReceiptSchema.parse(req.body),
          await this.actor(req),
        ),
        undefined,
        201,
      );
    } catch (error) {
      this.nextValidation(error, next);
    }
  };
  getReceipt = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const craft = await getCraftBusinessUnit();
      const record = await this.repository.getGoodsReceipt(
        id(req.params.id, "ID penerimaan"),
        craft,
      );
      if (!record)
        throw new AppError(
          404,
          "GOODS_RECEIPT_NOT_FOUND",
          "Penerimaan barang tidak ditemukan.",
        );
      sendSuccess(res, record);
    } catch (error) {
      next(error);
    }
  };

  listInvoices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const craft = await getCraftBusinessUnit();
      sendSuccess(
        res,
        await this.repository.listSupplierInvoices(
          craft,
          this.filters(req.query),
        ),
      );
    } catch (error) {
      next(error);
    }
  };
  createInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(
        res,
        await this.service.createSupplierInvoice(
          supplierInvoiceSchema.parse(req.body),
          await this.actor(req),
        ),
        undefined,
        201,
      );
    } catch (error) {
      this.nextValidation(error, next);
    }
  };
  voidInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.voidSupplierInvoice(
        id(req.params.id, "ID tagihan"),
        await this.actor(req),
      );
      sendSuccess(res, { message: "Tagihan pemasok dibatalkan." });
    } catch (error) {
      next(error);
    }
  };
  downloadInvoiceDocument = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const craft = await getCraftBusinessUnit();
      const invoice = await this.repository.getSupplierInvoice(
        id(req.params.id, "ID tagihan"),
        craft,
      );
      if (!invoice)
        throw new AppError(
          404,
          "SUPPLIER_INVOICE_NOT_FOUND",
          "Tagihan pemasok tidak ditemukan.",
        );
      if (!invoice.document_path)
        throw new AppError(
          404,
          "INVOICE_DOCUMENT_NOT_AVAILABLE",
          "Dokumen tagihan belum tersedia.",
        );
      await storageService.streamToResponse(res, String(invoice.document_path), { filename: `supplier-invoice-${invoice.supplier_invoice_number || invoice.id}` });
    } catch (error) {
      next(error);
    }
  };
  uploadInvoiceDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError(400, 'DOCUMENT_REQUIRED', 'Pilih dokumen tagihan terlebih dahulu.');
      const actor = await this.actor(req);
      sendSuccess(res, await this.service.replaceSupplierInvoiceDocument(id(req.params.id, 'ID tagihan'), req.file, actor));
    } catch (error) { next(error); }
  };
  removeInvoiceDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = await this.actor(req);
      sendSuccess(res, await this.service.removeSupplierInvoiceDocument(id(req.params.id, 'ID tagihan'), actor));
    } catch (error) { next(error); }
  };
  history = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const craft = await getCraftBusinessUnit();
      sendSuccess(
        res,
        await this.repository.getHistory(craft, this.filters(req.query)),
      );
    } catch (error) {
      next(error);
    }
  };
}
