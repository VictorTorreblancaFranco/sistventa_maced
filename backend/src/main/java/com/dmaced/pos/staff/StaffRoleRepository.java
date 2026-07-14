package com.dmaced.pos.staff;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StaffRoleRepository extends JpaRepository<StaffRole, Long> {
  boolean existsByNameIgnoreCase(String name);
  List<StaffRole> findAllByOrderByNameAsc();
  Optional<StaffRole> findFirstByNameIgnoreCaseOrderByIdAsc(String name);
}
