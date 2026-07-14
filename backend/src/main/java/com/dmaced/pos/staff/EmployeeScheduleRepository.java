package com.dmaced.pos.staff;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeScheduleRepository extends JpaRepository<EmployeeSchedule, Long> {
  List<EmployeeSchedule> findByEmployeeId(Long employeeId);
  List<EmployeeSchedule> findByEmployeeIdAndWeekStart(Long employeeId, LocalDate weekStart);
  Optional<EmployeeSchedule> findByEmployeeIdAndWeekStartAndDayOfWeek(Long employeeId, LocalDate weekStart, DayOfWeek dayOfWeek);
  Optional<EmployeeSchedule> findFirstByEmployeeIdAndDayOfWeekAndWeekStartIsNull(Long employeeId, DayOfWeek dayOfWeek);
}
