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
  LucideUsers,
  LucideWalletCards
} from '@lucide/angular';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Observable, forkJoin, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';

type Tab = 'sale' | 'products' | 'history' | 'dashboard' | 'staffSchedule' | 'staffEmployees';
type PaymentMethod = 'EFECTIVO' | 'QR' | 'YAPE' | 'VISA';
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
  unitPrice: number;
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
    id: number;
    method: PaymentMethod;
    methodLabel: string;
    amount: number;
    paidAt: string;
  }>;
}

interface Dashboard {
  todaySales: number;
  todayPending: number;
  weekSales: number;
  monthSales: number;
  pendingAmount: number;
  todayOrders: number;
  weekByDay: Array<{ date: string; total: number; paid: number; sales: number }>;
  todayPaymentsByMethod: PaymentMethodSummary[];
  weekPaymentsByMethod: PaymentMethodSummary[];
  monthPaymentsByMethod: PaymentMethodSummary[];
  cashClosure?: CashClosure | null;
}

interface PaymentMethodSummary {
  method: PaymentMethod;
  label: string;
  sales: number;
  payments: number;
  total: number;
}

interface CashClosure {
  id: number;
  businessDate: string;
  closedAt: string;
  closedBy: string;
  note?: string;
  totalSales: number;
  totalPaid: number;
  totalPending: number;
  orders: number;
  paidOrders: number;
  pendingOrders: number;
  paymentsByMethod: PaymentMethodSummary[];
}

interface StaffRole {
  id: number;
  name: string;
  active: boolean;
}

interface Employee {
  id: number;
  name: string;
  roleId: number;
  roleName: string;
  active: boolean;
  inactiveReason?: string;
}

type StaffExceptionType = 'PERMISO' | 'FALTA' | 'DESCANSO' | 'VACACIONES' | 'CAMBIO_TURNO';

interface StaffSchedule {
  id: number;
  dayOfWeek: string;
  working: boolean;
  startTime?: string;
}

interface StaffException {
  id: number;
  employeeId: number;
  employeeName: string;
  type: StaffExceptionType;
  typeLabel: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  note?: string;
}

interface StaffWeek {
  weekStart: string;
  weekEnd: string;
  rows: Array<{
    employee: Employee;
    days: Array<{
      date: string;
      dayOfWeek: string;
      working: boolean;
      startTime?: string;
      status: string;
      note?: string;
      exceptionType?: StaffExceptionType;
      exceptionId?: number;
    }>;
  }>;
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
    LucideUsers,
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
  staffRoles = signal<StaffRole[]>([]);
  employees = signal<Employee[]>([]);
  staffWeek = signal<StaffWeek | null>(null);
  selectedEmployeeId = signal<number | null>(null);
  employeeSchedule = signal<StaffSchedule[]>([]);
  employeeExceptions = signal<StaffException[]>([]);
  saleDate = this.currentDateInput();
  dashboardDate = this.currentDateInput();
  historyDate = this.currentDateInput();
  staffWeekDate = this.currentDateInput();
  historySaleDates = signal<string[]>([]);
  historyRecent = false;
  loading = signal(false);
  savingSale = signal(false);
  savingHistoryPayment = signal(false);
  savingCashClosure = signal(false);
  savingStaff = signal(false);
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

