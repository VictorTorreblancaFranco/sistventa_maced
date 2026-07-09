package com.dmaced.pos.product;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class ProductDtos {
  public record CategoryResponse(String code, String label, boolean defaultPromoEligible) {}

  public record ProductRequest(
      @NotBlank String name,
      @NotNull ProductCategory category,
      @NotNull @DecimalMin("0.00") BigDecimal price,
      Boolean active,
      Boolean promoEligible,
      Boolean deleted) {}

  public record ProductResponse(
      Long id,
      String name,
      ProductCategory category,
      String categoryLabel,
      BigDecimal price,
      boolean active,
      boolean promoEligible,
      boolean deleted) {}
}
