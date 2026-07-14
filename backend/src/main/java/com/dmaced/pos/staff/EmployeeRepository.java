package com.dmaced.pos.staff;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
  List<Employee> findAllByOrderByActiveDescNameAsc();
  List<Employee> findByRoleId(Long roleId);
}
