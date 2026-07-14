package com.dmaced.pos.sale;

import com.dmaced.pos.product.Product;
import com.dmaced.pos.product.ProductCategory;
import com.dmaced.pos.product.ProductRepository;
import com.dmaced.pos.sale.SaleDtos.DailySummary;
import com.dmaced.pos.sale.SaleDtos.DashboardResponse;
import com.dmaced.pos.sale.SaleDtos.PaymentMethodSummary;
import com.dmaced.pos.sale.SaleDtos.PaymentRequest;
import com.dmaced.pos.sale.SaleDtos.PaymentResponse;
import com.dmaced.pos.sale.SaleDtos.SaleItemResponse;
import com.dmaced.pos.sale.SaleDtos.SaleRequest;
import com.dmaced.pos.sale.SaleDtos.SaleResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SaleService {
  private static final BigDecimal ZERO = BigDecimal.ZERO;
  private static final ZoneId APP_ZONE = ZoneId.of(System.getenv().getOrDefault("APP_TIMEZONE", "America/Lima"));

  private final SaleRepository saleRepository;
  private final ProductRepository productRepository;

  public SaleService(SaleRepository saleRepository, ProductRepository productRepository) {
    this.saleRepository = saleRepository;
    this.productRepository = productRepository;
  }

  @Transactional
  public SaleResponse create(SaleRequest request) {
    Sale sale = new Sale();
    sale.setCreatedAt(resolveCreatedAt(request));
    applySaleRequest(sale, request);
    if (request.payments() != null) {
      request.payments().forEach(payment -> addPaymentEntity(sale, payment));
    }
    recalculatePayments(sale);
    rejectOverpayment(sale);
    return toResponse(saleRepository.save(sale));
  }

  @Transactional
  public SaleResponse update(Long saleId, SaleRequest request) {
    Sale sale = saleRepository.findById(saleId).orElseThrow();
    updateSaleDate(sale, request);
    sale.getItems().clear();
    applySaleRequest(sale, request);
    recalculatePayments(sale);
    rejectOverpayment(sale);
    return toResponse(saleRepository.save(sale));
  }

  @Transactional
  public SaleResponse addPayment(Long saleId, PaymentRequest request) {
    Sale sale = saleRepository.findById(saleId).orElseThrow();
    recalculatePayments(sale);
    if (request.amount().compareTo(sale.getRemaining()) > 0) {
      throw new IllegalArgumentException("El pago no puede superar el saldo pendiente.");
    }
    addPaymentEntity(sale, request);
    recalculatePayments(sale);
    return toResponse(sale);
  }

  @Transactional
  public SaleResponse updatePayment(Long saleId, Long paymentId, PaymentRequest request) {
    Sale sale = saleRepository.findById(saleId).orElseThrow();
    SalePayment payment = findPayment(sale, paymentId);
    payment.setMethod(request.method());
    payment.setAmount(request.amount());
    recalculatePayments(sale);
    rejectOverpayment(sale);
    return toResponse(sale);
  }

  @Transactional
  public SaleResponse deletePayment(Long saleId, Long paymentId) {
    Sale sale = saleRepository.findById(saleId).orElseThrow();
    SalePayment payment = findPayment(sale, paymentId);
    sale.getPayments().remove(payment);
    payment.setSale(null);
    recalculatePayments(sale);
    return toResponse(sale);
  }

  @Transactional(readOnly = true)
  public SaleResponse get(Long id) {
    return saleRepository.findById(id).map(this::toResponse).orElseThrow();
  }

  @Transactional(readOnly = true)
  public List<SaleResponse> byDate(LocalDate date) {
    return saleRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(date.atStartOfDay(), date.atTime(LocalTime.MAX))
        .stream().map(this::toResponse).toList();
  }

  @Transactional(readOnly = true)
  public List<SaleResponse> recent() {
    return saleRepository.findTop50ByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
  }

  @Transactional
  public void delete(Long saleId) {
    saleRepository.deleteById(saleId);
  }

  @Transactional(readOnly = true)
  public DashboardResponse dashboard(LocalDate referenceDate) {
    LocalDate reportDate = referenceDate == null ? LocalDate.now(APP_ZONE) : referenceDate;
    LocalDate weekStart = reportDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    LocalDate monthStart = reportDate.withDayOfMonth(1);

    List<Sale> monthSales = saleRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(
        monthStart.atStartOfDay(), reportDate.atTime(LocalTime.MAX));
    List<Sale> weekSales = monthSales.stream()
        .filter(sale -> !sale.getCreatedAt().toLocalDate().isBefore(weekStart))
        .toList();
    List<Sale> daySales = monthSales.stream()
        .filter(sale -> sale.getCreatedAt().toLocalDate().equals(reportDate))
        .toList();
    List<Sale> weekPayments = saleRepository.findDistinctByPaymentsPaidAtBetweenOrderByCreatedAtDesc(
        weekStart.atStartOfDay(), reportDate.atTime(LocalTime.MAX));
    List<Sale> dayPayments = weekPayments.stream()
        .filter(sale -> sale.getPayments().stream()
            .anyMatch(payment -> payment.getPaidAt() != null && payment.getPaidAt().toLocalDate().equals(reportDate)))
        .toList();
    List<Sale> monthPayments = saleRepository.findDistinctByPaymentsPaidAtBetweenOrderByCreatedAtDesc(
        monthStart.atStartOfDay(), reportDate.atTime(LocalTime.MAX));

    List<DailySummary> weekByDay = new ArrayList<>();
    for (int i = 0; i < 7; i++) {
      LocalDate date = weekStart.plusDays(i);
      List<Sale> salesForWeekDay = weekSales.stream()
          .filter(sale -> sale.getCreatedAt().toLocalDate().equals(date))
          .toList();
      weekByDay.add(new DailySummary(date, sumTotal(salesForWeekDay), sumPaymentsOnDate(weekPayments, date), salesForWeekDay.size()));
    }

    return new DashboardResponse(
        sumTotal(daySales),
        sumTotal(weekSales),
        sumTotal(monthSales),
        monthSales.stream().map(Sale::getRemaining).reduce(ZERO, BigDecimal::add),
        daySales.size(),
        weekByDay,
        summarizePaymentsByMethod(dayPayments, reportDate.atStartOfDay(), reportDate.atTime(LocalTime.MAX)),
        summarizePaymentsByMethod(weekPayments, weekStart.atStartOfDay(), reportDate.atTime(LocalTime.MAX)),
        summarizePaymentsByMethod(monthPayments, monthStart.atStartOfDay(), reportDate.atTime(LocalTime.MAX)));
  }

  private boolean containsTakeawayContainer(SaleRequest request) {
    return request.items().stream().anyMatch(item -> {
      Product product = productRepository.findById(item.productId()).orElseThrow();
      return product.getCategory() == ProductCategory.TAPER || product.getCategory() == ProductCategory.VASO;
    });
  }

  private LocalDateTime resolveCreatedAt(SaleRequest request) {
    if (request.saleDate() == null) {
      return LocalDateTime.now(APP_ZONE);
    }
    return request.saleDate().atTime(LocalTime.now(APP_ZONE));
  }

  private void updateSaleDate(Sale sale, SaleRequest request) {
    if (request.saleDate() == null) {
      return;
    }
    LocalTime time = sale.getCreatedAt() == null ? LocalTime.now(APP_ZONE) : sale.getCreatedAt().toLocalTime();
    sale.setCreatedAt(request.saleDate().atTime(time));
  }

  private void applySaleRequest(Sale sale, SaleRequest request) {
    boolean takeaway = request.takeaway() || containsTakeawayContainer(request);
    sale.setTakeaway(takeaway);
    sale.setServiceLocation(normalizeServiceLocation(request.serviceLocation(), takeaway));
    sale.setPromoActive(request.promoActive());
    sale.setManualDiscountPercent(normalizePercent(request.discountPercent()));

    for (var itemRequest : request.items()) {
      Product product = productRepository.findById(itemRequest.productId()).orElseThrow();
      SaleItem item = new SaleItem();
      item.setSale(sale);
      item.setProductId(product.getId());
      item.setProductName(product.getName());
      item.setCategory(product.getCategory());
      BigDecimal unitPrice = resolveUnitPrice(product, itemRequest.unitPrice());
      item.setUnitPrice(unitPrice);
      item.setQuantity(itemRequest.quantity());
      item.setLineTotal(unitPrice.multiply(BigDecimal.valueOf(itemRequest.quantity())));
      item.setPromoEligible(isPromoEligible(product, request.promoCategories()));
      item.setNote(cleanNote(itemRequest.note()));
      sale.getItems().add(item);
    }

    recalculateTotals(sale);
  }

  private boolean isPromoEligible(Product product, Set<ProductCategory> promoCategories) {
    if (!product.isPromoEligible()) {
      return false;
    }
    if (product.getCategory() == ProductCategory.COMBO_COMIDA
        || product.getCategory() == ProductCategory.PONCHERA_1_5
        || product.getCategory() == ProductCategory.PONCHERA_3) {
      return false;
    }
    return promoCategories == null || promoCategories.isEmpty() || promoCategories.contains(product.getCategory());
  }

  private void recalculateTotals(Sale sale) {
    BigDecimal subtotal = sale.getItems().stream().map(SaleItem::getLineTotal).reduce(ZERO, BigDecimal::add);
    BigDecimal promoDiscount = sale.isPromoActive() ? calculateThreeForTwoDiscount(sale.getItems()) : ZERO;
    BigDecimal baseAfterPromo = subtotal.subtract(promoDiscount).max(ZERO);
    BigDecimal manualDiscount = baseAfterPromo
        .multiply(sale.getManualDiscountPercent())
        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    sale.setSubtotal(subtotal);
    sale.setPromoDiscount(promoDiscount);
    sale.setManualDiscountAmount(manualDiscount);
    sale.setTotal(baseAfterPromo.subtract(manualDiscount).max(ZERO));
  }

  private BigDecimal normalizePercent(BigDecimal percent) {
    if (percent == null || percent.compareTo(ZERO) < 0) {
      return ZERO;
    }
    if (percent.compareTo(BigDecimal.valueOf(100)) > 0) {
      return BigDecimal.valueOf(100);
    }
    return percent;
  }

  private String cleanNote(String note) {
    if (note == null || note.isBlank()) {
      return null;
    }
    return note.trim();
  }

  private String normalizeServiceLocation(String location, boolean takeaway) {
    if (takeaway) {
      return "PARA_LLEVAR";
    }
    if (location == null || location.isBlank()) {
      return "A1";
    }
    String normalized = location.trim().toUpperCase();
    if (normalized.matches("[AB]([1-9]|10)")) {
      return normalized;
    }
    return "A1";
  }

  private BigDecimal calculateThreeForTwoDiscount(List<SaleItem> items) {
    List<BigDecimal> unitPrices = new ArrayList<>();
    for (SaleItem item : items) {
      if (item.isPromoEligible()) {
        for (int i = 0; i < item.getQuantity(); i++) {
          unitPrices.add(item.getUnitPrice());
        }
      }
    }
    unitPrices.sort(Comparator.reverseOrder());

    BigDecimal normal = unitPrices.stream().reduce(ZERO, BigDecimal::add);
    BigDecimal charged = ZERO;
    for (int i = 0; i < unitPrices.size(); i += 3) {
      int end = Math.min(i + 3, unitPrices.size());
      List<BigDecimal> group = unitPrices.subList(i, end);
      if (group.size() == 3) {
        charged = charged.add(group.get(0).multiply(BigDecimal.valueOf(2)));
      } else {
        charged = charged.add(group.stream().reduce(ZERO, BigDecimal::add));
      }
    }
    return normal.subtract(charged).max(ZERO);
  }

  private void addPaymentEntity(Sale sale, PaymentRequest request) {
    SalePayment payment = new SalePayment();
    payment.setSale(sale);
    payment.setMethod(request.method());
    payment.setAmount(request.amount());
    payment.setPaidAt(LocalDateTime.now(APP_ZONE));
    sale.getPayments().add(payment);
  }

  private SalePayment findPayment(Sale sale, Long paymentId) {
    return sale.getPayments().stream()
        .filter(payment -> payment.getId().equals(paymentId))
        .findFirst()
        .orElseThrow();
  }

  private BigDecimal resolveUnitPrice(Product product, BigDecimal requestedPrice) {
    if (requestedPrice == null) {
      return product.getPrice();
    }
    return requestedPrice.max(ZERO).setScale(2, RoundingMode.HALF_UP);
  }

  private void rejectOverpayment(Sale sale) {
    if (sale.getPaid().compareTo(sale.getTotal()) > 0) {
      throw new IllegalArgumentException("Los pagos no pueden superar el total de la cuenta.");
    }
  }

  private void recalculatePayments(Sale sale) {
    BigDecimal paid = sale.getPayments().stream().map(SalePayment::getAmount).reduce(ZERO, BigDecimal::add);
    sale.setPaid(paid);
    sale.setRemaining(sale.getTotal().subtract(paid).max(ZERO));
    sale.setStatus(sale.getRemaining().compareTo(ZERO) == 0 ? SaleStatus.PAGADA : SaleStatus.PENDIENTE);
  }

  private BigDecimal sumTotal(List<Sale> sales) {
    return sales.stream().map(Sale::getTotal).reduce(ZERO, BigDecimal::add);
  }

  private BigDecimal sumPaid(List<Sale> sales) {
    return sales.stream().map(Sale::getPaid).reduce(ZERO, BigDecimal::add);
  }

  private BigDecimal sumPaymentsOnDate(List<Sale> sales, LocalDate date) {
    return sales.stream()
        .flatMap(sale -> sale.getPayments().stream())
        .filter(payment -> payment.getPaidAt() != null && payment.getPaidAt().toLocalDate().equals(date))
        .map(SalePayment::getAmount)
        .reduce(ZERO, BigDecimal::add);
  }

  private List<PaymentMethodSummary> summarizePaymentsByMethod(List<Sale> sales, LocalDateTime from, LocalDateTime to) {
    Map<PaymentMethod, BigDecimal> totals = new EnumMap<>(PaymentMethod.class);
    Map<PaymentMethod, Long> payments = new EnumMap<>(PaymentMethod.class);
    Map<PaymentMethod, Set<Long>> saleIds = new EnumMap<>(PaymentMethod.class);

    for (PaymentMethod method : PaymentMethod.values()) {
      totals.put(method, ZERO);
      payments.put(method, 0L);
      saleIds.put(method, new HashSet<>());
    }

    sales.forEach(sale -> sale.getPayments().stream()
        .filter(payment -> payment.getPaidAt() != null)
        .filter(payment -> !payment.getPaidAt().isBefore(from) && !payment.getPaidAt().isAfter(to))
        .forEach(payment -> {
          PaymentMethod method = payment.getMethod();
          totals.put(method, totals.get(method).add(payment.getAmount()));
          payments.put(method, payments.get(method) + 1);
          saleIds.get(method).add(sale.getId());
        }));

    List<PaymentMethodSummary> summaries = new ArrayList<>();
    for (PaymentMethod method : PaymentMethod.values()) {
      summaries.add(new PaymentMethodSummary(
          method,
          method.getLabel(),
          saleIds.get(method).size(),
          payments.get(method),
          totals.get(method)));
    }
    return summaries;
  }

  private SaleResponse toResponse(Sale sale) {
    return new SaleResponse(
        sale.getId(),
        sale.getCreatedAt(),
        sale.isTakeaway(),
        sale.getServiceLocation(),
        sale.isPromoActive(),
        sale.getSubtotal(),
        sale.getPromoDiscount(),
        sale.getManualDiscountPercent(),
        sale.getManualDiscountAmount(),
        sale.getTotal(),
        sale.getPaid(),
        sale.getRemaining(),
        sale.getStatus(),
        sale.getItems().stream().map(this::toItemResponse).toList(),
        sale.getPayments().stream().map(this::toPaymentResponse).toList());
  }

  private SaleItemResponse toItemResponse(SaleItem item) {
    return new SaleItemResponse(
        item.getId(),
        item.getProductId(),
        item.getProductName(),
        item.getCategory(),
        item.getCategory().getLabel(),
        item.getUnitPrice(),
        item.getQuantity(),
        item.getLineTotal(),
        item.isPromoEligible(),
        item.getNote());
  }

  private PaymentResponse toPaymentResponse(SalePayment payment) {
    return new PaymentResponse(
        payment.getId(),
        payment.getMethod(),
        payment.getMethod().getLabel(),
        payment.getAmount(),
        payment.getPaidAt());
  }
}
