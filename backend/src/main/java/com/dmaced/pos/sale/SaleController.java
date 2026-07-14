package com.dmaced.pos.sale;

import com.dmaced.pos.sale.SaleDtos.DashboardResponse;
import com.dmaced.pos.sale.SaleDtos.CashClosureRequest;
import com.dmaced.pos.sale.SaleDtos.CashClosureResponse;
import com.dmaced.pos.sale.SaleDtos.PaymentRequest;
import com.dmaced.pos.sale.SaleDtos.SaleRequest;
import com.dmaced.pos.sale.SaleDtos.SaleResponse;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sales")
public class SaleController {
  private final SaleService saleService;

  public SaleController(SaleService saleService) {
    this.saleService = saleService;
  }

  @PostMapping
  SaleResponse create(@Valid @RequestBody SaleRequest request) {
    return saleService.create(request);
  }

  @PutMapping("/{id}")
  SaleResponse update(@PathVariable Long id, @Valid @RequestBody SaleRequest request) {
    return saleService.update(id, request);
  }

  @GetMapping("/{id}")
  SaleResponse get(@PathVariable Long id) {
    return saleService.get(id);
  }

  @GetMapping
  List<SaleResponse> byDate(@RequestParam LocalDate date) {
    return saleService.byDate(date);
  }

  @GetMapping("/recent")
  List<SaleResponse> recent() {
    return saleService.recent();
  }

  @PostMapping("/{id}/payments")
  SaleResponse addPayment(@PathVariable Long id, @Valid @RequestBody PaymentRequest request) {
    return saleService.addPayment(id, request);
  }

  @PutMapping("/{id}/payments/{paymentId}")
  SaleResponse updatePayment(@PathVariable Long id, @PathVariable Long paymentId, @Valid @RequestBody PaymentRequest request) {
    return saleService.updatePayment(id, paymentId, request);
  }

  @DeleteMapping("/{id}/payments/{paymentId}")
  SaleResponse deletePayment(@PathVariable Long id, @PathVariable Long paymentId) {
    return saleService.deletePayment(id, paymentId);
  }

  @DeleteMapping("/{id}")
  void delete(@PathVariable Long id) {
    saleService.delete(id);
  }

  @GetMapping("/dashboard")
  DashboardResponse dashboard(@RequestParam(required = false) LocalDate date) {
    return saleService.dashboard(date);
  }

  @PostMapping("/cash-closure")
  CashClosureResponse closeCash(@RequestParam(required = false) LocalDate date, @RequestBody(required = false) CashClosureRequest request, Authentication authentication) {
    return saleService.closeCash(date, request, authentication == null ? "admin" : authentication.getName());
  }
}
