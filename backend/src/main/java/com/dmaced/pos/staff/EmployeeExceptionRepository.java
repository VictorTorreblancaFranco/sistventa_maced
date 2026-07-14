package com.dmaced.pos.staff;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeExceptionRepository extends JpaRepository<EmployeeException, Long> {
  List<EmployeeException> findByEmployeeId(Long employeeId);
  List<EmployeeException> findByStartDateLessThanEqualAndEndDateGreaterThanEqual(LocalDate end, LocalDate start);
}
