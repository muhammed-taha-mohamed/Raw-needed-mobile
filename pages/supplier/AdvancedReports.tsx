import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import { useNavigate } from 'react-router-dom';
import Dropdown from '../../components/Dropdown';
import FeatureUpgradePrompt from '../../components/FeatureUpgradePrompt';
import { useLanguage } from '../../App';
import { api } from '../../api';
import { PlanFeaturesEnum } from '../../types';
import { hasFeature } from '../../utils/subscription';

interface SupplierProductOption {
  id: string;
  name: string;
  image?: string;
  unit?: string;
}

interface ProductCardReportLine {
  lineId: string;
  orderId: string;
  orderNumber?: string;
  customerOwnerId?: string;
  customerName?: string;
  customerOrganizationName?: string;
  status?: string;
  quantity?: number;
  unit?: string;
}

interface ProductCardReport {
  product: {
    id: string;
    name: string;
    image?: string;
    unit?: string;
    stockQuantity?: number;
    categoryName?: string;
    subCategoryName?: string;
  };
  totalLines: number;
  totalOrders: number;
  totalSalesAmount?: number;
  statusCounts: Record<string, number>;
  lines: ProductCardReportLine[];
}

interface SupplierSalesReport {
  totalRequestsCount: number;
  completedRequestsCount: number;
  totalSalesAmount: number;
  overallStatusCounts: Record<string, number>;
  topProduct?: {
    productId?: string;
    productName?: string;
    requestedCount?: number;
    statusCounts?: Record<string, number>;
  } | null;
  topCustomer?: {
    customerOwnerId?: string;
    customerName?: string;
    customerOrganizationName?: string;
    requestedCount?: number;
    statusCounts?: Record<string, number>;
  } | null;
}

interface SupplierInsightsReport {
  monthlyTrend: Array<{
    monthKey: string;
    totalRequests: number;
    completedRequests: number;
    totalSalesAmount: number;
  }>;
  topProducts: Array<{
    productId?: string;
    productName?: string;
    requestedCount?: number;
    totalSalesAmount?: number;
    statusCounts?: Record<string, number>;
  }>;
  topCustomers: Array<{
    customerKey?: string;
    customerName?: string;
    requestedCount?: number;
    totalSalesAmount?: number;
    statusCounts?: Record<string, number>;
  }>;
  statusDistribution: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  completedOrderValueBuckets: Array<{
    bucketLabel: string;
    count: number;
    totalSalesAmount: number;
  }>;
}

type ReportType =
  | 'product-card'
  | 'sales-report'
  | 'monthly-trend'
  | 'tops-overview'
  | 'deep-insights'
  | 'status-distribution'
  | 'value-buckets';

