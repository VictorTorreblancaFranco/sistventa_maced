package com.dmaced.pos.sale;

import com.dmaced.pos.product.ProductCategory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

public class SaleDtos {
  public record SaleItemRequest(
      @NotNull Long productId,
      @Min(1) int quantity,
      String note,
      @DecimalMin("0.00") BigDecimal unitPrice) {}

  public record PaymentRequest(@NotNull PaymentMethod method, @NotNull @DecimalMin("0.01") BigDecimal amount) {}

  public record SaleRequest(
      LocalDate saleDate,
      boolean takeaway,
      String serviceLocation,
      boolean promoActive,
      BigDecimal discountPercent,
      Set<ProductCategory> promoCategories,
      @NotEmpty List<@Valid SaleItemRequest> items,
      List<@Valid PaymentRequest> payments) {}

  public record SaleItemResponse(
      Long id,
      Long productId,
      String productName,
      ProductCategory category,
      String categoryLabel,
      BigDecimal unitPrice,
      int quantity,
      BigDecimal lineTotal,
      boolean promoEligible,
      String note) {}

  public record PaymentResponse(
      Long id,
      PaymentMethod method,
      String methodLabel,
      BigDecimal amount,
      LocalDateTime paidAt) {}

  public record SaleResponse(
      Long id,
      LocalDateTime createdAt,
      boolean takeaway,
      String serviceLocation,
      boolean promoActive,
      BigDecimal subtotal,
      BigDecimal promoDiscount,
      BigDecimal manualDiscountPercent,
      BigDecimal manualDiscountAmount,
      BigDecimal total,
      BigDecimal paid,
      BigDecimal remaining,
      SaleStatus status,
      List<SaleItemResponse> items,
      List<PaymentResponse> payments) {}

  public record DailySummary(LocalDate date, BigDecimal total, BigDecimal paid, long sales) {}

  public record PaymentMethodSummary(
      PaymentMethod method,
      String label,
      long sales,
      long payments,
      BigDecimal total) {}

  public record DashboardResponse(
      BigDecimal todaySales,
      BigDecimal weekSales,
      BigDecimal monthSales,
      BigDecimal pendingAmount,
      long todayOrders,
      List<DailySummary> weekByDay,
      List<PaymentMethodSummary> todayPaymentsByMethod,
      List<PaymentMethodSummary> weekPaymentsByMethod,
      List<PaymentMethodSummary> monthPaymentsByMethod) {}
}
