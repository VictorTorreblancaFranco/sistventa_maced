package com.dmaced.pos.product;

import com.dmaced.pos.product.ProductDtos.CategoryResponse;
import com.dmaced.pos.product.ProductDtos.ProductRequest;
import com.dmaced.pos.product.ProductDtos.ProductResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/products")
public class ProductController {
  private final ProductService productService;

  public ProductController(ProductService productService) {
    this.productService = productService;
  }

  @GetMapping("/categories")
  List<CategoryResponse> categories() {
    return productService.categories();
  }

  @GetMapping
  List<ProductResponse> list(
      @RequestParam(defaultValue = "false") boolean onlyActive,
      @RequestParam(defaultValue = "false") boolean includeDeleted) {
    return productService.list(onlyActive, includeDeleted);
  }

  @PostMapping
  ProductResponse create(@Valid @RequestBody ProductRequest request) {
    return productService.create(request);
  }

  @PutMapping("/{id}")
  ProductResponse update(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
    return productService.update(id, request);
  }

  @PatchMapping("/{id}/active")
  void toggle(@PathVariable Long id, @RequestParam boolean active) {
    productService.toggle(id, active);
  }

  @PatchMapping("/{id}/delete")
  void delete(@PathVariable Long id) {
    productService.delete(id);
  }

  @PatchMapping("/{id}/restore")
  void restore(@PathVariable Long id) {
    productService.restore(id);
  }
}
