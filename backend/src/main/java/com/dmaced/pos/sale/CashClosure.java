package com.dmaced.pos.sale;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "cash_closures")
public class CashClosure {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(unique = true)
  private LocalDate businessDate;

  private LocalDateTime closedAt;
  private String closedBy;
  @Column(length = 600)
  private String note;
  private BigDecimal totalSales = BigDecimal.ZERO;
  private BigDecimal totalPaid = BigDecimal.ZERO;
  private BigDecimal totalPending = BigDecimal.ZERO;
  private long orders;
  private long paidOrders;
  private long pendingOrders;
  private BigDecimal efectivoTotal = BigDecimal.ZERO;
  private BigDecimal yapeTotal = BigDecimal.ZERO;
  private BigDecimal qrTotal = BigDecimal.ZERO;
  private BigDecimal visaTotal = BigDecimal.ZERO;
  private long efectivoSales;
  private long yapeSales;
  private long qrSales;
  private long visaSales;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public LocalDate getBusinessDate() { return businessDate; }
  public void setBusinessDate(LocalDate businessDate) { this.businessDate = businessDate; }
  public LocalDateTime getClosedAt() { return closedAt; }
  public void setClosedAt(LocalDateTime closedAt) { this.closedAt = closedAt; }
  public String getClosedBy() { return closedBy; }
  public void setClosedBy(String closedBy) { this.closedBy = closedBy; }
  public String getNote() { return note; }
  public void setNote(String note) { this.note = note; }
  public BigDecimal getTotalSales() { return totalSales; }
  public void setTotalSales(BigDecimal totalSales) { this.totalSales = totalSales; }
  public BigDecimal getTotalPaid() { return totalPaid; }
  public void setTotalPaid(BigDecimal totalPaid) { this.totalPaid = totalPaid; }
  public BigDecimal getTotalPending() { return totalPending; }
  public void setTotalPending(BigDecimal totalPending) { this.totalPending = totalPending; }
  public long getOrders() { return orders; }
  public void setOrders(long orders) { this.orders = orders; }
  public long getPaidOrders() { return paidOrders; }
  public void setPaidOrders(long paidOrders) { this.paidOrders = paidOrders; }
  public long getPendingOrders() { return pendingOrders; }
  public void setPendingOrders(long pendingOrders) { this.pendingOrders = pendingOrders; }
  public BigDecimal getEfectivoTotal() { return efectivoTotal; }
  public void setEfectivoTotal(BigDecimal efectivoTotal) { this.efectivoTotal = efectivoTotal; }
  public BigDecimal getYapeTotal() { return yapeTotal; }
  public void setYapeTotal(BigDecimal yapeTotal) { this.yapeTotal = yapeTotal; }
  public BigDecimal getQrTotal() { return qrTotal; }
  public void setQrTotal(BigDecimal qrTotal) { this.qrTotal = qrTotal; }
  public BigDecimal getVisaTotal() { return visaTotal; }
  public void setVisaTotal(BigDecimal visaTotal) { this.visaTotal = visaTotal; }
  public long getEfectivoSales() { return efectivoSales; }
  public void setEfectivoSales(long efectivoSales) { this.efectivoSales = efectivoSales; }
  public long getYapeSales() { return yapeSales; }
  public void setYapeSales(long yapeSales) { this.yapeSales = yapeSales; }
  public long getQrSales() { return qrSales; }
  public void setQrSales(long qrSales) { this.qrSales = qrSales; }
  public long getVisaSales() { return visaSales; }
  public void setVisaSales(long visaSales) { this.visaSales = visaSales; }
}
