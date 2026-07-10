import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideBanknote,
  LucideCheckCircle2,
  LucideChartNoAxesColumn,
  LucideDownload,
  LucideHistory,
  LucideLogOut,
  LucidePackage,
  LucidePencil,
  LucidePlus,
  LucidePower,
  LucideReceiptText,
  LucideRotateCcw,
  LucideSave,
  LucideTrash2,
  LucideUtensils,
  LucideWalletCards
} from '@lucide/angular';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';

type Tab = 'sale' | 'products' | 'history' | 'dashboard';
type PaymentMethod = 'EFECTIVO' | 'YAPE' | 'VISA';
type ProductStatusFilter = 'ACTIVE' | 'INACTIVE' | 'DELETED' | 'ALL';
type RuntimeWindow = Window & { __env?: { apiUrl?: string } };
type AuthResponse = { token: string; username: string; expiresAt: string };

interface Category {
  code: string;
  label: string;
  defaultPromoEligible: boolean;
}

interface Product {
  id: number;
  name: string;
  category: string;
  categoryLabel: string;
  price: number;
  active: boolean;
  promoEligible: boolean;
  deleted: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
  note: string;
}

interface Payment {
  method: PaymentMethod;
  amount: number;
}

interface Sale {
  id: number;
  createdAt: string;
  takeaway: boolean;
  serviceLocation: string;
  promoActive: boolean;
  subtotal: number;
  promoDiscount: number;
  manualDiscountPercent: number;
  manualDiscountAmount: number;
  total: number;
  paid: number;
  remaining: number;
  status: 'PENDIENTE' | 'PAGADA';
  items: Array<{
    productId: number;
    productName: string;
    categoryLabel: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    promoEligible: boolean;
    note?: string;
  }>;
  payments: Array<{
    method: PaymentMethod;
    methodLabel: string;
    amount: number;
    paidAt: string;
  }>;
}

