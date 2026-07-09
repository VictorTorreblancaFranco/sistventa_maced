package com.dmaced.pos.product;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ProductRepository extends JpaRepository<Product, Long> {
  boolean existsByCategory(ProductCategory category);
  boolean existsByNameIgnoreCase(String name);
  @Query("select p from Product p where p.active = true and (p.deleted = false or p.deleted is null) order by p.category asc, p.name asc")
  List<Product> findActiveVisible();
  @Query("select p from Product p where p.deleted = false or p.deleted is null order by p.category asc, p.name asc")
  List<Product> findVisible();
  List<Product> findAllByOrderByCategoryAscNameAsc();
}