const AdvancedReports: React.FC = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();

  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);

  const [products, setProducts] = useState<SupplierProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productCardReport, setProductCardReport] = useState<ProductCardReport | null>(null);
  const [salesReport, setSalesReport] = useState<SupplierSalesReport | null>(null);
  const [insightsReport, setInsightsReport] = useState<SupplierInsightsReport | null>(null);

  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingProductCardReport, setIsLoadingProductCardReport] = useState(false);
  const [isLoadingSalesReport, setIsLoadingSalesReport] = useState(false);
  const [isLoadingInsightsReport, setIsLoadingInsightsReport] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [salesMonthValue, setSalesMonthValue] = useState('');
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [sheetDragY, setSheetDragY] = useState(0);

  const reportBodyRef = useRef<HTMLDivElement>(null);
  const sheetTouchStartY = useRef<number | null>(null);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const productOptions = useMemo(
    () => products.map((p) => ({ value: p.id, label: p.name || '-' })),
    [products]
  );

  const statusLabel = (raw?: string) => {
    const status = (raw || '').toUpperCase();
    const map: Record<string, { ar: string; en: string }> = {
      PENDING: { ar: 'قيد الانتظار', en: 'Pending' },
      COMPLETED: { ar: 'مكتمل', en: 'Completed' },
      RESPONDED: { ar: 'تم الرد', en: 'Responded' },
      OPEN: { ar: 'مفتوح', en: 'Open' },
      ACCEPTED: { ar: 'مقبول', en: 'Accepted' },
      CANCELLED: { ar: 'ملغي', en: 'Cancelled' },
      REJECTED: { ar: 'مرفوض', en: 'Rejected' },
      APPROVED: { ar: 'مقبول', en: 'Approved' },
      PROCESSING: { ar: 'قيد المعالجة', en: 'Processing' },
      IN_PROGRESS: { ar: 'جاري التنفيذ', en: 'In Progress' },
      SHIPPED: { ar: 'تم الشحن', en: 'Shipped' },
      DELIVERED: { ar: 'تم التسليم', en: 'Delivered' },
      DRAFT: { ar: 'مسودة', en: 'Draft' },
      EXPIRED: { ar: 'منتهي', en: 'Expired' },
      WAITING_SUPPLIER_RESPONSE: { ar: 'بانتظار رد المورد', en: 'Waiting Supplier Response' }
    };
    if (map[status]) return lang === 'ar' ? map[status].ar : map[status].en;
    if (!status) return '-';
    const text = status.replace(/_/g, ' ').toLowerCase();
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const sortedProductStatusRows = useMemo(
    () => Object.entries(productCardReport?.statusCounts || {}).sort((a, b) => (b[1] || 0) - (a[1] || 0)),
    [productCardReport]
  );

  const sortedOverallStatusRows = useMemo(
    () => Object.entries(salesReport?.overallStatusCounts || {}).sort((a, b) => (b[1] || 0) - (a[1] || 0)),
    [salesReport]
  );

  const totalSalesRequests = salesReport?.totalRequestsCount || 0;
  const completedRequests = salesReport?.completedRequestsCount || 0;
  const totalSalesAmount = Number(salesReport?.totalSalesAmount || 0);

  const countByStatuses = (all: Record<string, number> | undefined, keys: string[]) => {
    if (!all) return 0;
    return keys.reduce((sum, key) => sum + (all[key] || 0), 0);
  };

  const pendingRequests = countByStatuses(salesReport?.overallStatusCounts, ['PENDING']);
  const cancelledRequests = countByStatuses(salesReport?.overallStatusCounts, ['CANCELLED', 'REJECTED']);
  const openRequests = Math.max(totalSalesRequests - completedRequests - cancelledRequests, 0);
  const completionRate = totalSalesRequests > 0 ? (completedRequests / totalSalesRequests) * 100 : 0;
  const avgCompletedValue = completedRequests > 0 ? totalSalesAmount / completedRequests : 0;
  const topStatus = sortedOverallStatusRows[0];
  const uniqueStatusesCount = sortedOverallStatusRows.length;

  const topProductShare = totalSalesRequests > 0
    ? ((salesReport?.topProduct?.requestedCount || 0) / totalSalesRequests) * 100
    : 0;
  const topCustomerShare = totalSalesRequests > 0
    ? ((salesReport?.topCustomer?.requestedCount || 0) / totalSalesRequests) * 100
    : 0;

  useEffect(() => {
    const run = async () => {
      setIsCheckingAccess(true);
      try {
        const ok = await hasFeature(PlanFeaturesEnum.SUPPLIER_ADVANCED_REPORTS);
        setHasAccess(!!ok);
      } finally {
        setIsCheckingAccess(false);
      }
    };
    void run();
  }, []);

  const loadProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const data = await api.get<SupplierProductOption[]>('/api/v1/reports/supplier/products');
      setProducts(data || []);
      setProductsLoaded(true);
      setSelectedProductId('');
      setProductCardReport(null);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const loadProductCardReport = async () => {
    if (!selectedProductId) return;
    setIsLoadingProductCardReport(true);
    try {
      const data = await api.get<ProductCardReport>(`/api/v1/reports/supplier/product-card?productId=${selectedProductId}`);
      setProductCardReport(data || null);
    } finally {
      setIsLoadingProductCardReport(false);
    }
  };

  const loadSalesReport = async (monthValue?: string) => {
    setIsLoadingSalesReport(true);
    try {
      const raw = (monthValue ?? salesMonthValue).trim();
      let url = '/api/v1/reports/supplier/sales-report';
      if (raw) {
        const [yyRaw, mmRaw] = raw.split('-');
        const yy = Number(yyRaw);
        const mm = Number(mmRaw);
        if (!Number.isNaN(yy) && !Number.isNaN(mm)) {
          url += `?month=${mm}&year=${yy}`;
        }
      }
      const data = await api.get<SupplierSalesReport>(url);
      setSalesReport(data || null);
    } finally {
      setIsLoadingSalesReport(false);
    }
  };

  const loadInsightsReport = async () => {
    setIsLoadingInsightsReport(true);
    try {
      const data = await api.get<SupplierInsightsReport>('/api/v1/reports/supplier/insights');
      setInsightsReport(data || null);
    } finally {
      setIsLoadingInsightsReport(false);
    }
  };

  const onSelectReport = (type: ReportType) => {
    setSelectedReport(type);
    setIsMobileSheetOpen(true);
    setSheetDragY(0);

    if (type === 'product-card' && !productsLoaded && !isLoadingProducts) {
      void loadProducts();
    }
    if (type === 'sales-report' && !salesReport && !isLoadingSalesReport) {
      void loadSalesReport(salesMonthValue);
    }
    if (
      (type === 'monthly-trend'
        || type === 'tops-overview'
        || type === 'deep-insights'
        || type === 'status-distribution'
        || type === 'value-buckets')
      && !insightsReport
      && !isLoadingInsightsReport
    ) {
      void loadInsightsReport();
    }

    setTimeout(() => {
      reportBodyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const closeMobileSheet = () => {
    setIsMobileSheetOpen(false);
    setSheetDragY(0);
    sheetTouchStartY.current = null;
  };

  const onSheetTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    sheetTouchStartY.current = e.touches[0]?.clientY ?? null;
  };

  const onSheetTouchMove: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (sheetTouchStartY.current == null) return;
    const currentY = e.touches[0]?.clientY ?? sheetTouchStartY.current;
    const delta = currentY - sheetTouchStartY.current;
    if (delta > 0) setSheetDragY(Math.min(delta, 240));
  };

  const onSheetTouchEnd: React.TouchEventHandler<HTMLDivElement> = () => {
    if (sheetDragY > 90) {
      closeMobileSheet();
      return;
    }
    setSheetDragY(0);
    sheetTouchStartY.current = null;
  };

  const EXCEL_PRIMARY = 'FF0EA5B7';
  const EXCEL_MUTED_BG = 'FFF8FAFC';
  const EXCEL_HEADER_BG = 'FFE2F6F8';
  const EXCEL_BORDER = 'FFD8E2E8';

  const styleCell = (ws: XLSX.WorkSheet, r: number, c: number, style: any) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    if (!ws[addr]) return;
    (ws[addr] as any).s = style;
  };

  const styleRow = (ws: XLSX.WorkSheet, row: number, fromCol: number, toCol: number, style: any) => {
    for (let c = fromCol; c <= toCol; c += 1) styleCell(ws, row, c, style);
  };

  const headerStyle = {
    fill: { fgColor: { rgb: EXCEL_HEADER_BG } },
    font: { bold: true, color: { rgb: 'FF0F172A' }, sz: 11 },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: EXCEL_BORDER } },
      bottom: { style: 'thin', color: { rgb: EXCEL_BORDER } },
      left: { style: 'thin', color: { rgb: EXCEL_BORDER } },
      right: { style: 'thin', color: { rgb: EXCEL_BORDER } }
    }
  };

  const bodyStyle = {
    fill: { fgColor: { rgb: 'FFFFFFFF' } },
    font: { color: { rgb: 'FF0F172A' }, sz: 10 },
    alignment: { vertical: 'center', horizontal: 'left' },
    border: {
      top: { style: 'thin', color: { rgb: EXCEL_BORDER } },
      bottom: { style: 'thin', color: { rgb: EXCEL_BORDER } },
      left: { style: 'thin', color: { rgb: EXCEL_BORDER } },
      right: { style: 'thin', color: { rgb: EXCEL_BORDER } }
    }
  };

  const titleStyle = {
    fill: { fgColor: { rgb: EXCEL_PRIMARY } },
    font: { bold: true, color: { rgb: 'FFFFFFFF' }, sz: 14 },
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: EXCEL_BORDER } },
      bottom: { style: 'thin', color: { rgb: EXCEL_BORDER } },
      left: { style: 'thin', color: { rgb: EXCEL_BORDER } },
      right: { style: 'thin', color: { rgb: EXCEL_BORDER } }
    }
  };

  const infoLabelStyle = {
    fill: { fgColor: { rgb: EXCEL_MUTED_BG } },
    font: { bold: true, color: { rgb: 'FF334155' }, sz: 10 },
    alignment: { vertical: 'center', horizontal: 'left' },
    border: {
      top: { style: 'thin', color: { rgb: EXCEL_BORDER } },
      bottom: { style: 'thin', color: { rgb: EXCEL_BORDER } },
      left: { style: 'thin', color: { rgb: EXCEL_BORDER } },
      right: { style: 'thin', color: { rgb: EXCEL_BORDER } }
    }
  };

  const infoValueStyle = {
    fill: { fgColor: { rgb: 'FFFFFFFF' } },
    font: { color: { rgb: 'FF0F172A' }, sz: 10, bold: true },
    alignment: { vertical: 'center', horizontal: 'left' },
    border: {
      top: { style: 'thin', color: { rgb: EXCEL_BORDER } },
      bottom: { style: 'thin', color: { rgb: EXCEL_BORDER } },
      left: { style: 'thin', color: { rgb: EXCEL_BORDER } },
      right: { style: 'thin', color: { rgb: EXCEL_BORDER } }
    }
  };

  const buildSummarySheet = (
    title: string,
    metrics: Array<[string, string | number]>,
    extraInfo?: Array<[string, string | number]>
  ) => {
    const rows: Array<Array<string | number>> = [[title], []];
    const nowText = new Date().toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US');
    rows.push([lang === 'ar' ? 'تاريخ الاستخراج' : 'Generated At', nowText]);
    (extraInfo || []).forEach((r) => rows.push(r));
    rows.push([]);
    const tableHeaderIdx = rows.length;
    rows.push([lang === 'ar' ? 'البند' : 'Metric', lang === 'ar' ? 'القيمة' : 'Value']);
    metrics.forEach((m) => rows.push([m[0], m[1]]));

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 38 }, { wch: 28 }];
    ws['!rows'] = [{ hpt: 28 }];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

    styleRow(ws, 0, 0, 1, titleStyle);
    styleRow(ws, tableHeaderIdx, 0, 1, headerStyle);
    for (let r = tableHeaderIdx + 1; r < rows.length; r += 1) {
      styleCell(ws, r, 0, infoLabelStyle);
      styleCell(ws, r, 1, infoValueStyle);
    }
    for (let r = 2; r < tableHeaderIdx - 1; r += 1) {
      styleCell(ws, r, 0, infoLabelStyle);
      styleCell(ws, r, 1, bodyStyle);
    }
    return ws;
  };

  const buildTableSheet = (
    title: string,
    headers: string[],
    rows: Array<Array<string | number>>,
    widths: number[]
  ) => {
    const allRows: Array<Array<string | number>> = [[title], [], headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(allRows);
    ws['!cols'] = widths.map((w) => ({ wch: w }));
    ws['!rows'] = [{ hpt: 28 }];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
    ws['!autofilter'] = { ref: `A3:${XLSX.utils.encode_col(headers.length - 1)}3` };

    styleRow(ws, 0, 0, headers.length - 1, titleStyle);
    styleRow(ws, 2, 0, headers.length - 1, headerStyle);
    for (let r = 3; r < allRows.length; r += 1) {
      for (let c = 0; c < headers.length; c += 1) styleCell(ws, r, c, bodyStyle);
    }
    return ws;
  };

  const exportProductCardExcel = () => {
    if (!productCardReport) return;

    const summaryMetrics: Array<[string, string | number]> = [
      [lang === 'ar' ? 'اسم المنتج' : 'Product Name', productCardReport.product.name || '-'],
      [lang === 'ar' ? 'الفئة' : 'Category', productCardReport.product.categoryName || '-'],
      [lang === 'ar' ? 'الفئة الفرعية' : 'Subcategory', productCardReport.product.subCategoryName || '-'],
      [lang === 'ar' ? 'الوحدة' : 'Unit', productCardReport.product.unit || selectedProduct?.unit || '-'],
      [lang === 'ar' ? 'إجمالي الطلبات' : 'Total Requests', productCardReport.totalLines || 0],
      [lang === 'ar' ? 'إجمالي الأوامر' : 'Total Orders', productCardReport.totalOrders || 0],
      [lang === 'ar' ? 'إجمالي المبيعات' : 'Total Sales', `${Number(productCardReport.totalSalesAmount || 0).toFixed(2)} EGP`]
    ];

    const ordersRows = (productCardReport.lines || []).map((line, idx) => ([
      idx + 1,
      line.orderNumber || line.orderId || '-',
      line.customerOrganizationName || line.customerName || line.customerOwnerId || '-',
      `${line.quantity ?? '-'} ${line.unit || productCardReport.product.unit || ''}`.trim(),
      statusLabel(line.status)
    ]));

    const statusRows = (sortedProductStatusRows || []).map(([status, count]) => ([
      statusLabel(status),
      count || 0
    ]));

    const wb = XLSX.utils.book_new();
    const summarySheet = buildSummarySheet(
      lang === 'ar' ? 'تقرير كارت صنف' : 'Product Card Report',
      summaryMetrics
    );
    const ordersSheet = buildTableSheet(
      lang === 'ar' ? 'تفاصيل الطلبات' : 'Orders Details',
      ['#', lang === 'ar' ? 'رقم الطلب' : 'Order #', lang === 'ar' ? 'العميل' : 'Customer', lang === 'ar' ? 'الكمية' : 'Qty', lang === 'ar' ? 'الحالة' : 'Status'],
      ordersRows.length ? ordersRows : [[0, '-', '-', '-', '-']],
      [8, 22, 38, 18, 18]
    );
    const statusSheet = buildTableSheet(
      lang === 'ar' ? 'توزيع الحالات' : 'Status Distribution',
      [lang === 'ar' ? 'الحالة' : 'Status', lang === 'ar' ? 'العدد' : 'Count'],
      statusRows.length ? statusRows : [['-', 0]],
      [34, 14]
    );

    XLSX.utils.book_append_sheet(wb, summarySheet, lang === 'ar' ? 'ملخص' : 'Summary');
    XLSX.utils.book_append_sheet(wb, ordersSheet, lang === 'ar' ? 'الطلبات' : 'Orders');
    XLSX.utils.book_append_sheet(wb, statusSheet, lang === 'ar' ? 'الحالات' : 'Statuses');

    const safeName = (productCardReport.product.name || 'product').replace(/[^\w\u0600-\u06FF-]+/g, '_');
    XLSX.writeFile(wb, `product-card-${safeName}.xlsx`);
  };

  const exportSalesExcel = () => {
    if (!salesReport) return;

    const monthInfo = salesMonthValue
      ? (lang === 'ar' ? salesMonthValue : salesMonthValue)
      : (lang === 'ar' ? 'كل الشهور' : 'All months');

    const summaryMetrics: Array<[string, string | number]> = [
      [lang === 'ar' ? 'إجمالي الطلبات' : 'Total Requests', totalSalesRequests],
      [lang === 'ar' ? 'الطلبات المكتملة' : 'Completed Requests', completedRequests],
      [lang === 'ar' ? 'الطلبات المفتوحة' : 'Open Requests', openRequests],
      [lang === 'ar' ? 'الطلبات الملغية/المرفوضة' : 'Cancelled/Rejected', cancelledRequests],
      [lang === 'ar' ? 'معدل الإكمال' : 'Completion Rate', `${completionRate.toFixed(1)}%`],
      [lang === 'ar' ? 'متوسط قيمة الطلب المكتمل' : 'Avg Completed Value', `${avgCompletedValue.toFixed(2)} EGP`],
      [lang === 'ar' ? 'إجمالي المبيعات' : 'Total Sales', `${totalSalesAmount.toFixed(2)} EGP`],
      [lang === 'ar' ? 'أعلى منتج' : 'Top Product', salesReport.topProduct?.productName || '-'],
      [lang === 'ar' ? 'عدد طلبات أعلى منتج' : 'Top Product Requests', salesReport.topProduct?.requestedCount || 0],
      [lang === 'ar' ? 'أعلى عميل' : 'Top Customer', salesReport.topCustomer?.customerOrganizationName || salesReport.topCustomer?.customerName || salesReport.topCustomer?.customerOwnerId || '-'],
      [lang === 'ar' ? 'عدد طلبات أعلى عميل' : 'Top Customer Requests', salesReport.topCustomer?.requestedCount || 0]
    ];

    const overallRows = sortedOverallStatusRows.map(([status, count]) => [
      statusLabel(status),
      count || 0,
      `${totalSalesRequests > 0 ? ((count / totalSalesRequests) * 100).toFixed(1) : '0.0'}%`
    ]);

    const topProductRows = Object.entries(salesReport.topProduct?.statusCounts || {}).map(([status, count]) => [
      statusLabel(status),
      count || 0
    ]);

    const topCustomerRows = Object.entries(salesReport.topCustomer?.statusCounts || {}).map(([status, count]) => [
      statusLabel(status),
      count || 0
    ]);

    const topProductName = salesReport.topProduct?.productName || '-';
    const topCustomerName = salesReport.topCustomer?.customerOrganizationName
      || salesReport.topCustomer?.customerName
      || salesReport.topCustomer?.customerOwnerId
      || '-';

    const wb = XLSX.utils.book_new();
    const summarySheet = buildSummarySheet(
      lang === 'ar' ? 'تقرير المبيعات' : 'Sales Report',
      summaryMetrics,
      [[lang === 'ar' ? 'فلتر الشهر' : 'Month Filter', monthInfo]]
    );
    const overallSheet = buildTableSheet(
      lang === 'ar' ? 'توزيع الحالات' : 'Overall Status Distribution',
      [lang === 'ar' ? 'الحالة' : 'Status', lang === 'ar' ? 'العدد' : 'Count', lang === 'ar' ? 'النسبة' : 'Share'],
      overallRows.length ? overallRows : [['-', 0, '0.0%']],
      [34, 14, 14]
    );
    const topProductSheet = buildTableSheet(
      lang === 'ar' ? `حالات أعلى منتج: ${topProductName}` : `Top Product Status: ${topProductName}`,
      [lang === 'ar' ? 'الحالة' : 'Status', lang === 'ar' ? 'العدد' : 'Count'],
      topProductRows.length ? topProductRows : [['-', 0]],
      [34, 14]
    );
    const topCustomerSheet = buildTableSheet(
      lang === 'ar' ? `حالات أعلى عميل: ${topCustomerName}` : `Top Customer Status: ${topCustomerName}`,
      [lang === 'ar' ? 'الحالة' : 'Status', lang === 'ar' ? 'العدد' : 'Count'],
      topCustomerRows.length ? topCustomerRows : [['-', 0]],
      [34, 14]
    );

    XLSX.utils.book_append_sheet(wb, summarySheet, lang === 'ar' ? 'ملخص' : 'Summary');
    XLSX.utils.book_append_sheet(wb, overallSheet, lang === 'ar' ? 'التوزيع' : 'Distribution');
    XLSX.utils.book_append_sheet(wb, topProductSheet, lang === 'ar' ? 'حالات_المنتج' : 'TopProductStatus');
    XLSX.utils.book_append_sheet(wb, topCustomerSheet, lang === 'ar' ? 'حالات_العميل' : 'TopCustomerStatus');

    XLSX.writeFile(wb, 'sales-report.xlsx');
  };

  const exportInsightsExcel = () => {
    if (!insightsReport || !selectedReport) return;
    const wb = XLSX.utils.book_new();

    if (selectedReport === 'monthly-trend') {
      const ws = buildTableSheet(
        lang === 'ar' ? 'اتجاه المبيعات الشهري (آخر 6 شهور)' : 'Monthly Sales Trend (Last 6 Months)',
        [lang === 'ar' ? 'الشهر' : 'Month', lang === 'ar' ? 'إجمالي الطلبات' : 'Total Requests', lang === 'ar' ? 'المكتمل' : 'Completed', lang === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'],
        (insightsReport.monthlyTrend || []).map((m) => [m.monthKey, m.totalRequests || 0, m.completedRequests || 0, `${Number(m.totalSalesAmount || 0).toFixed(2)} EGP`]),
        [18, 18, 14, 18]
      );
      XLSX.utils.book_append_sheet(wb, ws, lang === 'ar' ? 'اتجاه_شهري' : 'MonthlyTrend');
      XLSX.writeFile(wb, 'monthly-trend-report.xlsx');
      return;
    }

    if (selectedReport === 'tops-overview') {
      const topProductsWs = buildTableSheet(
        lang === 'ar' ? 'أفضل 5 منتجات' : 'Top 5 Products',
        [lang === 'ar' ? 'المنتج' : 'Product', lang === 'ar' ? 'عدد الطلبات' : 'Requests', lang === 'ar' ? 'المبيعات' : 'Sales'],
        (insightsReport.topProducts || []).map((p) => [p.productName || '-', p.requestedCount || 0, `${Number(p.totalSalesAmount || 0).toFixed(2)} EGP`]),
        [34, 16, 18]
      );
      const topCustomersWs = buildTableSheet(
        lang === 'ar' ? 'أفضل 5 عملاء' : 'Top 5 Customers',
        [lang === 'ar' ? 'العميل' : 'Customer', lang === 'ar' ? 'عدد الطلبات' : 'Requests', lang === 'ar' ? 'المبيعات' : 'Sales'],
        (insightsReport.topCustomers || []).map((c) => [c.customerName || '-', c.requestedCount || 0, `${Number(c.totalSalesAmount || 0).toFixed(2)} EGP`]),
        [34, 16, 18]
      );
      XLSX.utils.book_append_sheet(wb, topProductsWs, lang === 'ar' ? 'أفضل_منتجات' : 'TopProducts');
      XLSX.utils.book_append_sheet(wb, topCustomersWs, lang === 'ar' ? 'أفضل_عملاء' : 'TopCustomers');
      XLSX.writeFile(wb, 'tops-overview-report.xlsx');
      return;
    }

    if (selectedReport === 'deep-insights') {
      const monthlyWs = buildTableSheet(
        lang === 'ar' ? 'اتجاه شهري' : 'Monthly Trend',
        [lang === 'ar' ? 'الشهر' : 'Month', lang === 'ar' ? 'إجمالي الطلبات' : 'Total Requests', lang === 'ar' ? 'المكتمل' : 'Completed', lang === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'],
        (insightsReport.monthlyTrend || []).map((m) => [m.monthKey, m.totalRequests || 0, m.completedRequests || 0, `${Number(m.totalSalesAmount || 0).toFixed(2)} EGP`]),
        [18, 18, 14, 18]
      );
      const productsWs = buildTableSheet(
        lang === 'ar' ? 'أفضل 5 منتجات' : 'Top 5 Products',
        [lang === 'ar' ? 'المنتج' : 'Product', lang === 'ar' ? 'عدد الطلبات' : 'Requests', lang === 'ar' ? 'المبيعات' : 'Sales'],
        (insightsReport.topProducts || []).map((p) => [p.productName || '-', p.requestedCount || 0, `${Number(p.totalSalesAmount || 0).toFixed(2)} EGP`]),
        [34, 16, 18]
      );
      const customersWs = buildTableSheet(
        lang === 'ar' ? 'أفضل 5 عملاء' : 'Top 5 Customers',
        [lang === 'ar' ? 'العميل' : 'Customer', lang === 'ar' ? 'عدد الطلبات' : 'Requests', lang === 'ar' ? 'المبيعات' : 'Sales'],
        (insightsReport.topCustomers || []).map((c) => [c.customerName || '-', c.requestedCount || 0, `${Number(c.totalSalesAmount || 0).toFixed(2)} EGP`]),
        [34, 16, 18]
      );
      const statusWs = buildTableSheet(
        lang === 'ar' ? 'توزيع الحالات' : 'Status Distribution',
        [lang === 'ar' ? 'الحالة' : 'Status', lang === 'ar' ? 'العدد' : 'Count', lang === 'ar' ? 'النسبة' : 'Share'],
        (insightsReport.statusDistribution || []).map((s) => [statusLabel(s.status), s.count || 0, `${Number(s.percentage || 0).toFixed(1)}%`]),
        [34, 14, 14]
      );
      const bucketsWs = buildTableSheet(
        lang === 'ar' ? 'شرائح القيمة' : 'Value Buckets',
        [lang === 'ar' ? 'الشريحة' : 'Bucket', lang === 'ar' ? 'العدد' : 'Count', lang === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'],
        (insightsReport.completedOrderValueBuckets || []).map((b) => [b.bucketLabel || '-', b.count || 0, `${Number(b.totalSalesAmount || 0).toFixed(2)} EGP`]),
        [26, 14, 18]
      );
      XLSX.utils.book_append_sheet(wb, monthlyWs, lang === 'ar' ? 'اتجاه_شهري' : 'MonthlyTrend');
      XLSX.utils.book_append_sheet(wb, productsWs, lang === 'ar' ? 'أفضل_منتجات' : 'TopProducts');
      XLSX.utils.book_append_sheet(wb, customersWs, lang === 'ar' ? 'أفضل_عملاء' : 'TopCustomers');
      XLSX.utils.book_append_sheet(wb, statusWs, lang === 'ar' ? 'توزيع_الحالات' : 'StatusDistribution');
      XLSX.utils.book_append_sheet(wb, bucketsWs, lang === 'ar' ? 'شرائح_القيمة' : 'ValueBuckets');
      XLSX.writeFile(wb, 'deep-insights-report.xlsx');
      return;
    }

    if (selectedReport === 'status-distribution') {
      const ws = buildTableSheet(
        lang === 'ar' ? 'توزيع الحالات' : 'Status Distribution',
        [lang === 'ar' ? 'الحالة' : 'Status', lang === 'ar' ? 'العدد' : 'Count', lang === 'ar' ? 'النسبة' : 'Share'],
        (insightsReport.statusDistribution || []).map((s) => [statusLabel(s.status), s.count || 0, `${Number(s.percentage || 0).toFixed(1)}%`]),
        [34, 14, 14]
      );
      XLSX.utils.book_append_sheet(wb, ws, lang === 'ar' ? 'توزيع_الحالات' : 'StatusDistribution');
      XLSX.writeFile(wb, 'status-distribution-report.xlsx');
      return;
    }

    const ws = buildTableSheet(
      lang === 'ar' ? 'شرائح قيمة الطلبات المكتملة' : 'Completed Order Value Buckets',
      [lang === 'ar' ? 'الشريحة' : 'Bucket', lang === 'ar' ? 'العدد' : 'Count', lang === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'],
      (insightsReport.completedOrderValueBuckets || []).map((b) => [b.bucketLabel || '-', b.count || 0, `${Number(b.totalSalesAmount || 0).toFixed(2)} EGP`]),
      [26, 14, 18]
    );
    XLSX.utils.book_append_sheet(wb, ws, lang === 'ar' ? 'شرائح_القيمة' : 'ValueBuckets');
    XLSX.writeFile(wb, 'value-buckets-report.xlsx');
  };

  const handleExportExcel = () => {
    if (selectedReport === 'product-card') {
      exportProductCardExcel();
      return;
    }
    if (selectedReport === 'sales-report') {
      exportSalesExcel();
      return;
    }
    exportInsightsExcel();
  };

  if (isCheckingAccess) {
    return (
      <div className="w-full py-10 flex items-center justify-center">
        <div className="size-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <FeatureUpgradePrompt
        lang={lang}
        featureLabel={lang === 'ar' ? 'التقارير المتقدمة' : 'Advanced Reports'}
        description={lang === 'ar' ? 'لتفعيل شاشة التقارير المتقدمة والتفاصيل الكاملة، يرجى ترقية باقة اشتراكك.' : 'Upgrade your subscription to access advanced reports and detailed analytics.'}
        onUpgrade={() => navigate('/subscription')}
      />
    );
  }

  const canExportProductCard = selectedReport === 'product-card' && !!productCardReport && !isLoadingProductCardReport;
  const canExportSales = selectedReport === 'sales-report' && !!salesReport && !isLoadingSalesReport;
  const isInsightsType = selectedReport === 'monthly-trend'
    || selectedReport === 'tops-overview'
    || selectedReport === 'deep-insights'
    || selectedReport === 'status-distribution'
    || selectedReport === 'value-buckets';
  const canExportInsights = !!insightsReport && !isLoadingInsightsReport && !!isInsightsType;

  return (
    <div className="w-full py-6 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            onClick={() => onSelectReport('product-card')}
            className={`p-4 rounded-2xl border text-center transition-all ${
              selectedReport === 'product-card'
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-slate-200 dark:border-slate-700 hover:border-primary/40'
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-2">
              <div className={`size-11 rounded-xl flex items-center justify-center ${selectedReport === 'product-card' ? 'bg-primary text-white' : 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-300'}`}>
                <span className="material-symbols-outlined text-[21px]">inventory_2</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-800 dark:text-slate-100">{lang === 'ar' ? 'كارت صنف' : 'Product Card'}</p>
                <p className="text-[11px] font-bold text-slate-500 line-clamp-2">
                  {lang === 'ar' ? 'تفاصيل الصنف والطلبات المرتبطة به' : 'Detailed product request activity'}
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelectReport('sales-report')}
            className={`p-4 rounded-2xl border text-center transition-all ${
              selectedReport === 'sales-report'
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-slate-200 dark:border-slate-700 hover:border-primary/40'
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-2">
              <div className={`size-11 rounded-xl flex items-center justify-center ${selectedReport === 'sales-report' ? 'bg-primary text-white' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300'}`}>
                <span className="material-symbols-outlined text-[21px]">payments</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-800 dark:text-slate-100">{lang === 'ar' ? 'تقرير المبيعات' : 'Sales Report'}</p>
                <p className="text-[11px] font-bold text-slate-500 line-clamp-2">
                  {lang === 'ar' ? 'تحليل تفصيلي للمبيعات وحالات الطلبات' : 'Detailed sales and status analysis'}
                </p>
              </div>
            </div>
          </button>

          <button onClick={() => onSelectReport('monthly-trend')} className={`p-4 rounded-2xl border text-center transition-all ${selectedReport === 'monthly-trend' ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-200 dark:border-slate-700 hover:border-primary/40'}`}>
            <div className="flex flex-col items-center justify-center gap-2">
              <div className={`size-11 rounded-xl flex items-center justify-center ${selectedReport === 'monthly-trend' ? 'bg-primary text-white' : 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300'}`}>
                <span className="material-symbols-outlined text-[21px]">query_stats</span>
              </div>
              <p className="text-sm font-black text-slate-800 dark:text-slate-100">{lang === 'ar' ? 'اتجاه شهري' : 'Monthly Trend'}</p>
              <p className="text-[11px] font-bold text-slate-500 line-clamp-2">{lang === 'ar' ? 'اتجاه الطلبات والمبيعات عبر الشهور' : 'Requests and sales trend across months'}</p>
            </div>
          </button>

          <button onClick={() => onSelectReport('tops-overview')} className={`p-4 rounded-2xl border text-center transition-all ${selectedReport === 'tops-overview' ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-200 dark:border-slate-700 hover:border-primary/40'}`}>
            <div className="flex flex-col items-center justify-center gap-2">
              <div className={`size-11 rounded-xl flex items-center justify-center ${selectedReport === 'tops-overview' ? 'bg-primary text-white' : 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-900/20 dark:text-fuchsia-300'}`}>
                <span className="material-symbols-outlined text-[21px]">trophy</span>
              </div>
              <p className="text-sm font-black text-slate-800 dark:text-slate-100">{lang === 'ar' ? 'أفضل المنتجات والعملاء' : 'Top Products & Customers'}</p>
              <p className="text-[11px] font-bold text-slate-500 line-clamp-2">{lang === 'ar' ? 'دمج أفضل 5 منتجات + أفضل 5 عملاء' : 'Merged top 5 products + top 5 customers'}</p>
            </div>
          </button>

          <button onClick={() => onSelectReport('deep-insights')} className={`p-4 rounded-2xl border text-center transition-all ${selectedReport === 'deep-insights' ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-200 dark:border-slate-700 hover:border-primary/40'}`}>
            <div className="flex flex-col items-center justify-center gap-2">
              <div className={`size-11 rounded-xl flex items-center justify-center ${selectedReport === 'deep-insights' ? 'bg-primary text-white' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300'}`}>
                <span className="material-symbols-outlined text-[21px]">insights</span>
              </div>
              <p className="text-sm font-black text-slate-800 dark:text-slate-100">{lang === 'ar' ? 'تقرير شامل مفصل' : 'Deep Insights Report'}</p>
              <p className="text-[11px] font-bold text-slate-500 line-clamp-2">{lang === 'ar' ? 'اتجاه + أفضل أداء + حالات + شرائح القيم' : 'Trend + tops + statuses + value buckets'}</p>
            </div>
          </button>

          <button onClick={() => onSelectReport('status-distribution')} className={`p-4 rounded-2xl border text-center transition-all ${selectedReport === 'status-distribution' ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-200 dark:border-slate-700 hover:border-primary/40'}`}>
            <div className="flex flex-col items-center justify-center gap-2">
              <div className={`size-11 rounded-xl flex items-center justify-center ${selectedReport === 'status-distribution' ? 'bg-primary text-white' : 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-300'}`}>
                <span className="material-symbols-outlined text-[21px]">pie_chart</span>
              </div>
              <p className="text-sm font-black text-slate-800 dark:text-slate-100">{lang === 'ar' ? 'توزيع الحالات' : 'Status Distribution'}</p>
              <p className="text-[11px] font-bold text-slate-500 line-clamp-2">{lang === 'ar' ? 'نِسب كل حالات الطلبات' : 'Percentages of all request statuses'}</p>
            </div>
          </button>

          <button onClick={() => onSelectReport('value-buckets')} className={`p-4 rounded-2xl border text-center transition-all ${selectedReport === 'value-buckets' ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-200 dark:border-slate-700 hover:border-primary/40'}`}>
            <div className="flex flex-col items-center justify-center gap-2">
              <div className={`size-11 rounded-xl flex items-center justify-center ${selectedReport === 'value-buckets' ? 'bg-primary text-white' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300'}`}>
                <span className="material-symbols-outlined text-[21px]">stacked_bar_chart</span>
              </div>
              <p className="text-sm font-black text-slate-800 dark:text-slate-100">{lang === 'ar' ? 'شرائح القيم' : 'Value Buckets'}</p>
              <p className="text-[11px] font-bold text-slate-500 line-clamp-2">{lang === 'ar' ? 'تحليل الطلبات المكتملة حسب القيمة' : 'Completed orders by value ranges'}</p>
            </div>
          </button>
        </div>
      </div>

      {!selectedReport && (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">analytics</span>
          <p className="mt-3 text-sm md:text-base font-black text-slate-500">
            {lang === 'ar' ? 'اختر تقرير لعرض التفاصيل' : 'Select a report to display details'}
          </p>
        </div>
      )}

      <div ref={reportBodyRef} className="scroll-mt-28" />

      {selectedReport && isMobileSheetOpen && (
        <div className="md:hidden fixed inset-0 z-[180]">
          <button
            type="button"
            onClick={closeMobileSheet}
            className="absolute inset-0 bg-slate-900/45"
            aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
          />
        </div>
      )}

      <div
        className={`${
          !selectedReport
            ? 'hidden'
            : isMobileSheetOpen
              ? 'block'
              : 'hidden md:block'
        } md:block md:static fixed inset-x-0 bottom-0 z-[190] md:z-auto md:bg-transparent bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-none shadow-2xl md:shadow-none border-t border-x border-primary/20 md:border-0 max-h-[88vh] md:max-h-none overflow-hidden md:overflow-visible`}
        style={selectedReport ? { transform: `translateY(${sheetDragY}px)` } : undefined}
      >
        <div
          className="md:hidden pt-3 pb-2 flex justify-center shrink-0 cursor-grab active:cursor-grabbing"
          onTouchStart={onSheetTouchStart}
          onTouchMove={onSheetTouchMove}
          onTouchEnd={onSheetTouchEnd}
        >
          <div className="w-14 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>
        <div className="md:hidden px-4 pb-2 flex justify-end">
          <button
            type="button"
            onClick={closeMobileSheet}
            className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-black text-slate-500 dark:text-slate-300"
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
        <div className="px-4 md:px-0 pb-4 md:pb-0 overflow-y-auto md:overflow-visible max-h-[80vh] md:max-h-none space-y-5">
      {selectedReport === 'product-card' && (
        <>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-5 space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-end">
              <Dropdown
                label={lang === 'ar' ? 'اختر المنتج' : 'Select product'}
                options={productOptions}
                value={selectedProductId}
                onChange={setSelectedProductId}
                placeholder={lang === 'ar' ? 'اختر منتجاً' : 'Select product'}
                disabled={isLoadingProducts}
                searchable
                searchPlaceholder={lang === 'ar' ? 'ابحث باسم المنتج...' : 'Search by product name...'}
                noResultsText={lang === 'ar' ? 'لا يوجد نتائج' : 'No matching products'}
                showClear={false}
                isRtl={lang === 'ar'}
                wrapperClassName="space-y-1.5"
                triggerClassName="w-full min-h-[44px] flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl pl-4 pr-10 rtl:pl-10 rtl:pr-4 py-3 text-sm font-bold outline-none focus:border-primary transition-all text-slate-900 dark:text-white cursor-pointer text-start disabled:cursor-not-allowed disabled:opacity-40"
              />

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { void loadProductCardReport(); }}
                  disabled={!selectedProductId || isLoadingProductCardReport}
                  className="h-11 px-4 rounded-xl bg-primary text-white text-xs md:text-sm font-black disabled:opacity-50"
                >
                  {lang === 'ar' ? 'عرض التقرير' : 'Generate'}
                </button>
                <button onClick={handleExportExcel} disabled={!canExportProductCard} className="h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs md:text-sm font-black disabled:opacity-50">Excel</button>
              </div>
            </div>
          </div>

          {isLoadingProductCardReport ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <div className="size-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-3" />
              <p className="text-xs font-black text-slate-400">{lang === 'ar' ? 'جاري تحميل التقرير...' : 'Loading report...'}</p>
            </div>
          ) : productCardReport ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="size-20 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800">
                    {productCardReport.product.image ? (
                      <img src={productCardReport.product.image} alt={productCardReport.product.name} className="size-full object-cover" />
                    ) : (
                      <div className="size-full flex items-center justify-center"><span className="material-symbols-outlined text-slate-400 text-2xl">inventory_2</span></div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">{productCardReport.product.name}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] md:text-xs font-black text-slate-600 dark:text-slate-300">
                        {lang === 'ar' ? 'الفئة' : 'Category'}: {productCardReport.product.categoryName || '-'}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] md:text-xs font-black text-slate-600 dark:text-slate-300">
                        {lang === 'ar' ? 'الفئة الفرعية' : 'Subcategory'}: {productCardReport.product.subCategoryName || '-'}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] md:text-xs font-black text-slate-600 dark:text-slate-300">
                        {lang === 'ar' ? 'الوحدة' : 'Unit'}: {productCardReport.product.unit || selectedProduct?.unit || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-3"><p className="text-[10px] md:text-[11px] font-black text-slate-500">{lang === 'ar' ? 'إجمالي الطلبات' : 'Total Requests'}</p><p className="text-lg md:text-xl font-black text-primary tabular-nums">{productCardReport.totalLines || 0}</p></div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3"><p className="text-[10px] md:text-[11px] font-black text-slate-500">{lang === 'ar' ? 'إجمالي الأوامر' : 'Total Orders'}</p><p className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-200 tabular-nums">{productCardReport.totalOrders || 0}</p></div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3"><p className="text-[10px] md:text-[11px] font-black text-slate-500">{lang === 'ar' ? 'المخزون' : 'Stock'}</p><p className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-200 tabular-nums">{productCardReport.product.stockQuantity ?? '-'}</p></div>
                  <div className="rounded-xl bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3"><p className="text-[10px] md:text-[11px] font-black text-slate-500">{lang === 'ar' ? 'مبيعات التطبيق' : 'App Sales'}</p><p className="text-sm md:text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{Number(productCardReport.totalSalesAmount || 0).toFixed(2)} EGP</p></div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <p className="text-xs md:text-sm font-black text-slate-500 mb-2">{lang === 'ar' ? 'توزيع حالات الطلبات' : 'Order Status Distribution'}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {sortedProductStatusRows.map(([status, count]) => (
                    <div key={status} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                      <p className="text-xs md:text-sm font-black text-slate-700 dark:text-slate-200">{statusLabel(status)}</p>
                      <p className="text-base md:text-lg font-black text-primary tabular-nums mt-1">{count || 0}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <p className="text-xs md:text-sm font-black text-slate-600 dark:text-slate-300">{lang === 'ar' ? 'تفاصيل كل الطلبات على الصنف' : 'Detailed Requests for Product'}</p>
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[720px]">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th className="text-start px-4 py-3 text-xs font-black text-slate-500">#</th>
                        <th className="text-start px-4 py-3 text-xs font-black text-slate-500">{lang === 'ar' ? 'رقم الطلب' : 'Order #'}</th>
                        <th className="text-start px-4 py-3 text-xs font-black text-slate-500">{lang === 'ar' ? 'العميل' : 'Customer'}</th>
                        <th className="text-start px-4 py-3 text-xs font-black text-slate-500">{lang === 'ar' ? 'الكمية' : 'Quantity'}</th>
                        <th className="text-start px-4 py-3 text-xs font-black text-slate-500">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productCardReport.lines.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center text-sm font-bold text-slate-400">
                            {lang === 'ar' ? 'لا توجد طلبات على هذا الصنف' : 'No requests found for this product'}
                          </td>
                        </tr>
                      ) : productCardReport.lines.map((line, idx) => (
                        <tr key={line.lineId} className="border-b last:border-b-0 border-slate-100 dark:border-slate-800">
                          <td className="px-4 py-3 text-xs font-black text-slate-500 tabular-nums">{idx + 1}</td>
                          <td className="px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200">{line.orderNumber || line.orderId || '-'}</td>
                          <td className="px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200">{line.customerOrganizationName || line.customerName || line.customerOwnerId || '-'}</td>
                          <td className="px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200 tabular-nums">{line.quantity ?? '-'} {line.unit || productCardReport.product.unit || ''}</td>
                          <td className="px-4 py-3 text-xs font-black text-primary">{statusLabel(line.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden p-3 space-y-2">
                  {productCardReport.lines.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-5 text-center text-xs font-bold text-slate-400">
                      {lang === 'ar' ? 'لا توجد طلبات على هذا الصنف' : 'No requests found for this product'}
                    </div>
                  ) : productCardReport.lines.map((line, idx) => (
                    <div key={line.lineId} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-black text-slate-500">#{idx + 1}</p>
                        <span className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-black">
                          {statusLabel(line.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-black text-slate-800 dark:text-slate-100 break-words">
                        {line.orderNumber || line.orderId || '-'}
                      </p>
                      <p className="mt-1 text-[11px] font-bold text-slate-500">{lang === 'ar' ? 'العميل' : 'Customer'}</p>
                      <p className="text-xs font-black text-slate-700 dark:text-slate-200 break-words">
                        {line.customerOrganizationName || line.customerName || line.customerOwnerId || '-'}
                      </p>
                      <p className="mt-2 text-[11px] font-bold text-slate-500">{lang === 'ar' ? 'الكمية' : 'Quantity'}</p>
                      <p className="text-xs font-black text-slate-700 dark:text-slate-200">
                        {line.quantity ?? '-'} {line.unit || productCardReport.product.unit || ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center text-slate-400 text-sm font-bold">
              {lang === 'ar' ? 'اختَر منتجًا ثم اضغط عرض التقرير' : 'Choose a product then click Generate'}
            </div>
          )}
        </>
      )}

      {selectedReport === 'sales-report' && (
        <>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-5">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
              <div className="w-full lg:w-auto">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="month"
                    value={salesMonthValue}
                    onChange={(e) => setSalesMonthValue(e.target.value)}
                    className="h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs md:text-sm font-black text-slate-700 dark:text-slate-200 outline-none focus:border-primary w-[180px]"
                  />
                  <button
                    onClick={() => { void loadSalesReport(salesMonthValue); }}
                    disabled={isLoadingSalesReport}
                    className="h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs md:text-sm font-black text-slate-700 dark:text-slate-200 disabled:opacity-50"
                  >
                    {lang === 'ar' ? 'تطبيق' : 'Apply'}
                  </button>
                  <button
                    onClick={() => {
                      setSalesMonthValue('');
                      void loadSalesReport('');
                    }}
                    disabled={isLoadingSalesReport}
                    className="h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs md:text-sm font-black text-slate-700 dark:text-slate-200 disabled:opacity-50"
                  >
                    {lang === 'ar' ? 'الكل' : 'All'}
                  </button>
                  <button onClick={handleExportExcel} disabled={!canExportSales} className="h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs md:text-sm font-black disabled:opacity-50">Excel</button>
                </div>
              </div>
            </div>
          </div>

          {isLoadingSalesReport ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <div className="size-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-3" />
              <p className="text-xs font-black text-slate-400">{lang === 'ar' ? 'جاري تحميل التقرير...' : 'Loading report...'}</p>
            </div>
          ) : salesReport ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-6">
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5">
                  <div className="rounded-xl bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3"><p className="text-[10px] md:text-[11px] font-black text-slate-500">{lang === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}</p><p className="text-sm md:text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{totalSalesAmount.toFixed(2)} EGP</p></div>
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-3"><p className="text-[10px] md:text-[11px] font-black text-slate-500">{lang === 'ar' ? 'إجمالي الطلبات' : 'Total Requests'}</p><p className="text-lg md:text-xl font-black text-primary tabular-nums">{totalSalesRequests}</p></div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3"><p className="text-[10px] md:text-[11px] font-black text-slate-500">{lang === 'ar' ? 'مكتمل' : 'Completed'}</p><p className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-200 tabular-nums">{completedRequests}</p></div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3"><p className="text-[10px] md:text-[11px] font-black text-slate-500">{lang === 'ar' ? 'مفتوح' : 'Open'}</p><p className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-200 tabular-nums">{openRequests}</p></div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3"><p className="text-[10px] md:text-[11px] font-black text-slate-500">{lang === 'ar' ? 'ملغي/مرفوض' : 'Cancelled/Rejected'}</p><p className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-200 tabular-nums">{cancelledRequests}</p></div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3"><p className="text-[10px] md:text-[11px] font-black text-slate-500">{lang === 'ar' ? 'معدل الإكمال' : 'Completion Rate'}</p><p className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-200 tabular-nums">{completionRate.toFixed(1)}%</p></div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <p className="text-xs md:text-sm font-black text-slate-500 mb-2">{lang === 'ar' ? 'مؤشرات إضافية' : 'Additional Indicators'}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                    <p className="text-[10px] md:text-[11px] font-black text-slate-500">{lang === 'ar' ? 'متوسط قيمة الطلب المكتمل' : 'Avg Completed Request Value'}</p>
                    <p className="text-base md:text-lg font-black text-slate-800 dark:text-slate-200 tabular-nums mt-1">{avgCompletedValue.toFixed(2)} EGP</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                    <p className="text-[10px] md:text-[11px] font-black text-slate-500">{lang === 'ar' ? 'أكثر حالة تكرارًا' : 'Most Frequent Status'}</p>
                    <p className="text-base md:text-lg font-black text-slate-800 dark:text-slate-200 mt-1">{statusLabel(topStatus?.[0])}</p>
                    <p className="text-xs md:text-sm font-bold text-slate-500">{lang === 'ar' ? 'بعدد' : 'Count'}: {topStatus?.[1] || 0}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                    <p className="text-[10px] md:text-[11px] font-black text-slate-500">{lang === 'ar' ? 'عدد الحالات المختلفة' : 'Unique Statuses'}</p>
                    <p className="text-base md:text-lg font-black text-slate-800 dark:text-slate-200 tabular-nums mt-1">{uniqueStatusesCount}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <p className="text-xs md:text-sm font-black text-slate-500">{lang === 'ar' ? 'أعلى منتج' : 'Top Product'}</p>
                  <p className="mt-2 text-sm md:text-base font-black text-slate-800 dark:text-slate-200">{salesReport.topProduct?.productName || '-'}</p>
                  <p className="text-xs md:text-sm font-bold text-slate-500 mt-1">
                    {lang === 'ar' ? 'عدد الطلبات:' : 'Requested count:'} <span className="tabular-nums">{salesReport.topProduct?.requestedCount || 0}</span>
                    {' | '}
                    {lang === 'ar' ? 'النسبة:' : 'Share:'} <span className="tabular-nums">{topProductShare.toFixed(1)}%</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(salesReport.topProduct?.statusCounts || {}).map(([status, count]) => (
                      <span key={status} className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10px] md:text-[11px] font-black text-slate-700 dark:text-slate-200">
                        {statusLabel(status)}: <span className="text-primary tabular-nums">{count || 0}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <p className="text-xs md:text-sm font-black text-slate-500">{lang === 'ar' ? 'أعلى عميل' : 'Top Customer'}</p>
                  <p className="mt-2 text-sm md:text-base font-black text-slate-800 dark:text-slate-200">
                    {salesReport.topCustomer?.customerOrganizationName || salesReport.topCustomer?.customerName || salesReport.topCustomer?.customerOwnerId || (lang === 'ar' ? 'غير متاح' : 'Unavailable')}
                  </p>
                  <p className="text-xs md:text-sm font-bold text-slate-500 mt-1">
                    {lang === 'ar' ? 'عدد الطلبات:' : 'Requested count:'} <span className="tabular-nums">{salesReport.topCustomer?.requestedCount || 0}</span>
                    {' | '}
                    {lang === 'ar' ? 'النسبة:' : 'Share:'} <span className="tabular-nums">{topCustomerShare.toFixed(1)}%</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(salesReport.topCustomer?.statusCounts || {}).map(([status, count]) => (
                      <span key={status} className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10px] md:text-[11px] font-black text-slate-700 dark:text-slate-200">
                        {statusLabel(status)}: <span className="text-primary tabular-nums">{count || 0}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <p className="text-xs md:text-sm font-black text-slate-500 mb-2">{lang === 'ar' ? 'توزيع الطلبات حسب الحالة' : 'Requests Distribution by Status'}</p>
                <div className="space-y-2">
                  {sortedOverallStatusRows.map(([status, count]) => {
                    const pct = totalSalesRequests > 0 ? ((count / totalSalesRequests) * 100) : 0;
                    return (
                      <div key={status} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                        <div className="flex items-center justify-between gap-3 text-xs md:text-sm font-black">
                          <span className="text-slate-700 dark:text-slate-200">{statusLabel(status)}</span>
                          <span className="text-slate-500 tabular-nums">{count} ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center text-slate-400 text-sm font-bold">
              {lang === 'ar' ? 'اضغط تحديث لتحميل التقرير' : 'Click Refresh to load report'}
            </div>
          )}
        </>
      )}

      {isInsightsType && (
        <>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-5 flex items-center justify-end gap-2">
            <button onClick={() => { void loadInsightsReport(); }} disabled={isLoadingInsightsReport} className="h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs md:text-sm font-black disabled:opacity-50">
              {lang === 'ar' ? 'تحديث' : 'Refresh'}
            </button>
            <button onClick={handleExportExcel} disabled={!canExportInsights} className="h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs md:text-sm font-black disabled:opacity-50">Excel</button>
          </div>

          {isLoadingInsightsReport ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <div className="size-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mb-3" />
              <p className="text-xs font-black text-slate-400">{lang === 'ar' ? 'جاري تحميل التقرير...' : 'Loading report...'}</p>
            </div>
          ) : !insightsReport ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center text-slate-400 text-sm font-bold">
              {lang === 'ar' ? 'لا توجد بيانات متاحة' : 'No data available'}
            </div>
          ) : (
            <div className="space-y-4">
              {selectedReport === 'monthly-trend' && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <p className="text-sm font-black text-slate-700 dark:text-slate-200">{lang === 'ar' ? 'اتجاه الطلبات والمبيعات (آخر 6 شهور)' : 'Requests & Sales Trend (Last 6 Months)'}</p>
                  </div>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                      <thead><tr className="border-b border-slate-200 dark:border-slate-800"><th className="text-start px-4 py-3 text-xs font-black text-slate-500">{lang === 'ar' ? 'الشهر' : 'Month'}</th><th className="text-start px-4 py-3 text-xs font-black text-slate-500">{lang === 'ar' ? 'إجمالي الطلبات' : 'Total Requests'}</th><th className="text-start px-4 py-3 text-xs font-black text-slate-500">{lang === 'ar' ? 'المكتمل' : 'Completed'}</th><th className="text-start px-4 py-3 text-xs font-black text-slate-500">{lang === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}</th></tr></thead>
                      <tbody>
                        {(insightsReport.monthlyTrend || []).map((m) => (
                          <tr key={m.monthKey} className="border-b last:border-b-0 border-slate-100 dark:border-slate-800">
                            <td className="px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200">{m.monthKey}</td>
                            <td className="px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200 tabular-nums">{m.totalRequests || 0}</td>
                            <td className="px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200 tabular-nums">{m.completedRequests || 0}</td>
                            <td className="px-4 py-3 text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{Number(m.totalSalesAmount || 0).toFixed(2)} EGP</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden p-3 space-y-2">
                    {(insightsReport.monthlyTrend || []).map((m) => (
                      <div key={m.monthKey} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                        <p className="text-xs font-black text-slate-800 dark:text-slate-100">{m.monthKey}</p>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-[10px] font-black text-slate-500">{lang === 'ar' ? 'إجمالي' : 'Total'}</p>
                            <p className="text-xs font-black text-primary tabular-nums">{m.totalRequests || 0}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500">{lang === 'ar' ? 'مكتمل' : 'Completed'}</p>
                            <p className="text-xs font-black text-slate-700 dark:text-slate-200 tabular-nums">{m.completedRequests || 0}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500">{lang === 'ar' ? 'المبيعات' : 'Sales'}</p>
                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{Number(m.totalSalesAmount || 0).toFixed(2)} EGP</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedReport === 'tops-overview' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900">
                      <p className="text-[11px] font-black text-slate-500">{lang === 'ar' ? 'إجمالي طلبات أفضل المنتجات' : 'Top Products Requests Total'}</p>
                      <p className="text-lg font-black text-primary tabular-nums mt-1">
                        {(insightsReport.topProducts || []).reduce((s, p) => s + (p.requestedCount || 0), 0)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900">
                      <p className="text-[11px] font-black text-slate-500">{lang === 'ar' ? 'إجمالي طلبات أفضل العملاء' : 'Top Customers Requests Total'}</p>
                      <p className="text-lg font-black text-primary tabular-nums mt-1">
                        {(insightsReport.topCustomers || []).reduce((s, c) => s + (c.requestedCount || 0), 0)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900">
                      <p className="text-[11px] font-black text-slate-500">{lang === 'ar' ? 'إجمالي مبيعات القوائم الأفضل' : 'Top Lists Sales Total'}</p>
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
                        {(
                          (insightsReport.topProducts || []).reduce((s, p) => s + Number(p.totalSalesAmount || 0), 0)
                          + (insightsReport.topCustomers || []).reduce((s, c) => s + Number(c.totalSalesAmount || 0), 0)
                        ).toFixed(2)} EGP
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100">{lang === 'ar' ? 'أفضل 5 منتجات' : 'Top 5 Products'}</p>
                      <div className="mt-3 space-y-2">
                        {(insightsReport.topProducts || []).map((p, idx) => (
                          <div key={`${p.productId || p.productName || idx}`} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                            <p className="text-xs font-black text-slate-500">#{idx + 1}</p>
                            <p className="text-sm font-black text-slate-800 dark:text-slate-100 mt-1">{p.productName || '-'}</p>
                            <p className="text-xs font-bold text-slate-500 mt-1">{lang === 'ar' ? 'الطلبات:' : 'Requests:'} {p.requestedCount || 0}</p>
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">{lang === 'ar' ? 'المبيعات:' : 'Sales:'} {Number(p.totalSalesAmount || 0).toFixed(2)} EGP</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100">{lang === 'ar' ? 'أفضل 5 عملاء' : 'Top 5 Customers'}</p>
                      <div className="mt-3 space-y-2">
                        {(insightsReport.topCustomers || []).map((c, idx) => (
                          <div key={`${c.customerKey || c.customerName || idx}`} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                            <p className="text-xs font-black text-slate-500">#{idx + 1}</p>
                            <p className="text-sm font-black text-slate-800 dark:text-slate-100 mt-1">{c.customerName || '-'}</p>
                            <p className="text-xs font-bold text-slate-500 mt-1">{lang === 'ar' ? 'الطلبات:' : 'Requests:'} {c.requestedCount || 0}</p>
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">{lang === 'ar' ? 'المبيعات:' : 'Sales:'} {Number(c.totalSalesAmount || 0).toFixed(2)} EGP</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {selectedReport === 'deep-insights' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                      <p className="text-[11px] font-black text-slate-500">{lang === 'ar' ? 'عدد حالات الطلبات المختلفة' : 'Unique Request Statuses'}</p>
                      <p className="text-lg font-black text-primary tabular-nums mt-1">{(insightsReport.statusDistribution || []).length}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                      <p className="text-[11px] font-black text-slate-500">{lang === 'ar' ? 'طلبات آخر 6 شهور' : 'Requests in Last 6 Months'}</p>
                      <p className="text-lg font-black text-primary tabular-nums mt-1">
                        {(insightsReport.monthlyTrend || []).reduce((s, m) => s + (m.totalRequests || 0), 0)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                      <p className="text-[11px] font-black text-slate-500">{lang === 'ar' ? 'مبيعات آخر 6 شهور' : 'Sales in Last 6 Months'}</p>
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
                        {(insightsReport.monthlyTrend || []).reduce((s, m) => s + Number(m.totalSalesAmount || 0), 0).toFixed(2)} EGP
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                      <p className="text-[11px] font-black text-slate-500">{lang === 'ar' ? 'عدد شرائح القيمة' : 'Value Bucket Types'}</p>
                      <p className="text-lg font-black text-primary tabular-nums mt-1">{(insightsReport.completedOrderValueBuckets || []).length}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                        <p className="text-sm font-black text-slate-700 dark:text-slate-200">{lang === 'ar' ? 'أفضل 5 منتجات' : 'Top 5 Products'}</p>
                      </div>
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full min-w-[520px]">
                          <thead><tr className="border-b border-slate-200 dark:border-slate-800"><th className="text-start px-4 py-3 text-xs font-black text-slate-500">{lang === 'ar' ? 'المنتج' : 'Product'}</th><th className="text-start px-4 py-3 text-xs font-black text-slate-500">{lang === 'ar' ? 'الطلبات' : 'Requests'}</th><th className="text-start px-4 py-3 text-xs font-black text-slate-500">{lang === 'ar' ? 'المبيعات' : 'Sales'}</th></tr></thead>
                          <tbody>{(insightsReport.topProducts || []).map((p, idx) => (<tr key={`${p.productId || p.productName || idx}`} className="border-b last:border-b-0 border-slate-100 dark:border-slate-800"><td className="px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200">{p.productName || '-'}</td><td className="px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200 tabular-nums">{p.requestedCount || 0}</td><td className="px-4 py-3 text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{Number(p.totalSalesAmount || 0).toFixed(2)} EGP</td></tr>))}</tbody>
                        </table>
                      </div>
                      <div className="md:hidden p-3 space-y-2">
                        {(insightsReport.topProducts || []).map((p, idx) => (
                          <div key={`${p.productId || p.productName || idx}`} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                            <p className="text-[11px] font-black text-slate-500">#{idx + 1}</p>
                            <p className="text-sm font-black text-slate-800 dark:text-slate-100 mt-1 break-words">{p.productName || '-'}</p>
                            <div className="mt-2 flex items-center justify-between text-xs font-black">
                              <span className="text-slate-500">{lang === 'ar' ? 'الطلبات' : 'Requests'}</span>
                              <span className="text-primary tabular-nums">{p.requestedCount || 0}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs font-black">
                              <span className="text-slate-500">{lang === 'ar' ? 'المبيعات' : 'Sales'}</span>
                              <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">{Number(p.totalSalesAmount || 0).toFixed(2)} EGP</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                        <p className="text-sm font-black text-slate-700 dark:text-slate-200">{lang === 'ar' ? 'أفضل 5 عملاء' : 'Top 5 Customers'}</p>
                      </div>
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full min-w-[520px]">
                          <thead><tr className="border-b border-slate-200 dark:border-slate-800"><th className="text-start px-4 py-3 text-xs font-black text-slate-500">{lang === 'ar' ? 'العميل' : 'Customer'}</th><th className="text-start px-4 py-3 text-xs font-black text-slate-500">{lang === 'ar' ? 'الطلبات' : 'Requests'}</th><th className="text-start px-4 py-3 text-xs font-black text-slate-500">{lang === 'ar' ? 'المبيعات' : 'Sales'}</th></tr></thead>
                          <tbody>{(insightsReport.topCustomers || []).map((c, idx) => (<tr key={`${c.customerKey || c.customerName || idx}`} className="border-b last:border-b-0 border-slate-100 dark:border-slate-800"><td className="px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200">{c.customerName || '-'}</td><td className="px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200 tabular-nums">{c.requestedCount || 0}</td><td className="px-4 py-3 text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{Number(c.totalSalesAmount || 0).toFixed(2)} EGP</td></tr>))}</tbody>
                        </table>
                      </div>
                      <div className="md:hidden p-3 space-y-2">
                        {(insightsReport.topCustomers || []).map((c, idx) => (
                          <div key={`${c.customerKey || c.customerName || idx}`} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                            <p className="text-[11px] font-black text-slate-500">#{idx + 1}</p>
                            <p className="text-sm font-black text-slate-800 dark:text-slate-100 mt-1 break-words">{c.customerName || '-'}</p>
                            <div className="mt-2 flex items-center justify-between text-xs font-black">
                              <span className="text-slate-500">{lang === 'ar' ? 'الطلبات' : 'Requests'}</span>
                              <span className="text-primary tabular-nums">{c.requestedCount || 0}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs font-black">
                              <span className="text-slate-500">{lang === 'ar' ? 'المبيعات' : 'Sales'}</span>
                              <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">{Number(c.totalSalesAmount || 0).toFixed(2)} EGP</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedReport === 'status-distribution' && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <div className="space-y-2">
                    {(insightsReport.statusDistribution || []).map((s) => (
                      <div key={s.status} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                        <div className="flex items-center justify-between gap-3 text-xs md:text-sm font-black">
                          <span className="text-slate-700 dark:text-slate-200">{statusLabel(s.status)}</span>
                          <span className="text-slate-500 tabular-nums">{s.count || 0} ({Number(s.percentage || 0).toFixed(1)}%)</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(Number(s.percentage || 0), 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedReport === 'value-buckets' && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[620px]">
                      <thead><tr className="border-b border-slate-200 dark:border-slate-800"><th className="text-start px-4 py-3 text-xs font-black text-slate-500">{lang === 'ar' ? 'الشريحة' : 'Bucket'}</th><th className="text-start px-4 py-3 text-xs font-black text-slate-500">{lang === 'ar' ? 'العدد' : 'Count'}</th><th className="text-start px-4 py-3 text-xs font-black text-slate-500">{lang === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}</th></tr></thead>
                      <tbody>
                        {(insightsReport.completedOrderValueBuckets || []).map((b) => (
                          <tr key={b.bucketLabel} className="border-b last:border-b-0 border-slate-100 dark:border-slate-800">
                            <td className="px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200">{b.bucketLabel}</td>
                            <td className="px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200 tabular-nums">{b.count || 0}</td>
                            <td className="px-4 py-3 text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{Number(b.totalSalesAmount || 0).toFixed(2)} EGP</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden p-3 space-y-2">
                    {(insightsReport.completedOrderValueBuckets || []).map((b) => (
                      <div key={b.bucketLabel} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                        <p className="text-sm font-black text-slate-800 dark:text-slate-100 break-words">{b.bucketLabel}</p>
                        <div className="mt-2 flex items-center justify-between text-xs font-black">
                          <span className="text-slate-500">{lang === 'ar' ? 'العدد' : 'Count'}</span>
                          <span className="text-primary tabular-nums">{b.count || 0}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs font-black">
                          <span className="text-slate-500">{lang === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">{Number(b.totalSalesAmount || 0).toFixed(2)} EGP</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedReports;