interface Dashboard {
  todaySales: number;
  weekSales: number;
  monthSales: number;
  pendingAmount: number;
  todayOrders: number;
  weekByDay: Array<{ date: string; total: number; paid: number; sales: number }>;
}

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    FormsModule,
    LucideBanknote,
    LucideCheckCircle2,
    LucideChartNoAxesColumn,
    LucideDownload,
    LucideHistory,
    LucideLogOut,
    LucidePackage,
    LucidePencil,
    LucidePlus,
    LucidePower,
    LucideReceiptText,
    LucideRotateCcw,
    LucideSave,
    LucideTrash2,
    LucideUtensils,
    LucideWalletCards
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private readonly api = this.resolveApiUrl();
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  token = localStorage.getItem('bar-dmaced-token') || '';
  tokenExpiresAt = localStorage.getItem('bar-dmaced-token-expires-at') || '';
  username = 'admin';
  password = 'Admin123@';
  tab = signal<Tab>('dashboard');
  categories = signal<Category[]>([]);
  products = signal<Product[]>([]);
  showDeletedProducts = signal(false);
  cart = signal<CartItem[]>([]);
  payments = signal<Payment[]>([]);
  sales = signal<Sale[]>([]);
  selectedSale = signal<Sale | null>(null);
  dashboard = signal<Dashboard | null>(null);
  saleDate = this.currentDateInput();
  dashboardDate = this.currentDateInput();
  historyDate = this.currentDateInput();
  historySaleDates = signal<string[]>([]);
  historyRecent = false;
  loading = signal(false);
  savingSale = signal(false);
  savingHistoryPayment = signal(false);
  editingSaleId = signal<number | null>(null);

  productForm = {
    id: 0,
    name: '',
    category: 'COMIDA',
    price: 0,
    active: true,
    promoEligible: true,
    deleted: false
  };

  takeaway = false;
  serviceLocation = 'A1';
  serviceOptions = [
    { value: 'PARA_LLEVAR', label: 'Para llevar' },
    ...Array.from({ length: 10 }, (_, index) => ({ value: `A${index + 1}`, label: `Mesa A${index + 1}` })),
    ...Array.from({ length: 10 }, (_, index) => ({ value: `B${index + 1}`, label: `Mesa B${index + 1}` }))
  ];
  promoActive = false;
  promoScope = 'ALL';
  productSearch = signal('');
  productAdminSearch = signal('');
  productStatusFilter = signal<ProductStatusFilter>('ACTIVE');
  productCategoryFilter = signal('ALL');
  discountPercent = 0;
  paymentMethod: PaymentMethod = 'EFECTIVO';
  paymentAmount = '';
  historyPaymentMethod: PaymentMethod = 'EFECTIVO';
  historyPaymentAmount = '';

  groupedProducts = computed(() => {
    const search = this.normalize(this.productSearch());
    return this.categories()
      .map(category => ({
        ...category,
        products: this.products().filter(product => {
          const matchesCategory = product.active && !product.deleted && product.category === category.code;
          const matchesSearch = !search || this.normalize(`${product.name} ${product.categoryLabel}`).includes(search);
          return matchesCategory && matchesSearch;
        })
      }))
      .filter(group => group.products.length);
  });

  visibleProductCount = computed(() =>
    this.groupedProducts().reduce((total, group) => total + group.products.length, 0)
  );

  filteredProducts = computed(() => {
    const search = this.normalize(this.productAdminSearch());
    return this.products().filter(product => {
      const matchesSearch = !search || this.normalize(`${product.name} ${product.categoryLabel}`).includes(search);
      const matchesCategory = this.productCategoryFilter() === 'ALL' || product.category === this.productCategoryFilter();
      const matchesStatus =
        this.productStatusFilter() === 'ALL'
        || (this.productStatusFilter() === 'ACTIVE' && product.active && !product.deleted)
        || (this.productStatusFilter() === 'INACTIVE' && !product.active && !product.deleted)
        || (this.productStatusFilter() === 'DELETED' && product.deleted);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  });

  productCounts = computed(() => ({
    active: this.products().filter(product => product.active && !product.deleted).length,
    inactive: this.products().filter(product => !product.active && !product.deleted).length,
    deleted: this.products().filter(product => product.deleted).length,
    total: this.products().length
  }));

  cartSubtotal = computed(() =>
    this.cart().reduce((total, item) => total + Number(item.product.price) * item.quantity, 0)
  );

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    if (this.token) {
      this.refreshSession(true);
    }
  }

  login(): void {
    this.loading.set(true);
    this.http.post<AuthResponse>(`${this.api}/auth/login`, {
      username: this.username,
      password: this.password
    }).subscribe({
      next: response => {
        this.storeSession(response);
        this.loadAll();
      },
      error: () => Swal.fire('Acceso denegado', 'Usuario o contraseña incorrectos.', 'error'),
      complete: () => this.loading.set(false)
    });
  }

  logout(): void {
    this.token = '';
    this.tokenExpiresAt = '';
    this.clearRefreshTimer();
    localStorage.removeItem('bar-dmaced-token');
    localStorage.removeItem('bar-dmaced-token-expires-at');
  }

  refreshSession(loadAfterRefresh = false): void {
    if (!this.token) {
      return;
    }
    this.http.post<AuthResponse>(`${this.api}/auth/refresh`, {}, this.options()).subscribe({
      next: response => {
        this.storeSession(response);
        if (loadAfterRefresh) {
          this.loadAll();
        }
      },
      error: () => this.logout()
    });
  }

  loadAll(): void {
    this.loadCategories();
    this.loadProducts();
    this.loadDashboard();
    this.loadSales();
    this.loadHistorySaleDates();
  }

  loadCategories(): void {
    this.http.get<Category[]>(`${this.api}/products/categories`, this.options()).subscribe(categories => {
      this.categories.set(categories);
    });
  }

  loadProducts(): void {
    this.http.get<Product[]>(`${this.api}/products?includeDeleted=true`, this.options()).subscribe(products => {
      this.products.set(products);
    });
  }

  loadDashboard(): void {
    this.http.get<Dashboard>(`${this.api}/sales/dashboard?date=${this.dashboardDate}`, this.options()).subscribe(dashboard => {
      this.dashboard.set(dashboard);
    });
  }

  loadSales(): void {
    this.historyRecent = false;
    this.http.get<Sale[]>(`${this.api}/sales?date=${this.historyDate}`, this.options()).subscribe(sales => {
      this.sales.set(sales);
      if (!sales.length) {
        this.selectedSale.set(null);
      } else if (!this.selectedSale() || !sales.some(sale => sale.id === this.selectedSale()?.id)) {
        this.selectedSale.set(sales[0]);
      }
    });
  }

  loadHistorySaleDates(): void {
    this.http.get<Sale[]>(`${this.api}/sales/recent`, this.options()).subscribe(sales => {
      const dates = [...new Set(sales.map(sale => sale.createdAt.slice(0, 10)))].sort().reverse();
      this.historySaleDates.set(dates);
    });
  }

  selectHistoryDate(date: string): void {
    this.historyDate = date;
    this.loadSales();
  }

  loadRecentSales(): void {
    this.historyRecent = true;
    this.http.get<Sale[]>(`${this.api}/sales/recent`, this.options()).subscribe(sales => {
      this.sales.set(sales);
      if (!sales.length) {
        this.selectedSale.set(null);
      } else if (!this.selectedSale() || !sales.some(sale => sale.id === this.selectedSale()?.id)) {
        this.selectedSale.set(sales[0]);
      }
    });
  }

  saveProduct(): void {
    const payload = { ...this.productForm, price: Number(this.productForm.price) };
    const request = this.productForm.id
      ? this.http.put<Product>(`${this.api}/products/${this.productForm.id}`, payload, this.options())
      : this.http.post<Product>(`${this.api}/products`, payload, this.options());

    request.subscribe({
      next: () => {
        Swal.fire('Producto guardado', 'La carta fue actualizada.', 'success');
        this.resetProductForm();
        this.loadProducts();
      },
      error: () => Swal.fire('No se pudo guardar', 'Revisa los datos del producto.', 'error')
    });
  }

  editProduct(product: Product): void {
    this.productForm = { ...product, id: product.id };
    this.tab.set('products');
  }

  toggleProduct(product: Product): void {
    this.http.patch(`${this.api}/products/${product.id}/active?active=${!product.active}`, {}, this.options())
      .subscribe(() => this.loadProducts());
  }

  deleteProduct(product: Product): void {
    Swal.fire({
      title: 'Eliminar producto',
      text: 'Se ocultara de la carta, pero podras restaurarlo luego.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }
      this.http.patch(`${this.api}/products/${product.id}/delete`, {}, this.options())
        .subscribe(() => this.loadProducts());
    });
  }

  restoreProduct(product: Product): void {
    this.http.patch(`${this.api}/products/${product.id}/restore`, {}, this.options())
      .subscribe(() => this.loadProducts());
  }

  resetProductForm(): void {
    this.productForm = {
      id: 0,
      name: '',
      category: 'COMIDA',
      price: 0,
      active: true,
      promoEligible: true,
      deleted: false
    };
  }

  addToCart(product: Product): void {
    const current = [...this.cart()];
    const item = current.find(value => value.product.id === product.id);
    if (item) {
      item.quantity += 1;
    } else {
      current.push({ product, quantity: 1, note: '' });
    }
    if (product.category === 'TAPER' || product.category === 'VASO') {
      this.takeaway = true;
      this.serviceLocation = 'PARA_LLEVAR';
    }
    this.cart.set(current);
  }

  changeQuantity(productId: number, delta: number): void {
    const next = this.cart()
      .map(item => item.product.id === productId ? { ...item, quantity: item.quantity + delta } : item)
      .filter(item => item.quantity > 0);
    this.cart.set(next);
  }

  removeFromCart(productId: number): void {
    this.cart.set(this.cart().filter(item => item.product.id !== productId));
  }

  addDraftPayment(): void {
    if (this.savingSale()) {
      return;
    }
    if (this.editingSaleId()) {
      Swal.fire('Edición activa', 'Guarda la cuenta y registra nuevos pagos desde historial.', 'info');
      return;
    }
    const amount = this.parseAmount(this.paymentAmount);
    if (amount <= 0) {
      Swal.fire('Importe inválido', 'Ingresa un monto mayor a cero.', 'warning');
      return;
    }
    const remaining = this.estimatedRemaining();
    if (amount > remaining) {
      Swal.fire('Pago mayor al pendiente', `Solo falta pagar ${this.money(remaining)}.`, 'warning');
      this.paymentAmount = remaining.toFixed(2);
      return;
    }
    this.payments.set([...this.payments(), { method: this.paymentMethod, amount }]);
    this.paymentAmount = '';
  }

  removeDraftPayment(index: number): void {
    this.payments.set(this.payments().filter((_, itemIndex) => itemIndex !== index));
  }

  createSale(): void {
    if (this.savingSale()) {
      return;
    }
    if (!this.cart().length) {
      Swal.fire('Cuenta vacía', 'Agrega productos antes de guardar.', 'warning');
      return;
    }
    const promoCategories = this.promoActive && this.promoScope !== 'ALL' ? [this.promoScope] : [];
    const payload = {
      saleDate: this.saleDate,
      takeaway: this.isTakeawayOrder(),
      serviceLocation: this.isTakeawayOrder() ? 'PARA_LLEVAR' : this.serviceLocation,
      promoActive: this.promoActive,
      discountPercent: Number(this.discountPercent || 0),
      promoCategories,
      items: this.cart().map(item => ({ productId: item.product.id, quantity: item.quantity, note: item.note })),
      payments: []
    };

    this.savingSale.set(true);
    const editingId = this.editingSaleId();
    const request = editingId
      ? this.http.put<Sale>(`${this.api}/sales/${editingId}`, payload, this.options())
      : this.http.post<Sale>(`${this.api}/sales`, payload, this.options());

    request.subscribe({
      next: sale => {
        this.selectedSale.set(sale);
        this.historyDate = sale.createdAt.slice(0, 10);
        this.resetSaleDraft();
        this.loadSales();
        this.loadDashboard();
        this.tab.set('history');
        Swal.fire(editingId ? 'Cuenta actualizada' : 'Cuenta guardada', `Pendiente por cobrar: ${this.money(sale.remaining)}`, 'success');
      },
      error: error => Swal.fire('No se pudo guardar', this.errorMessage(error), 'error'),
      complete: () => this.savingSale.set(false)
    });
  }

  editSale(sale: Sale, event?: Event): void {
    event?.stopPropagation();
    const productsById = new Map(this.products().map(product => [product.id, product]));
    const missing = sale.items.find(item => !productsById.has(item.productId));
    if (missing) {
      Swal.fire('No se puede editar', `El producto ${missing.productName} ya no existe en la carta.`, 'warning');
      return;
    }
    this.cart.set(sale.items.map(item => ({
      product: productsById.get(item.productId)!,
      quantity: item.quantity,
      note: item.note || ''
    })));
    this.payments.set([]);
    this.editingSaleId.set(sale.id);
    this.promoActive = sale.promoActive;
    this.promoScope = 'ALL';
    this.discountPercent = Number(sale.manualDiscountPercent || 0);
    this.saleDate = sale.createdAt.slice(0, 10);
    this.serviceLocation = sale.serviceLocation || (sale.takeaway ? 'PARA_LLEVAR' : 'A1');
    this.takeaway = sale.takeaway || this.serviceLocation === 'PARA_LLEVAR';
    this.paymentAmount = '';
    this.selectedSale.set(sale);
    this.tab.set('sale');
  }

  cancelSaleEdit(): void {
    this.resetSaleDraft();
  }

  deleteSale(sale: Sale, event?: Event): void {
    event?.stopPropagation();
    Swal.fire({
      title: `Eliminar venta #${sale.id}`,
      text: 'Se borrara del historial, dashboard y reportes.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }
      this.http.delete(`${this.api}/sales/${sale.id}`, this.options()).subscribe({
        next: () => {
          if (this.selectedSale()?.id === sale.id) {
            this.selectedSale.set(null);
          }
          this.loadSales();
          this.loadDashboard();
          Swal.fire('Venta eliminada', 'La venta fue retirada del sistema.', 'success');
        },
        error: error => Swal.fire('No se pudo eliminar', this.errorMessage(error), 'error')
      });
    });
  }

  addHistoryPayment(): void {
    const sale = this.selectedSale();
    if (this.savingHistoryPayment()) {
      return;
    }
    const received = this.parseAmount(this.historyPaymentAmount);
    if (!sale || received <= 0) {
      Swal.fire('Pago inválido', 'Selecciona una venta e ingresa un importe.', 'warning');
      return;
    }
    const remaining = Number(sale.remaining);
    if (remaining <= 0) {
      Swal.fire('Cuenta pagada', 'Esta venta ya no tiene saldo pendiente.', 'info');
      return;
    }
    const amount = Math.min(received, remaining);
    const change = Math.max(0, received - remaining);
    this.savingHistoryPayment.set(true);
    this.http.post<Sale>(`${this.api}/sales/${sale.id}/payments`, {
      method: this.historyPaymentMethod,
      amount
    }, this.options()).subscribe(updated => {
      this.selectedSale.set(updated);
      this.historyPaymentAmount = '';
      this.loadSales();
      this.loadDashboard();
      if (change > 0) {
        Swal.fire('Pago registrado', `Vuelto: ${this.money(change)}`, 'success');
      }
    }, error => {
      Swal.fire('No se pudo registrar', this.errorMessage(error), 'error');
    }).add(() => {
      this.savingHistoryPayment.set(false);
    });
  }

  completeSelectedSale(): void {
    const sale = this.selectedSale();
    if (!sale || this.savingHistoryPayment() || Number(sale.remaining) <= 0) {
      return;
    }
    this.historyPaymentAmount = Number(sale.remaining).toFixed(2);
    this.addHistoryPayment();
  }

  historyPaymentChange(sale: Sale): number {
    return Math.max(0, this.parseAmount(this.historyPaymentAmount) - Number(sale.remaining || 0));
  }

  async downloadTicketImage(): Promise<void> {
    const sale = this.selectedSale();
    if (!sale) {
      return;
    }
    const element = document.getElementById(`ticket-${sale.id}`);
    if (!element) {
      return;
    }
    const canvas = await html2canvas(element, { backgroundColor: '#ffffff', scale: 2 });
    const link = document.createElement('a');
    link.download = `bar-dmaced-venta-${sale.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  async downloadDayPdf(): Promise<void> {
    if (!this.sales().length) {
      Swal.fire('Sin ventas', 'No hay ventas para exportar.', 'info');
      return;
    }
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const sales = [...this.sales()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const total = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
    const paid = sales.reduce((sum, sale) => sum + Number(sale.paid), 0);
    const pending = sales.reduce((sum, sale) => sum + Number(sale.remaining), 0);
    const paidCount = sales.filter(sale => this.saleStatusLabel(sale) === 'PAGADA').length;
    const paymentsByMethod = this.paymentTotalsByMethod(sales);
    let y = 14;

    const footer = () => {
      const pageCount = pdf.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        pdf.setPage(page);
        pdf.setFontSize(8);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`Bar D'maced · Pagina ${page} de ${pageCount}`, margin, pageHeight - 8);
      }
    };

    const addHeader = () => {
      pdf.setTextColor(20, 24, 22);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text("Bar D'maced", margin, y);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Reporte diario de ventas · ${this.formatReportDate(this.historyDate)}`, margin, y + 7);
      pdf.text(`Generado: ${this.formatDateTime(new Date().toISOString())}`, margin, y + 13);
      y += 24;
    };

    const addSummary = () => {
      const cardWidth = (pageWidth - margin * 2 - 9) / 4;
      const cards = [
        ['Ventas', `${sales.length}`],
        ['Pagadas', `${paidCount}`],
        ['Total', this.money(total)],
        ['Pendiente', this.money(pending)]
      ];
      cards.forEach(([label, value], index) => {
        const x = margin + index * (cardWidth + 3);
        pdf.setDrawColor(225, 216, 202);
        pdf.setFillColor(253, 250, 244);
        pdf.roundedRect(x, y, cardWidth, 18, 2, 2, 'FD');
        pdf.setFontSize(8);
        pdf.setTextColor(110, 110, 105);
        pdf.text(label, x + 3, y + 6);
        pdf.setFontSize(12);
        pdf.setTextColor(20, 24, 22);
        pdf.setFont('helvetica', 'bold');
        pdf.text(value, x + 3, y + 14);
        pdf.setFont('helvetica', 'normal');
      });
      y += 25;

      pdf.setFontSize(9);
      pdf.setTextColor(80, 80, 76);
      pdf.text(`Cobrado: ${this.money(paid)}   Efectivo: ${this.money(paymentsByMethod.EFECTIVO)}   Yape: ${this.money(paymentsByMethod.YAPE)}   Visa: ${this.money(paymentsByMethod.VISA)}`, margin, y);
      y += 9;
    };

    const addTableHeader = () => {
      pdf.setFillColor(34, 125, 96);
      pdf.rect(margin, y, pageWidth - margin * 2, 8, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Venta', margin + 2, y + 5.5);
      pdf.text('Hora / destino', margin + 18, y + 5.5);
      pdf.text('Detalle', margin + 52, y + 5.5);
      pdf.text('Pagos', margin + 123, y + 5.5);
      pdf.text('Total', pageWidth - 42, y + 5.5);
      pdf.text('Estado', pageWidth - 25, y + 5.5);
      y += 8;
      pdf.setFont('helvetica', 'normal');
    };

    const addPage = () => {
      pdf.addPage();
      y = 14;
      addHeader();
      addTableHeader();
    };

    addHeader();
    addSummary();
    addTableHeader();

    sales.forEach(sale => {
      const detailLines = pdf.splitTextToSize(this.saleDetailSummary(sale), 68);
      const paymentLines = pdf.splitTextToSize(this.salePaymentSummary(sale), 29);
      const rowHeight = Math.max(14, 5 + Math.max(detailLines.length, paymentLines.length) * 4);
      if (y + rowHeight > pageHeight - 16) {
        addPage();
      }

      pdf.setDrawColor(232, 225, 214);
      pdf.setFillColor(this.saleStatusLabel(sale) === 'PAGADA' ? 248 : 255, 253, 248);
      pdf.rect(margin, y, pageWidth - margin * 2, rowHeight, 'FD');
      pdf.setFontSize(8);
      pdf.setTextColor(20, 24, 22);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`#${sale.id}`, margin + 2, y + 5);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${this.shortTime(sale.createdAt)}`, margin + 18, y + 5);
      pdf.text(this.serviceLocationLabel(sale.serviceLocation, sale.takeaway), margin + 18, y + 9);
      pdf.text(detailLines, margin + 52, y + 5);
      pdf.text(paymentLines, margin + 123, y + 5);
      pdf.setFont('helvetica', 'bold');
      pdf.text(this.money(sale.total), pageWidth - 42, y + 5);
      pdf.setTextColor(this.saleStatusLabel(sale) === 'PAGADA' ? 34 : 177, this.saleStatusLabel(sale) === 'PAGADA' ? 125 : 83, this.saleStatusLabel(sale) === 'PAGADA' ? 96 : 53);
      pdf.text(this.saleStatusLabel(sale), pageWidth - 25, y + 5);
      if (Number(sale.remaining) > 0) {
        pdf.setTextColor(177, 83, 53);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Debe ${this.money(sale.remaining)}`, pageWidth - 42, y + 10);
      }
      y += rowHeight;
    });

    footer();
    pdf.save(`bar-dmaced-reporte-${this.historyDate}.pdf`);
  }

  private paymentTotalsByMethod(sales: Sale[]): Record<PaymentMethod, number> {
    return sales.reduce<Record<PaymentMethod, number>>((totals, sale) => {
      sale.payments.forEach(payment => {
        totals[payment.method] += Number(payment.amount);
      });
      return totals;
    }, { EFECTIVO: 0, YAPE: 0, VISA: 0 });
  }

  private saleDetailSummary(sale: Sale): string {
    return sale.items
      .map(item => `${item.quantity}x ${item.productName}${item.note ? ` (${item.note})` : ''}`)
      .join(' · ');
  }

  private salePaymentSummary(sale: Sale): string {
    if (!sale.payments.length) {
      return 'Sin pagos';
    }
    return sale.payments.map(payment => `${payment.methodLabel} ${this.money(payment.amount)}`).join(' · ');
  }

  downloadWeekPdf(data: Dashboard): void {
    const dates = data.weekByDay.map(day => day.date);
    forkJoin(dates.map(date => this.http.get<Sale[]>(`${this.api}/sales?date=${date}`, this.options()))).subscribe({
      next: salesByDay => this.buildWeekPdf(data, dates, salesByDay),
      error: error => Swal.fire('No se pudo generar', this.errorMessage(error), 'error')
    });
  }

  private buildWeekPdf(data: Dashboard, dates: string[], salesByDay: Sale[][]): void {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const allSales = salesByDay.flat();
    const total = allSales.reduce((sum, sale) => sum + Number(sale.total), 0);
    const paid = allSales.reduce((sum, sale) => sum + Number(sale.paid), 0);
    const pending = allSales.reduce((sum, sale) => sum + Number(sale.remaining), 0);
    const paidCount = allSales.filter(sale => this.saleStatusLabel(sale) === 'PAGADA').length;
    const paymentsByMethod = this.paymentTotalsByMethod(allSales);
    const weekStart = dates[0];
    const weekEnd = dates[dates.length - 1];
    let y = 14;

    const footer = () => {
      const pageCount = pdf.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        pdf.setPage(page);
        pdf.setFontSize(8);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`Bar D'maced · Reporte semanal · Pagina ${page} de ${pageCount}`, margin, pageHeight - 8);
      }
    };

    const ensureSpace = (height: number) => {
      if (y + height <= pageHeight - 16) {
        return;
      }
      pdf.addPage();
      y = 14;
    };

    pdf.setTextColor(20, 24, 22);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text("Bar D'maced", margin, y);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Reporte semanal · ${this.formatReportDate(weekStart)} al ${this.formatReportDate(weekEnd)}`, margin, y + 7);
    pdf.text(`Generado: ${this.formatDateTime(new Date().toISOString())}`, margin, y + 13);
    y += 24;

    const cardWidth = (pageWidth - margin * 2 - 12) / 5;
    [
      ['Ventas', `${allSales.length}`],
      ['Pagadas', `${paidCount}`],
      ['Total', this.money(total)],
      ['Cobrado', this.money(paid)],
      ['Pendiente', this.money(pending)]
    ].forEach(([label, value], index) => {
      const x = margin + index * (cardWidth + 3);
      pdf.setDrawColor(225, 216, 202);
      pdf.setFillColor(253, 250, 244);
      pdf.roundedRect(x, y, cardWidth, 18, 2, 2, 'FD');
      pdf.setFontSize(7.5);
      pdf.setTextColor(110, 110, 105);
      pdf.text(label, x + 3, y + 6);
      pdf.setFontSize(10);
      pdf.setTextColor(20, 24, 22);
      pdf.setFont('helvetica', 'bold');
      pdf.text(value, x + 3, y + 14);
      pdf.setFont('helvetica', 'normal');
    });
    y += 26;

    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 76);
    pdf.text(`Metodos: efectivo ${this.money(paymentsByMethod.EFECTIVO)} · Yape ${this.money(paymentsByMethod.YAPE)} · Visa ${this.money(paymentsByMethod.VISA)}`, margin, y);
    y += 10;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(20, 24, 22);
    pdf.text('Resumen por dia', margin, y);
    y += 5;

    pdf.setFillColor(34, 125, 96);
    pdf.rect(margin, y, pageWidth - margin * 2, 8, 'F');
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.text('Dia', margin + 2, y + 5.5);
    pdf.text('Ventas', margin + 43, y + 5.5);
    pdf.text('Total', margin + 68, y + 5.5);
    pdf.text('Cobrado', margin + 98, y + 5.5);
    pdf.text('Pendiente', margin + 130, y + 5.5);
    pdf.text('Estado', margin + 164, y + 5.5);
    y += 8;

    dates.forEach((date, index) => {
      const daySales = salesByDay[index];
      const dayTotal = daySales.reduce((sum, sale) => sum + Number(sale.total), 0);
      const dayPaid = daySales.reduce((sum, sale) => sum + Number(sale.paid), 0);
      const dayPending = daySales.reduce((sum, sale) => sum + Number(sale.remaining), 0);
      ensureSpace(9);
      pdf.setDrawColor(232, 225, 214);
      pdf.setFillColor(255, 253, 248);
      pdf.rect(margin, y, pageWidth - margin * 2, 9, 'FD');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(20, 24, 22);
      pdf.text(this.formatReportDate(date), margin + 2, y + 6);
      pdf.text(`${daySales.length}`, margin + 45, y + 6);
      pdf.text(this.money(dayTotal), margin + 68, y + 6);
      pdf.text(this.money(dayPaid), margin + 98, y + 6);
      pdf.text(this.money(dayPending), margin + 130, y + 6);
      pdf.text(dayPending > 0 ? 'Con pendiente' : daySales.length ? 'Cerrado' : 'Sin ventas', margin + 164, y + 6);
      y += 9;
    });

    y += 10;
    ensureSpace(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(20, 24, 22);
    pdf.text('Detalle compacto', margin, y);
    y += 7;

    dates.forEach((date, index) => {
      const daySales = salesByDay[index].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      if (!daySales.length) {
        return;
      }
      ensureSpace(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(34, 125, 96);
      pdf.text(this.formatReportDate(date), margin, y);
      y += 5;

      daySales.forEach(sale => {
        const line = `#${sale.id} · ${this.shortTime(sale.createdAt)} · ${this.serviceLocationLabel(sale.serviceLocation, sale.takeaway)} · ${this.saleDetailSummary(sale)} · Total ${this.money(sale.total)} · ${this.saleStatusLabel(sale)}`;
        const lines = pdf.splitTextToSize(line, pageWidth - margin * 2);
        const rowHeight = 3 + lines.length * 4;
        ensureSpace(rowHeight);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(35, 40, 37);
        pdf.text(lines, margin + 2, y);
        y += rowHeight;
      });
      y += 2;
    });

    footer();
    pdf.save(`bar-dmaced-semana-${weekStart}-a-${weekEnd}.pdf`);
  }

  saleStatusLabel(sale: Sale): 'PENDIENTE' | 'PAGADA' {
    return Number(sale.remaining) <= 0 ? 'PAGADA' : 'PENDIENTE';
  }

  private buildTicketElement(sale: Sale): HTMLElement {
    const element = document.createElement('div');
    element.className = 'ticket';
    element.innerHTML = `
      <h2>Bar D'maced</h2>
      <p>Venta #${sale.id}</p>
      <p>${this.formatDateTime(sale.createdAt)} · ${this.escapeHtml(this.serviceLocationLabel(sale.serviceLocation, sale.takeaway))}</p>
      <table>
        <thead><tr><th>Cant.</th><th>Producto</th><th>P. unit.</th><th>Total</th></tr></thead>
        <tbody>
          ${sale.items.map(item => `
            <tr>
              <td>${item.quantity}</td>
              <td>${this.escapeHtml(item.productName)}${item.note ? `<br><small>${this.escapeHtml(item.note)}</small>` : ''}</td>
              <td>${this.money(item.unitPrice)}</td>
              <td>${this.money(item.lineTotal)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="ticket-total"><span>Subtotal</span><b>${this.money(sale.subtotal)}</b></div>
      ${sale.promoDiscount > 0 ? `<div class="ticket-total"><span>Promo 3x2</span><b>-${this.money(sale.promoDiscount)}</b></div>` : ''}
      ${sale.manualDiscountAmount > 0 ? `<div class="ticket-total"><span>Descuento ${sale.manualDiscountPercent}%</span><b>-${this.money(sale.manualDiscountAmount)}</b></div>` : ''}
      <div class="ticket-total grand"><span>Total</span><b>${this.money(sale.total)}</b></div>
      <div class="ticket-total"><span>Pagado</span><b>${this.money(sale.paid)}</b></div>
      <div class="ticket-total"><span>Pendiente</span><b>${this.money(sale.remaining)}</b></div>
      ${sale.payments.map(payment => `<p>Pago: ${this.escapeHtml(payment.methodLabel)} · ${this.money(payment.amount)}</p>`).join('')}
    `;
    return element;
  }

  private formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'medium',
      timeStyle: 'medium'
    }).format(new Date(value));
  }

  private escapeHtml(value: string): string {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return value.replace(/[&<>"']/g, character => entities[character]);
  }

  saleTotalPaidDraft(): number {
    return this.editingPaid() + this.payments().reduce((total, payment) => total + Number(payment.amount), 0);
  }

  editingPaid(): number {
    const editingId = this.editingSaleId();
    const sale = this.selectedSale();
    return editingId && sale?.id === editingId ? Number(sale.paid || 0) : 0;
  }

  updateServiceLocation(value: string): void {
    this.serviceLocation = value;
    this.takeaway = value === 'PARA_LLEVAR';
  }

  isTakeawayOrder(): boolean {
    return this.takeaway || this.serviceLocation === 'PARA_LLEVAR';
  }

  serviceLocationLabel(value: string, takeaway = false): string {
    if (takeaway || value === 'PARA_LLEVAR') {
      return 'Para llevar';
    }
    return value ? `Mesa ${value}` : 'Mesa';
  }

  dashboardAverageTicket(data: Dashboard): number {
    return data.todayOrders ? Number(data.todaySales) / data.todayOrders : 0;
  }

  dashboardWeekOrders(data: Dashboard): number {
    return data.weekByDay.reduce((total, day) => total + Number(day.sales), 0);
  }

  dashboardTodayPaid(data: Dashboard): number {
    return Number(data.weekByDay.find(day => day.date === this.dashboardDate)?.paid || 0);
  }

  dashboardBestDay(data: Dashboard): string {
    const best = [...data.weekByDay].sort((a, b) => Number(b.total) - Number(a.total))[0];
    if (!best || Number(best.total) === 0) {
      return 'Sin ventas';
    }
    return `${this.shortDate(best.date)} · ${this.money(best.total)}`;
  }

  shortDate(value: string): string {
    return new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: '2-digit' }).format(new Date(`${value}T00:00:00`));
  }

  shortTime(value: string): string {
    return new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  }

  formatReportDate(value: string): string {
    return new Intl.DateTimeFormat('es-PE', { dateStyle: 'full' }).format(new Date(`${value}T00:00:00`));
  }

  isPromoProduct(product: Product): boolean {
    if (!this.promoActive || !product.promoEligible) {
      return false;
    }
    if (['COMBO_COMIDA', 'PONCHERA_1_5', 'PONCHERA_3'].includes(product.category)) {
      return false;
    }
    return this.promoScope === 'ALL' || this.promoScope === product.category;
  }

  estimatedPromoDiscount(): number {
    if (!this.promoActive) {
      return 0;
    }
    const units = this.cart().flatMap(item =>
      this.isPromoProduct(item.product)
        ? Array.from({ length: item.quantity }, () => Number(item.product.price))
        : []
    );
    if (units.length < 3) {
      return 0;
    }
    units.sort((a, b) => b - a);
    let discount = 0;
    for (let index = 2; index < units.length; index += 3) {
      discount += units[index];
    }
    return discount;
  }

  estimatedDiscount(): number {
    const percent = Math.min(100, Math.max(0, Number(this.discountPercent || 0)));
    const base = Math.max(0, this.cartSubtotal() - this.estimatedPromoDiscount());
    return base * percent / 100;
  }

  estimatedTotal(): number {
    return Math.max(0, this.cartSubtotal() - this.estimatedPromoDiscount() - this.estimatedDiscount());
  }

  estimatedRemaining(): number {
    return Math.max(0, this.estimatedTotal() - this.saleTotalPaidDraft());
  }

  draftPaymentMax(): number {
    return Number(this.estimatedRemaining().toFixed(2));
  }

  private resetSaleDraft(): void {
    this.cart.set([]);
    this.payments.set([]);
    this.editingSaleId.set(null);
    this.takeaway = false;
    this.serviceLocation = 'A1';
    this.promoActive = false;
    this.promoScope = 'ALL';
    this.discountPercent = 0;
    this.paymentAmount = '';
  }

  money(value: number): string {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value || 0));
  }

  methodLabel(method: PaymentMethod): string {
    return method === 'EFECTIVO' ? 'Efectivo' : method === 'YAPE' ? 'Yape' : 'Visa';
  }

  private options() {
    return {
      headers: new HttpHeaders({ Authorization: `Bearer ${this.token}` })
    };
  }

  private storeSession(response: AuthResponse): void {
    this.token = response.token;
    this.tokenExpiresAt = response.expiresAt;
    localStorage.setItem('bar-dmaced-token', response.token);
    localStorage.setItem('bar-dmaced-token-expires-at', response.expiresAt);
    this.scheduleTokenRefresh(response.expiresAt);
  }

  private scheduleTokenRefresh(expiresAt: string): void {
    this.clearRefreshTimer();
    const refreshInMs = Math.max(30_000, new Date(expiresAt).getTime() - Date.now() - 60_000);
    this.refreshTimer = setTimeout(() => this.refreshSession(), refreshInMs);
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private resolveApiUrl(): string {
    return ((window as RuntimeWindow).__env?.apiUrl || 'http://localhost:2080/api').replace(/\/$/, '');
  }

  private errorMessage(error: unknown): string {
    if (typeof error === 'object' && error && 'error' in error) {
      const body = (error as { error?: { message?: string; error?: string } }).error;
      return body?.message || body?.error || 'Revisa los datos e intenta nuevamente.';
    }
    return 'Revisa los datos e intenta nuevamente.';
  }

  private parseAmount(value: string): number {
    return Number((value || '').replace(',', '.')) || 0;
  }

  private currentDateInput(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private normalize(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
