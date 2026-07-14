package com.dmaced.pos.staff;

import java.time.DayOfWeek;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeScheduleRepository extends JpaRepository<EmployeeSchedule, Long> {
  List<EmployeeSchedule> findByEmployeeId(Long employeeId);
  Optional<EmployeeSchedule> findByEmployeeIdAndDayOfWeek(Long employeeId, DayOfWeek dayOfWeek);
}