  employeeForm = {
    id: 0,
    name: '',
    roleId: 0,
    active: true,
    inactiveReason: ''
  };
  roleName = '';
  exceptionForm = {
    id: 0,
    employeeId: 0,
    type: 'PERMISO' as StaffExceptionType,
    startDate: this.currentDateInput(),
    endDate: this.currentDateInput(),
    startTime: '18:00',
    note: ''
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
  additionalAmount = '';
  brokenGlassAmount = '';

  groupedProducts = computed(() => {
    const search = this.normalize(this.productSearch());
    return this.categories()
      .map(category => ({
        ...category,
        products: this.products().filter(product => {
          const matchesCategory = product.active && !product.deleted && product.category === category.code;
          const isSpecialCharge = this.isFlexibleChargeProduct(product);
          const matchesSearch = !search || this.normalize(`${product.name} ${product.categoryLabel}`).includes(search);
          return matchesCategory && !isSpecialCharge && matchesSearch;
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
    this.cart().reduce((total, item) => total + Number(item.unitPrice) * item.quantity, 0)
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
    this.loadStaff();
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
    const item = current.find(value => value.product.id === product.id && Number(value.unitPrice) === Number(product.price));
    if (item) {
      item.quantity += 1;
    } else {
      current.push({ product, quantity: 1, note: '', unitPrice: Number(product.price) });
    }
    if (product.category === 'TAPER' || product.category === 'VASO') {
      this.takeaway = true;
      this.serviceLocation = 'PARA_LLEVAR';
    }
    this.cart.set(current);
  }

  addFlexibleCharge(name: 'Adicional' | 'Copa rota', amountValue: string): void {
    const product = this.products().find(item => this.normalize(item.name) === this.normalize(name) && !item.deleted);
    const amount = this.parseAmount(amountValue);
    if (!product || amount <= 0) {
      Swal.fire('Importe inválido', 'Ingresa un monto mayor a cero.', 'warning');
      return;
    }
    this.cart.set([...this.cart(), { product, quantity: 1, note: '', unitPrice: amount }]);
    if (name === 'Adicional') {
      this.additionalAmount = '';
    } else {
      this.brokenGlassAmount = '';
    }
  }

  changeQuantity(index: number, delta: number): void {
    const next = this.cart()
      .map((item, itemIndex) => itemIndex === index ? { ...item, quantity: item.quantity + delta } : item)
      .filter(item => item.quantity > 0);
    this.cart.set(next);
  }

  removeFromCart(index: number): void {
    this.cart.set(this.cart().filter((_, itemIndex) => itemIndex !== index));
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
      items: this.cart().map(item => ({ productId: item.product.id, quantity: item.quantity, note: item.note, unitPrice: item.unitPrice })),
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
      note: item.note || '',
      unitPrice: Number(item.unitPrice)
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
    Swal.fire({
      title: 'Confirmar pago',
      html: `
        <div style="display:grid;gap:8px;text-align:left">
          <p style="display:flex;justify-content:space-between;margin:0"><b>Venta:</b><span>#${sale.id}</span></p>
          <p style="display:flex;justify-content:space-between;margin:0"><b>Metodo:</b><span>${this.methodLabel(this.historyPaymentMethod)}</span></p>
          <p style="display:flex;justify-content:space-between;margin:0"><b>Recibido:</b><span>${this.money(received)}</span></p>
          <p style="display:flex;justify-content:space-between;margin:0"><b>Se registrara:</b><span>${this.money(amount)}</span></p>
          <p style="display:flex;justify-content:space-between;margin:0"><b>Vuelto:</b><span>${this.money(change)}</span></p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirmar pago',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }
      this.savingHistoryPayment.set(true);
      this.http.post<Sale>(`${this.api}/sales/${sale.id}/payments`, {
        method: this.historyPaymentMethod,
        amount
      }, this.options()).subscribe(updated => {
        this.selectedSale.set(updated);
        this.historyPaymentAmount = '';
        this.loadSales();
        this.loadDashboard();
        Swal.fire('Pago registrado', change > 0 ? `Vuelto: ${this.money(change)}` : `Registrado: ${this.money(amount)}`, 'success');
      }, error => {
        Swal.fire('No se pudo registrar', this.errorMessage(error), 'error');
      }).add(() => {
        this.savingHistoryPayment.set(false);
      });
    });
  }

  editHistoryPayment(sale: Sale, payment: Sale['payments'][number]): void {
    Swal.fire({
      title: 'Editar pago',
      html: `
        <select id="payment-method" class="swal2-select">
          <option value="EFECTIVO" ${payment.method === 'EFECTIVO' ? 'selected' : ''}>Efectivo</option>
          <option value="QR" ${payment.method === 'QR' ? 'selected' : ''}>QR</option>
          <option value="YAPE" ${payment.method === 'YAPE' ? 'selected' : ''}>Yape Silvia Navarro</option>
          <option value="VISA" ${payment.method === 'VISA' ? 'selected' : ''}>Visa</option>
        </select>
        <input id="payment-amount" class="swal2-input" inputmode="decimal" value="${Number(payment.amount).toFixed(2)}">
      `,
      showCancelButton: true,
      confirmButtonText: 'Actualizar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const method = (document.getElementById('payment-method') as HTMLSelectElement)?.value as PaymentMethod;
        const amount = this.parseAmount((document.getElementById('payment-amount') as HTMLInputElement)?.value || '');
        if (!method || amount <= 0) {
          Swal.showValidationMessage('Ingresa un metodo y monto valido.');
          return false;
        }
        return { method, amount };
      }
    }).then(result => {
      if (!result.isConfirmed || !result.value) {
        return;
      }
      this.savingHistoryPayment.set(true);
      this.http.put<Sale>(`${this.api}/sales/${sale.id}/payments/${payment.id}`, result.value, this.options()).subscribe({
        next: updated => this.afterHistoryPaymentChange(updated, 'Pago actualizado'),
        error: error => Swal.fire('No se pudo actualizar', this.errorMessage(error), 'error')
      }).add(() => this.savingHistoryPayment.set(false));
    });
  }

  deleteHistoryPayment(sale: Sale, payment: Sale['payments'][number]): void {
    Swal.fire({
      title: 'Revertir pago',
      text: `${payment.methodLabel} · ${this.money(payment.amount)}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Revertir',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }
      this.savingHistoryPayment.set(true);
      this.http.delete<Sale>(`${this.api}/sales/${sale.id}/payments/${payment.id}`, this.options()).subscribe({
        next: updated => this.afterHistoryPaymentChange(updated, 'Pago revertido'),
        error: error => Swal.fire('No se pudo revertir', this.errorMessage(error), 'error')
      }).add(() => this.savingHistoryPayment.set(false));
    });
  }

  deleteAllHistoryPayments(sale: Sale): void {
    Swal.fire({
      title: 'Revertir todos los pagos',
      text: `La cuenta #${sale.id} volvera a pendiente por ${this.money(sale.total)}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Revertir pagos',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }
      this.savingHistoryPayment.set(true);
      const deletes = sale.payments.map(payment =>
        this.http.delete<Sale>(`${this.api}/sales/${sale.id}/payments/${payment.id}`, this.options())
      );
      forkJoin(deletes).subscribe({
        next: updates => this.afterHistoryPaymentChange(updates[updates.length - 1], 'Pagos revertidos'),
        error: error => Swal.fire('No se pudo revertir', this.errorMessage(error), 'error')
      }).add(() => this.savingHistoryPayment.set(false));
    });
  }

  private afterHistoryPaymentChange(updated: Sale, title: string): void {
    this.selectedSale.set(updated);
    this.historyPaymentAmount = '';
    this.loadSales();
    this.loadDashboard();
    Swal.fire(title, `Pendiente: ${this.money(updated.remaining)}`, 'success');
  }

  completeSelectedSale(): void {
    const sale = this.selectedSale();
    if (!sale || this.savingHistoryPayment() || Number(sale.remaining) <= 0) {
      return;
    }
    this.historyPaymentAmount = Number(sale.remaining).toFixed(2);
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
    const paymentsByMethod = this.paymentStatsByMethod(sales);
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
      const paymentSummaryLines = pdf.splitTextToSize(`Cobrado: ${this.money(paid)}   ${this.paymentStatsLine(paymentsByMethod)}`, pageWidth - margin * 2);
      pdf.text(paymentSummaryLines, margin, y);
      y += 5 + paymentSummaryLines.length * 4;
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

  private paymentStatsByMethod(sales: Sale[]): Record<PaymentMethod, { total: number; sales: number }> {
    const stats: Record<PaymentMethod, { total: number; sales: number; saleIds: Set<number> }> = {
      EFECTIVO: { total: 0, sales: 0, saleIds: new Set<number>() },
      QR: { total: 0, sales: 0, saleIds: new Set<number>() },
      YAPE: { total: 0, sales: 0, saleIds: new Set<number>() },
      VISA: { total: 0, sales: 0, saleIds: new Set<number>() }
    };
    sales.forEach(sale => {
      sale.payments.forEach(payment => {
        stats[payment.method].total += Number(payment.amount);
        stats[payment.method].saleIds.add(sale.id);
      });
    });
    return {
      EFECTIVO: { total: stats.EFECTIVO.total, sales: stats.EFECTIVO.saleIds.size },
      QR: { total: stats.QR.total, sales: stats.QR.saleIds.size },
      YAPE: { total: stats.YAPE.total, sales: stats.YAPE.saleIds.size },
      VISA: { total: stats.VISA.total, sales: stats.VISA.saleIds.size }
    };
  }

  private paymentStatsLine(stats: Record<PaymentMethod, { total: number; sales: number }>): string {
    return (['EFECTIVO', 'QR', 'YAPE', 'VISA'] as PaymentMethod[])
      .map(method => `${this.methodLabel(method)}: ${stats[method].sales} ventas / ${this.money(stats[method].total)}`)
      .join('   ');
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
    return sale.payments.map(payment => `${payment.methodLabel}: ${this.money(payment.amount)}`).join(' · ');
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
    const paymentsByMethod = this.paymentStatsByMethod(allSales);
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
    const paymentSummaryLines = pdf.splitTextToSize(`Metodos: ${this.paymentStatsLine(paymentsByMethod)}`, pageWidth - margin * 2);
    pdf.text(paymentSummaryLines, margin, y);
    y += 6 + paymentSummaryLines.length * 4;

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

  closeCash(data: Dashboard): void {
    if (this.savingCashClosure()) {
      return;
    }
    Swal.fire({
      title: data.cashClosure ? 'Actualizar cierre de caja' : 'Cerrar caja',
      html: `
        <div style="display:grid;gap:8px;text-align:left">
          <p style="display:flex;justify-content:space-between;margin:0"><b>Fecha:</b><span>${this.formatReportDate(this.dashboardDate)}</span></p>
          <p style="display:flex;justify-content:space-between;margin:0"><b>Ventas:</b><span>${this.money(data.todaySales)}</span></p>
          <p style="display:flex;justify-content:space-between;margin:0"><b>Cobrado:</b><span>${this.money(this.dashboardTodayPaid(data))}</span></p>
          <p style="display:flex;justify-content:space-between;margin:0"><b>Pendiente del dia:</b><span>${this.money(data.todayPending)}</span></p>
          <textarea id="cash-note" class="swal2-textarea" placeholder="Nota del cierre, diferencias o comentarios">${data.cashClosure?.note || ''}</textarea>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: data.cashClosure ? 'Actualizar cierre' : 'Cerrar caja',
      cancelButtonText: 'Cancelar',
      preConfirm: () => ({
        note: (document.getElementById('cash-note') as HTMLTextAreaElement)?.value || ''
      })
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }
      this.savingCashClosure.set(true);
      this.http.post<CashClosure>(`${this.api}/sales/cash-closure?date=${this.dashboardDate}`, result.value, this.options()).subscribe({
        next: closure => {
          this.dashboard.update(current => current ? { ...current, cashClosure: closure } : current);
          this.loadDashboard();
          Swal.fire('Caja cerrada', `Total cobrado: ${this.money(closure.totalPaid)}`, 'success');
        },
        error: error => Swal.fire('No se pudo cerrar caja', this.errorMessage(error), 'error')
      }).add(() => this.savingCashClosure.set(false));
    });
  }

  downloadCashClosurePdf(data: Dashboard): void {
    const closure = data.cashClosure;
    if (!closure) {
      Swal.fire('Sin cierre', 'Primero cierra caja para descargar el reporte.', 'info');
      return;
    }
    const pdf = new jsPDF('p', 'mm', 'a4');
    const margin = 14;
    let y = 18;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text("Bar D'maced", margin, y);
    y += 8;
    pdf.setFontSize(12);
    pdf.text(`Cierre de caja · ${this.formatReportDate(closure.businessDate)}`, margin, y);
    y += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Cerrado: ${this.formatDateTime(closure.closedAt)} · Usuario: ${closure.closedBy}`, margin, y);
    y += 12;

    const summary = [
      ['Ventas registradas', this.money(closure.totalSales)],
      ['Cobrado en caja', this.money(closure.totalPaid)],
      ['Pendiente del dia', this.money(closure.totalPending)],
      ['Cuentas', `${closure.orders} total · ${closure.paidOrders} pagadas · ${closure.pendingOrders} pendientes`]
    ];
    summary.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(value, 82, y);
      y += 7;
    });

    y += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Medios de pago', margin, y);
    y += 7;
    pdf.setFont('helvetica', 'normal');
    closure.paymentsByMethod.forEach(method => {
      pdf.text(`${method.label}: ${method.sales} ventas · ${this.money(method.total)}`, margin, y);
      y += 6;
    });

    if (closure.note) {
      y += 5;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Nota', margin, y);
      y += 6;
      pdf.setFont('helvetica', 'normal');
      pdf.text(pdf.splitTextToSize(closure.note, 180), margin, y);
    }

    pdf.save(`bar-dmaced-cierre-${closure.businessDate}.pdf`);
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
      <div class="ticket-payments">
        <strong>Forma de pago</strong>
        ${
          sale.payments.length
            ? sale.payments.map(payment => `
              <div class="ticket-payment-line">
                <span>${this.escapeHtml(payment.methodLabel)}</span>
                <b>${this.money(payment.amount)}</b>
              </div>
            `).join('')
            : `<div class="ticket-payment-line muted-line"><span>Sin pagos registrados</span><b>${this.money(0)}</b></div>`
        }
        <div class="ticket-payment-line total-line">
          <span>Total pagado</span>
          <b>${this.money(sale.paid)}</b>
        </div>
      </div>
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

  dashboardBestPaymentMethod(data: Dashboard): string {
    const best = [...data.todayPaymentsByMethod].sort((a, b) => Number(b.total) - Number(a.total))[0];
    if (!best || Number(best.total) === 0) {
      return 'Sin cobros';
    }
    return `${best.label} · ${this.money(best.total)}`;
  }

  paymentMethodTotal(rows: PaymentMethodSummary[]): number {
    return rows.reduce((total, row) => total + Number(row.total), 0);
  }

  paymentMethodPercent(row: PaymentMethodSummary, rows: PaymentMethodSummary[]): number {
    const total = this.paymentMethodTotal(rows);
    return total ? (Number(row.total) / total) * 100 : 0;
  }

  paymentDonutStyle(rows: PaymentMethodSummary[]): string {
    const colors: Record<PaymentMethod, string> = {
      EFECTIVO: '#25745f',
      QR: '#d99d45',
      YAPE: '#425b9f',
      VISA: '#a94336'
    };
    const total = this.paymentMethodTotal(rows);
    if (!total) {
      return 'conic-gradient(#e8dfd1 0 100%)';
    }
    let cursor = 0;
    const segments = rows.map(row => {
      const start = cursor;
      cursor += this.paymentMethodPercent(row, rows);
      return `${colors[row.method]} ${start}% ${cursor}%`;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }

  paymentMethodColor(method: PaymentMethod): string {
    const colors: Record<PaymentMethod, string> = {
      EFECTIVO: '#25745f',
      QR: '#d99d45',
      YAPE: '#425b9f',
      VISA: '#a94336'
    };
    return colors[method];
  }

  paymentMethodMax(rows: PaymentMethodSummary[]): number {
    return Math.max(1, ...rows.map(row => Number(row.total)));
  }

  paymentMethodWidth(row: PaymentMethodSummary, rows: PaymentMethodSummary[]): number {
    return (Number(row.total) / this.paymentMethodMax(rows)) * 100;
  }

  paymentMethodDetail(row: PaymentMethodSummary): string {
    return `${row.sales} venta${Number(row.sales) === 1 ? '' : 's'} · ${row.payments} pago${Number(row.payments) === 1 ? '' : 's'}`;
  }

  loadStaff(): void {
    this.staffRequest(() => forkJoin({
      roles: this.http.get<StaffRole[]>(`${this.api}/staff/roles`, this.options()),
      employees: this.http.get<Employee[]>(`${this.api}/staff/employees`, this.options())
    })).subscribe({
      next: ({ roles, employees }) => {
        const uniqueRoles = this.uniqueStaffRoles(roles);
        this.staffRoles.set(uniqueRoles);
        this.employees.set(employees);
        if (!this.employeeForm.roleId && uniqueRoles.length) {
          this.employeeForm.roleId = uniqueRoles[0].id;
        }
        if (!this.selectedEmployeeId() && employees.length) {
          this.selectEmployee(employees[0]);
        }
        this.loadStaffWeek(false);
      },
      error: error => Swal.fire('No se pudo cargar personal', this.errorMessage(error), 'error')
    });
  }

  loadStaffWeek(showError = true): void {
    this.staffRequest(() => this.http.get<StaffWeek>(`${this.api}/staff/week?date=${this.staffWeekDate}`, this.options())).subscribe({
      next: week => this.staffWeek.set(week),
      error: error => {
        this.staffWeek.set(null);
        if (showError) {
          Swal.fire('No se pudo cargar horario', this.errorMessage(error), 'error');
        }
      }
    });
  }

  openRoleDialog(): void {
    Swal.fire({
      title: 'Crear rol',
      html: `
        <div class="pos-modal-form">
          <label>Nombre del rol</label>
          <input id="staff-role-name" placeholder="Anfitrion, cajero...">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const name = (document.getElementById('staff-role-name') as HTMLInputElement)?.value.trim();
        if (!name) {
          Swal.showValidationMessage('Escribe el nombre del rol.');
          return false;
        }
        return { name };
      }
    }).then(result => {
      if (!result.isConfirmed || !result.value) {
        return;
      }
      this.savingStaff.set(true);
      this.staffRequest(() => this.http.post<StaffRole>(`${this.api}/staff/roles`, result.value, this.options())).subscribe({
        next: role => {
          this.employeeForm.roleId = role.id;
          this.loadStaff();
          Swal.fire('Rol guardado', 'Ya puedes asignarlo a un colaborador.', 'success');
        },
        error: error => Swal.fire('No se pudo guardar', this.errorMessage(error), 'error')
      }).add(() => this.savingStaff.set(false));
    });
  }

  openEmployeeDialog(employee?: Employee): void {
    const roles = this.staffRoles();
    if (!roles.length) {
      Swal.fire('Sin roles', 'Primero crea un rol para asignar colaboradores.', 'info');
      return;
    }
    const selectedRole = employee?.roleId || this.employeeForm.roleId || roles[0].id;
    const roleOptions = roles
      .map(role => `<option value="${role.id}" ${role.id === selectedRole ? 'selected' : ''}>${this.escapeHtml(role.name)}</option>`)
      .join('');
    Swal.fire({
      title: employee ? 'Editar colaborador' : 'Agregar colaborador',
      html: `
        <div class="pos-modal-form">
          <label>Nombre</label>
          <input id="employee-name" value="${this.escapeHtml(employee?.name || '')}" placeholder="Nombre del colaborador">
          <label>Rol</label>
          <select id="employee-role">${roleOptions}</select>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const name = (document.getElementById('employee-name') as HTMLInputElement)?.value.trim();
        const roleId = Number((document.getElementById('employee-role') as HTMLSelectElement)?.value);
        if (!name || !roleId) {
          Swal.showValidationMessage('Ingresa nombre y rol.');
          return false;
        }
        return {
          name,
          roleId,
          active: employee?.active ?? true,
          inactiveReason: employee?.inactiveReason || ''
        };
      }
    }).then(result => {
      if (!result.isConfirmed || !result.value) {
        return;
      }
      this.savingStaff.set(true);
      const request = this.staffRequest(() => employee
        ? this.http.put<Employee>(`${this.api}/staff/employees/${employee.id}`, result.value, this.options())
        : this.http.post<Employee>(`${this.api}/staff/employees`, result.value, this.options()));
      request.subscribe({
        next: saved => {
          this.loadStaff();
          this.selectEmployee(saved);
          Swal.fire('Colaborador guardado', 'El horario ya puede administrarse.', 'success');
        },
        error: error => Swal.fire('No se pudo guardar', this.errorMessage(error), 'error')
      }).add(() => this.savingStaff.set(false));
    });
  }

  openExceptionDialog(exception?: StaffException): void {
    const employee = this.selectedEmployee();
    const employees = this.employees().filter(item => item.active || item.id === exception?.employeeId);
    if (!employees.length) {
      Swal.fire('Sin colaboradores', 'Agrega un colaborador activo para registrar excepciones.', 'info');
      return;
    }
    const selectedEmployeeId = exception?.employeeId || employee?.id || employees[0].id;
    const employeeOptions = employees
      .map(item => `<option value="${item.id}" ${item.id === selectedEmployeeId ? 'selected' : ''}>${this.escapeHtml(item.name)}</option>`)
      .join('');
    const typeOptions = this.staffExceptionTypes()
      .map(type => `<option value="${type.value}" ${type.value === (exception?.type || 'PERMISO') ? 'selected' : ''}>${type.label}</option>`)
      .join('');
    Swal.fire({
      title: exception ? 'Editar excepción' : 'Agregar excepción',
      html: `
        <div class="pos-modal-form compact-modal-form">
          <label>Colaborador</label>
          <select id="exception-employee">${employeeOptions}</select>
          <label>Tipo</label>
          <select id="exception-type">${typeOptions}</select>
          <div class="modal-grid">
            <div>
              <label>Desde</label>
              <input id="exception-start" type="date" value="${exception?.startDate || this.currentDateInput()}">
            </div>
            <div>
              <label>Hasta</label>
              <input id="exception-end" type="date" value="${exception?.endDate || this.currentDateInput()}">
            </div>
          </div>
          <label>Hora si es cambio de turno</label>
          <input id="exception-time" type="time" value="${exception?.startTime || '18:00'}">
          <label>Nota</label>
          <textarea id="exception-note" placeholder="Motivo o detalle">${this.escapeHtml(exception?.note || '')}</textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const employeeId = Number((document.getElementById('exception-employee') as HTMLSelectElement)?.value);
        const type = (document.getElementById('exception-type') as HTMLSelectElement)?.value as StaffExceptionType;
        const startDate = (document.getElementById('exception-start') as HTMLInputElement)?.value;
        const endDate = (document.getElementById('exception-end') as HTMLInputElement)?.value;
        const startTime = (document.getElementById('exception-time') as HTMLInputElement)?.value;
        const note = (document.getElementById('exception-note') as HTMLTextAreaElement)?.value.trim();
        if (!employeeId || !type || !startDate || !endDate) {
          Swal.showValidationMessage('Completa colaborador, tipo y fechas.');
          return false;
        }
        if (type === 'CAMBIO_TURNO' && !startTime) {
          Swal.showValidationMessage('Ingresa la nueva hora de entrada.');
          return false;
        }
        return {
          employeeId,
          type,
          startDate,
          endDate,
          startTime: type === 'CAMBIO_TURNO' ? startTime : null,
          note
        };
      }
    }).then(result => {
      if (!result.isConfirmed || !result.value) {
        return;
      }
      this.savingStaff.set(true);
      const request = exception
        ? this.http.put<StaffException>(`${this.api}/staff/exceptions/${exception.id}`, result.value, this.options())
        : this.http.post<StaffException>(`${this.api}/staff/exceptions`, result.value, this.options());
      request.subscribe({
        next: saved => {
          const selected = this.employees().find(item => item.id === saved.employeeId);
          if (selected) {
            this.selectEmployee(selected);
          } else if (this.selectedEmployeeId()) {
            this.loadEmployeeDetails(this.selectedEmployeeId()!);
          }
          this.loadStaffWeek();
          Swal.fire('Excepción guardada', 'El horario semanal fue actualizado.', 'success');
        },
        error: error => Swal.fire('No se pudo guardar', this.errorMessage(error), 'error')
      }).add(() => this.savingStaff.set(false));
    });
  }

  saveRole(): void {
    const name = this.roleName.trim();
    if (!name) {
      Swal.fire('Rol vacío', 'Escribe el nombre del rol.', 'warning');
      return;
    }
    this.savingStaff.set(true);
    this.http.post<StaffRole>(`${this.api}/staff/roles`, { name }, this.options()).subscribe({
      next: role => {
        this.roleName = '';
        this.employeeForm.roleId = role.id;
        this.loadStaff();
        Swal.fire('Rol guardado', 'Ya puedes asignarlo a un colaborador.', 'success');
      },
      error: error => Swal.fire('No se pudo guardar', this.errorMessage(error), 'error')
    }).add(() => this.savingStaff.set(false));
  }

  saveEmployee(): void {
    if (!this.employeeForm.name.trim() || !this.employeeForm.roleId) {
      Swal.fire('Datos incompletos', 'Ingresa nombre y rol del colaborador.', 'warning');
      return;
    }
    this.savingStaff.set(true);
    const payload = {
      name: this.employeeForm.name.trim(),
      roleId: Number(this.employeeForm.roleId),
      active: this.employeeForm.active,
      inactiveReason: this.employeeForm.inactiveReason
    };
    const request = this.employeeForm.id
      ? this.http.put<Employee>(`${this.api}/staff/employees/${this.employeeForm.id}`, payload, this.options())
      : this.http.post<Employee>(`${this.api}/staff/employees`, payload, this.options());
    request.subscribe({
      next: employee => {
        this.resetEmployeeForm();
        this.loadStaff();
        this.selectEmployee(employee);
        Swal.fire('Colaborador guardado', 'El horario base quedó listo para editar.', 'success');
      },
      error: error => Swal.fire('No se pudo guardar', this.errorMessage(error), 'error')
    }).add(() => this.savingStaff.set(false));
  }

  editEmployee(employee: Employee): void {
    this.employeeForm = {
      id: employee.id,
      name: employee.name,
      roleId: employee.roleId,
      active: employee.active,
      inactiveReason: employee.inactiveReason || ''
    };
    this.selectEmployee(employee);
  }

  resetEmployeeForm(): void {
    this.employeeForm = {
      id: 0,
      name: '',
      roleId: this.staffRoles()[0]?.id || 0,
      active: true,
      inactiveReason: ''
    };
  }

  selectEmployee(employee: Employee): void {
    this.selectedEmployeeId.set(employee.id);
    this.exceptionForm.employeeId = employee.id;
    this.loadEmployeeDetails(employee.id);
  }

  loadEmployeeDetails(employeeId: number): void {
    forkJoin({
      schedule: this.http.get<StaffSchedule[]>(`${this.api}/staff/employees/${employeeId}/schedule`, this.options()),
      exceptions: this.http.get<StaffException[]>(`${this.api}/staff/employees/${employeeId}/exceptions`, this.options())
    }).subscribe({
      next: ({ schedule, exceptions }) => {
        this.employeeSchedule.set(this.sortSchedule(schedule));
        this.employeeExceptions.set(exceptions);
      },
      error: error => Swal.fire('No se pudo cargar detalle', this.errorMessage(error), 'error')
    });
  }

  updateSchedule(day: StaffSchedule): void {
    const employeeId = this.selectedEmployeeId();
    if (!employeeId) {
      return;
    }
    const payload = {
      dayOfWeek: day.dayOfWeek,
      working: day.working,
      startTime: day.working ? day.startTime || '18:00' : null
    };
    this.http.put<StaffSchedule>(`${this.api}/staff/employees/${employeeId}/schedule`, payload, this.options()).subscribe({
      next: updated => {
        this.employeeSchedule.set(this.sortSchedule(this.employeeSchedule().map(item => item.dayOfWeek === updated.dayOfWeek ? updated : item)));
        this.loadStaffWeek();
      },
      error: error => Swal.fire('No se pudo actualizar horario', this.errorMessage(error), 'error')
    });
  }

  saveException(): void {
    if (!this.exceptionForm.employeeId) {
      Swal.fire('Selecciona colaborador', 'Elige a quien aplica la excepción.', 'warning');
      return;
    }
    this.savingStaff.set(true);
    const payload = {
      employeeId: Number(this.exceptionForm.employeeId),
      type: this.exceptionForm.type,
      startDate: this.exceptionForm.startDate,
      endDate: this.exceptionForm.endDate,
      startTime: this.exceptionForm.type === 'CAMBIO_TURNO' ? this.exceptionForm.startTime : null,
      note: this.exceptionForm.note
    };
    const request = this.exceptionForm.id
      ? this.http.put<StaffException>(`${this.api}/staff/exceptions/${this.exceptionForm.id}`, payload, this.options())
      : this.http.post<StaffException>(`${this.api}/staff/exceptions`, payload, this.options());
    request.subscribe({
      next: () => {
        this.resetExceptionForm();
        const employeeId = this.selectedEmployeeId();
        if (employeeId) {
          this.loadEmployeeDetails(employeeId);
        }
        this.loadStaffWeek();
        Swal.fire('Excepción guardada', 'El horario semanal fue actualizado.', 'success');
      },
      error: error => Swal.fire('No se pudo guardar', this.errorMessage(error), 'error')
    }).add(() => this.savingStaff.set(false));
  }

  editException(exception: StaffException): void {
    this.exceptionForm = {
      id: exception.id,
      employeeId: exception.employeeId,
      type: exception.type,
      startDate: exception.startDate,
      endDate: exception.endDate,
      startTime: exception.startTime || '18:00',
      note: exception.note || ''
    };
    const employee = this.employees().find(item => item.id === exception.employeeId);
    if (employee) {
      this.selectEmployee(employee);
    }
  }

  deleteException(exception: StaffException): void {
    Swal.fire({
      title: 'Eliminar excepción',
      text: `${exception.employeeName} · ${exception.typeLabel}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }
      this.http.delete(`${this.api}/staff/exceptions/${exception.id}`, this.options()).subscribe({
        next: () => {
          const employeeId = this.selectedEmployeeId();
          if (employeeId) {
            this.loadEmployeeDetails(employeeId);
          }
          this.loadStaffWeek();
        },
        error: error => Swal.fire('No se pudo eliminar', this.errorMessage(error), 'error')
      });
    });
  }

  toggleEmployeeStatus(employee: Employee): void {
    if (employee.active) {
      Swal.fire({
        title: 'Desactivar colaborador',
        input: 'textarea',
        inputPlaceholder: 'Motivo de salida o pausa...',
        showCancelButton: true,
        confirmButtonText: 'Desactivar',
        cancelButtonText: 'Cancelar',
        inputValidator: value => !value?.trim() ? 'Ingresa el motivo.' : null
      }).then(result => {
        if (!result.isConfirmed) {
          return;
        }
        this.updateEmployeeStatus(employee, false, result.value || '');
      });
      return;
    }
    this.updateEmployeeStatus(employee, true, '');
  }

  updateEmployeeStatus(employee: Employee, active: boolean, inactiveReason: string): void {
    this.http.patch<Employee>(`${this.api}/staff/employees/${employee.id}/status`, { active, inactiveReason }, this.options()).subscribe({
      next: () => this.loadStaff(),
      error: error => Swal.fire('No se pudo actualizar', this.errorMessage(error), 'error')
    });
  }

  async downloadStaffScheduleImage(): Promise<void> {
    const element = document.getElementById('staff-schedule-board');
    if (!element) {
      return;
    }
    const canvas = await html2canvas(element, { backgroundColor: '#ffffff', scale: 2 });
    const link = document.createElement('a');
    link.download = `bar-dmaced-horario-${this.staffWeek()?.weekStart || this.staffWeekDate}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  resetExceptionForm(): void {
    this.exceptionForm = {
      id: 0,
      employeeId: this.selectedEmployeeId() || this.employees()[0]?.id || 0,
      type: 'PERMISO',
      startDate: this.currentDateInput(),
      endDate: this.currentDateInput(),
      startTime: '18:00',
      note: ''
    };
  }

  staffExceptionTypes(): Array<{ value: StaffExceptionType; label: string }> {
    return [
      { value: 'PERMISO', label: 'Permiso' },
      { value: 'FALTA', label: 'Falta' },
      { value: 'DESCANSO', label: 'Descanso' },
      { value: 'VACACIONES', label: 'Vacaciones' },
      { value: 'CAMBIO_TURNO', label: 'Cambio de turno' }
    ];
  }

  dayName(day: string): string {
    const labels: Record<string, string> = {
      MONDAY: 'Lun',
      TUESDAY: 'Mar',
      WEDNESDAY: 'Mié',
      THURSDAY: 'Jue',
      FRIDAY: 'Vie',
      SATURDAY: 'Sáb',
      SUNDAY: 'Dom'
    };
    return labels[day] || day;
  }

  staffWeekDays(week: StaffWeek): StaffWeek['rows'][number]['days'] {
    if (week.rows[0]?.days?.length) {
      return week.rows[0].days;
    }
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    const start = new Date(`${week.weekStart}T00:00:00`);
    return days.map((dayOfWeek, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        date: this.dateInputFromDate(date),
        dayOfWeek,
        working: false,
        status: '',
        note: ''
      };
    });
  }

  fullDayName(day: string): string {
    const labels: Record<string, string> = {
      MONDAY: 'Lunes',
      TUESDAY: 'Martes',
      WEDNESDAY: 'Miércoles',
      THURSDAY: 'Jueves',
      FRIDAY: 'Viernes',
      SATURDAY: 'Sábado',
      SUNDAY: 'Domingo'
    };
    return labels[day] || day;
  }

  staffDayClass(day: StaffWeek['rows'][number]['days'][number]): string {
    if (day.exceptionType === 'VACACIONES') {
      return 'vacation';
    }
    if (day.exceptionType === 'FALTA') {
      return 'absent';
    }
    if (day.exceptionType === 'PERMISO') {
      return 'permission';
    }
    if (day.exceptionType === 'CAMBIO_TURNO') {
      return 'changed';
    }
    return day.working ? 'working' : 'rest';
  }

  selectedEmployee(): Employee | null {
    const id = this.selectedEmployeeId();
    return this.employees().find(employee => employee.id === id) || null;
  }

  activeEmployeesCount(): number {
    return this.employees().filter(employee => employee.active).length;
  }

  private uniqueStaffRoles(roles: StaffRole[]): StaffRole[] {
    const seen = new Set<string>();
    return roles.filter(role => {
      const key = this.normalize(role.name);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private sortSchedule(schedule: StaffSchedule[]): StaffSchedule[] {
    const order = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    return [...schedule].sort((a, b) => order.indexOf(a.dayOfWeek) - order.indexOf(b.dayOfWeek));
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
    if (!this.promoActive || !product.promoEligible || this.isFlexibleChargeProduct(product)) {
      return false;
    }
    if (['COMBO_COMIDA', 'PONCHERA_1_5', 'PONCHERA_3'].includes(product.category)) {
      return false;
    }
    return this.promoScope === 'ALL' || this.promoScope === product.category;
  }

  isFlexibleChargeProduct(product: Product): boolean {
    const name = this.normalize(product.name);
    return name === 'adicional' || name === 'copa rota';
  }

  estimatedPromoDiscount(): number {
    if (!this.promoActive) {
      return 0;
    }
    const units = this.cart().flatMap(item =>
      this.isPromoProduct(item.product)
        ? Array.from({ length: item.quantity }, () => Number(item.unitPrice))
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
    this.additionalAmount = '';
    this.brokenGlassAmount = '';
  }

  money(value: number): string {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value || 0));
  }

  methodLabel(method: PaymentMethod): string {
    if (method === 'EFECTIVO') {
      return 'Efectivo';
    }
    if (method === 'QR') {
      return 'QR';
    }
    if (method === 'YAPE') {
      return 'Yape Silvia Navarro';
    }
    return 'Visa';
  }

  private staffRequest<T>(requestFactory: () => Observable<T>): Observable<T> {
    return requestFactory().pipe(
      catchError(error => {
        if (error?.status !== 401 && error?.status !== 403) {
          return throwError(() => error);
        }
        return this.http.post<AuthResponse>(`${this.api}/auth/refresh`, {}, this.options()).pipe(
          switchMap(response => {
            this.storeSession(response);
            return requestFactory();
          }),
          catchError(refreshError => {
            this.logout();
            Swal.fire('Sesion vencida', 'Vuelve a iniciar sesion para administrar personal.', 'warning');
            return throwError(() => refreshError);
          })
        );
      })
    );
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
    return this.dateInputFromDate(now);
  }

  private dateInputFromDate(value: Date): string {
    const now = value;
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
