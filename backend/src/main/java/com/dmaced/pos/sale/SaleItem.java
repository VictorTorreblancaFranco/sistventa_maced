package com.dmaced.pos.sale;

import com.dmaced.pos.product.ProductCategory;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "sale_items")
public class SaleItem {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  private Sale sale;

  private Long productId;
  private String productName;

  @Enumerated(EnumType.STRING)
  private ProductCategory category;

  private BigDecimal unitPrice;
  private int quantity;
  private BigDecimal lineTotal;
  private boolean promoEligible;
  private String note;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Sale getSale() { return sale; }
  public void setSale(Sale sale) { this.sale = sale; }
  public Long getProductId() { return productId; }
  public void setProductId(Long productId) { this.productId = productId; }
  public String getProductName() { return productName; }
  public void setProductName(String productName) { this.productName = productName; }
  public ProductCategory getCategory() { return category; }
  public void setCategory(ProductCategory category) { this.category = category; }
  public BigDecimal getUnitPrice() { return unitPrice; }
  public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }
  public int getQuantity() { return quantity; }
  public void setQuantity(int quantity) { this.quantity = quantity; }
  public BigDecimal getLineTotal() { return lineTotal; }
  public void setLineTotal(BigDecimal lineTotal) { this.lineTotal = lineTotal; }
  public boolean isPromoEligible() { return promoEligible; }
  public void setPromoEligible(boolean promoEligible) { this.promoEligible = promoEligible; }
  public String getNote() { return note; }
  public void setNote(String note) { this.note = note; }
}
