package com.dmaced.pos.sale;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sales")
public class Sale {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private LocalDateTime createdAt;
  private boolean takeaway;
  private String serviceLocation = "PARA_LLEVAR";
  private boolean promoActive;
  private BigDecimal subtotal;
  private BigDecimal promoDiscount;
  private BigDecimal manualDiscountPercent = BigDecimal.ZERO;
  private BigDecimal manualDiscountAmount = BigDecimal.ZERO;
  private BigDecimal total;
  private BigDecimal paid;
  private BigDecimal remaining;

  @Enumerated(EnumType.STRING)
  private SaleStatus status;

  @OneToMany(mappedBy = "sale", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("id ASC")
  private List<SaleItem> items = new ArrayList<>();

  @OneToMany(mappedBy = "sale", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("paidAt ASC")
  private List<SalePayment> payments = new ArrayList<>();

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public boolean isTakeaway() { return takeaway; }
  public void setTakeaway(boolean takeaway) { this.takeaway = takeaway; }
  public String getServiceLocation() { return serviceLocation; }
  public void setServiceLocation(String serviceLocation) { this.serviceLocation = serviceLocation; }
  public boolean isPromoActive() { return promoActive; }
  public void setPromoActive(boolean promoActive) { this.promoActive = promoActive; }
  public BigDecimal getSubtotal() { return subtotal; }
  public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
  public BigDecimal getPromoDiscount() { return promoDiscount; }
  public void setPromoDiscount(BigDecimal promoDiscount) { this.promoDiscount = promoDiscount; }
  public BigDecimal getManualDiscountPercent() { return manualDiscountPercent; }
  public void setManualDiscountPercent(BigDecimal manualDiscountPercent) { this.manualDiscountPercent = manualDiscountPercent; }
  public BigDecimal getManualDiscountAmount() { return manualDiscountAmount; }
  public void setManualDiscountAmount(BigDecimal manualDiscountAmount) { this.manualDiscountAmount = manualDiscountAmount; }
  public BigDecimal getTotal() { return total; }
  public void setTotal(BigDecimal total) { this.total = total; }
  public BigDecimal getPaid() { return paid; }
  public void setPaid(BigDecimal paid) { this.paid = paid; }
  public BigDecimal getRemaining() { return remaining; }
  public void setRemaining(BigDecimal remaining) { this.remaining = remaining; }
  public SaleStatus getStatus() { return status; }
  public void setStatus(SaleStatus status) { this.status = status; }
  public List<SaleItem> getItems() { return items; }
  public void setItems(List<SaleItem> items) { this.items = items; }
  public List<SalePayment> getPayments() { return payments; }
  public void setPayments(List<SalePayment> payments) { this.payments = payments; }
}
