package com.dmaced.pos.sale;

import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CashClosureRepository extends JpaRepository<CashClosure, Long> {
  Optional<CashClosure> findByBusinessDate(LocalDate businessDate);
}
