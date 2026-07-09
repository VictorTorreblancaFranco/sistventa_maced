package com.dmaced.pos.sale;

import com.dmaced.pos.sale.SaleDtos.DashboardResponse;
import com.dmaced.pos.sale.SaleDtos.PaymentRequest;
import com.dmaced.pos.sale.SaleDtos.SaleRequest;
import com.dmaced.pos.sale.SaleDtos.SaleResponse;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
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

  @PostMapping("/{id}/payments")
  SaleResponse addPayment(@PathVariable Long id, @Valid @RequestBody PaymentRequest request) {
    return saleService.addPayment(id, request);
  }

  @DeleteMapping("/{id}")
  void delete(@PathVariable Long id) {
    saleService.delete(id);
  }

  @GetMapping("/dashboard")
  DashboardResponse dashboard() {
    return saleService.dashboard();
  }
}
