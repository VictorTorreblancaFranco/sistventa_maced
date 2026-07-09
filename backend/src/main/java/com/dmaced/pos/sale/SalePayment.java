package com.dmaced.pos.sale;

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
import java.time.LocalDateTime;

@Entity
@Table(name = "sale_payments")
public class SalePayment {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  private Sale sale;

  @Enumerated(EnumType.STRING)
  private PaymentMethod method;

  private BigDecimal amount;
  private LocalDateTime paidAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Sale getSale() { return sale; }
  public void setSale(Sale sale) { this.sale = sale; }
  public PaymentMethod getMethod() { return method; }
  public void setMethod(PaymentMethod method) { this.method = method; }
  public BigDecimal getAmount() { return amount; }
  public void setAmount(BigDecimal amount) { this.amount = amount; }
  public LocalDateTime getPaidAt() { return paidAt; }
  public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }
}
