package com.dmaced.pos.product;

import com.dmaced.pos.product.ProductDtos.CategoryResponse;
import com.dmaced.pos.product.ProductDtos.ProductRequest;
import com.dmaced.pos.product.ProductDtos.ProductResponse;
import java.util.Arrays;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {
  private final ProductRepository productRepository;

  public ProductService(ProductRepository productRepository) {
    this.productRepository = productRepository;
  }

  public List<CategoryResponse> categories() {
    return Arrays.stream(ProductCategory.values())
        .map(category -> new CategoryResponse(category.name(), category.getLabel(), category.isDefaultPromoEligible()))
        .toList();
  }

  public List<ProductResponse> list(boolean onlyActive, boolean includeDeleted) {
    List<Product> products = includeDeleted
        ? productRepository.findAllByOrderByCategoryAscNameAsc()
        : onlyActive
            ? productRepository.findActiveVisible()
            : productRepository.findVisible();
    return products.stream().map(this::toResponse).toList();
  }

  @Transactional
  public ProductResponse create(ProductRequest request) {
    Product product = new Product();
    apply(product, request);
    return toResponse(productRepository.save(product));
  }

  @Transactional
  public ProductResponse update(Long id, ProductRequest request) {
    Product product = productRepository.findById(id).orElseThrow();
    apply(product, request);
    return toResponse(product);
  }

  @Transactional
  public void toggle(Long id, boolean active) {
    Product product = productRepository.findById(id).orElseThrow();
    product.setActive(active);
  }

  @Transactional
  public void delete(Long id) {
    Product product = productRepository.findById(id).orElseThrow();
    product.setDeleted(true);
    product.setActive(false);
  }

  @Transactional
  public void restore(Long id) {
    Product product = productRepository.findById(id).orElseThrow();
    product.setDeleted(false);
    product.setActive(true);
  }

  private void apply(Product product, ProductRequest request) {
    product.setName(request.name().trim());
    product.setCategory(request.category());
    product.setPrice(request.price());
    product.setActive(request.active() == null || request.active());
    product.setDeleted(request.deleted() != null && request.deleted());
    product.setPromoEligible(request.promoEligible() == null
        ? request.category().isDefaultPromoEligible()
        : request.promoEligible());
  }

  ProductResponse toResponse(Product product) {
    return new ProductResponse(
        product.getId(),
        product.getName(),
        product.getCategory(),
        product.getCategory().getLabel(),
        product.getPrice(),
        product.isActive(),
        product.isPromoEligible(),
        product.isDeleted());
  }
}
