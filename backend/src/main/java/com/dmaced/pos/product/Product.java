package com.dmaced.pos.product;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "products")
public class Product {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String name;

  @Enumerated(EnumType.STRING)
  private ProductCategory category;

  private BigDecimal price;
  private boolean active = true;
  private boolean promoEligible;
  private Boolean deleted = false;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public ProductCategory getCategory() { return category; }
  public void setCategory(ProductCategory category) { this.category = category; }
  public BigDecimal getPrice() { return price; }
  public void setPrice(BigDecimal price) { this.price = price; }
  public boolean isActive() { return active; }
  public void setActive(boolean active) { this.active = active; }
  public boolean isPromoEligible() { return promoEligible; }
  public void setPromoEligible(boolean promoEligible) { this.promoEligible = promoEligible; }
  public boolean isDeleted() { return Boolean.TRUE.equals(deleted); }
  public void setDeleted(boolean deleted) { this.deleted = deleted; }
}
