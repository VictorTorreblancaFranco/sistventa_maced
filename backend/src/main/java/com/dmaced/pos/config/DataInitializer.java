package com.dmaced.pos.config;

import com.dmaced.pos.product.Product;
import com.dmaced.pos.product.ProductCategory;
import com.dmaced.pos.product.ProductRepository;
import java.math.BigDecimal;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {
  private final ProductRepository productRepository;

  public DataInitializer(ProductRepository productRepository) {
    this.productRepository = productRepository;
  }

  @Override
  public void run(String... args) {
    createFixedProduct(ProductCategory.TAPER, "Taper para llevar", "2.00");
    createFixedProduct(ProductCategory.VASO, "Vaso para llevar", "1.00");
    createSpecialProduct("Adicional");
    createSpecialProduct("Copa rota");
    seedMenuProducts();
  }

  private void createFixedProduct(ProductCategory category, String name, String price) {
    if (productRepository.existsByCategory(category)) {
      return;
    }
    Product product = new Product();
    product.setName(name);
    product.setCategory(category);
    product.setPrice(new BigDecimal(price));
    product.setActive(true);
    product.setPromoEligible(false);
    productRepository.save(product);
  }

  private void createSpecialProduct(String name) {
    if (productRepository.existsByNameIgnoreCase(name)) {
      return;
    }
    Product product = new Product();
    product.setName(name);
    product.setCategory(ProductCategory.BEBIDA);
    product.setPrice(BigDecimal.ZERO);
    product.setActive(true);
    product.setPromoEligible(false);
    productRepository.save(product);
  }

  private void seedMenuProducts() {
    menu(ProductCategory.COCTEL, "Zombie", "20.00");
    menu(ProductCategory.COCTEL, "Daiquiri de Frutas", "18.00");
    menu(ProductCategory.COCTEL, "Aperol Spritz", "23.00");
    menu(ProductCategory.COCTEL, "Submarino", "25.00");
    menu(ProductCategory.COCTEL, "Margarita", "22.00");
    menu(ProductCategory.COCTEL, "Corona Margarita", "25.00");
    menu(ProductCategory.COCTEL, "Maracumango", "18.00");
    menu(ProductCategory.COCTEL, "Negroni", "23.00");
    menu(ProductCategory.COCTEL, "Old Fashion", "22.00");
    menu(ProductCategory.COCTEL, "Orgasmo", "22.00");
    menu(ProductCategory.COCTEL, "Orgasmo Multiple", "25.00");
    menu(ProductCategory.COCTEL, "Sex on the Beach", "20.00");
    menu(ProductCategory.COCTEL, "Caipirinha", "18.00");
    menu(ProductCategory.COCTEL, "Sunrise", "20.00");
    menu(ProductCategory.COCTEL, "Amor en Llamas", "25.00");
    menu(ProductCategory.COCTEL, "Long Island Ice Tea", "25.00");
    menu(ProductCategory.COCTEL, "Diablo", "12.00");
    menu(ProductCategory.COCTEL, "Blue Hawai", "20.00");
    menu(ProductCategory.COCTEL, "Gin Tonic", "25.00");
    menu(ProductCategory.COCTEL, "Manhattan", "18.00");
    menu(ProductCategory.COCTEL, "Baileys Colado", "22.00");
    menu(ProductCategory.COCTEL, "Capitan", "18.00");
    menu(ProductCategory.COCTEL, "Sol y Sombra", "16.00");
    menu(ProductCategory.COCTEL, "Mestiza", "23.00");
    menu(ProductCategory.COCTEL, "Martini", "22.00");
    menu(ProductCategory.COCTEL, "Apple Martini", "22.00");
    menu(ProductCategory.COCTEL, "Tinto de Verano", "22.00");
    menu(ProductCategory.COCTEL, "Piscina", "25.00");
    menu(ProductCategory.COCTEL, "Dulce Final", "20.00");
    menu(ProductCategory.COCTEL, "Tropical", "25.00");
    menu(ProductCategory.COCTEL, "El Vengador", "20.00");
    menu(ProductCategory.COCTEL, "Fresh", "22.00");
    menu(ProductCategory.COCTEL, "Chinchivi", "18.00");
    menu(ProductCategory.COCTEL, "Pi-Yi", "22.00");
    menu(ProductCategory.COCTEL, "No te apresures", "22.00");
    menu(ProductCategory.COCTEL, "El Pibe", "25.00");
    menu(ProductCategory.COCTEL, "El Refuerzo", "22.00");
    menu(ProductCategory.COCTEL, "Florencia", "25.00");
    menu(ProductCategory.COCTEL, "Perdido en el Bosque", "25.00");
    menu(ProductCategory.COCTEL, "Reina Roja", "25.00");
    menu(ProductCategory.COCTEL, "Pisco Sour", "16.00");
    menu(ProductCategory.COCTEL, "Sour Catedral", "20.00");
    menu(ProductCategory.COCTEL, "Chilcano", "16.00");
    menu(ProductCategory.COCTEL, "Mojito", "17.00");
    menu(ProductCategory.COCTEL, "Pina Colada", "16.00");
    menu(ProductCategory.COCTEL, "Pantera Rosa", "16.00");
    menu(ProductCategory.COCTEL, "Machupicchu", "20.00");
    menu(ProductCategory.COCTEL, "Algarrobina", "18.00");
    menu(ProductCategory.COCTEL, "Laguna Azul", "20.00");
    menu(ProductCategory.COCTEL, "Cuba Libre", "16.00");

    menu(ProductCategory.BEBIDA_CALIENTE, "Calentito", "15.00");
    menu(ProductCategory.BEBIDA_CALIENTE, "Irish Coffee", "22.00");
    menu(ProductCategory.BEBIDA_CALIENTE, "Luisa Caliente", "15.00");

    menu(ProductCategory.COCTEL_SIN_ALCOHOL, "Primavera", "12.00");
    menu(ProductCategory.COCTEL_SIN_ALCOHOL, "Virgen Colada", "12.00");
    menu(ProductCategory.COCTEL_SIN_ALCOHOL, "Shirley Temple", "12.00");
    menu(ProductCategory.COCTEL_SIN_ALCOHOL, "Frozen clasico/frutas", "12.00");
    menu(ProductCategory.FRAP, "Frappe Sublime", "16.00");
    menu(ProductCategory.FRAP, "Frappe Oreo/Morocha", "13.00");

    punch("Blue Punch");
    punch("Pisco Punch");
    punch("Planters Punch");
    punch("Fruit Punch");
    punch("Canete Punch");
    menu(ProductCategory.PONCHERA_3, "La Res", "100.00");

    menu(ProductCategory.COMIDA, "Choripan", "15.00");
    menu(ProductCategory.COMIDA, "Alitas fritas", "20.00");
    menu(ProductCategory.COMIDA, "Alitas BBQ", "22.00");
    menu(ProductCategory.COMIDA, "Alitas Buffalo", "22.00");
    menu(ProductCategory.COMIDA, "Alitas Crispy", "22.00");
    menu(ProductCategory.COMIDA, "Alitas Acevichadas", "22.00");
    menu(ProductCategory.COMIDA, "Alitas en salsa de Rocoto", "22.00");
    menu(ProductCategory.COMIDA, "Mixto de Alitas", "20.00");
    menu(ProductCategory.COMIDA, "Chicharron de Pollo", "20.00");
    menu(ProductCategory.COMIDA, "Duo Burger", "20.00");
    menu(ProductCategory.COMIDA, "Tequenos", "13.00");
    menu(ProductCategory.COMIDA, "Salchipapa", "13.00");
    menu(ProductCategory.COMIDA, "Pollo a la Plancha", "20.00");
    menu(ProductCategory.COMIDA, "Anticucho", "20.00");

    menu(ProductCategory.COMBO_COMIDA, "Especial de Alitas", "38.00");
    menu(ProductCategory.COMBO_COMIDA, "Torre de Alitas", "70.00");
    menu(ProductCategory.COMBO_COMIDA, "Mixto de Chicharron de Pollo", "22.00");
    menu(ProductCategory.COMBO_COMIDA, "Combo D'Maced", "38.00");
  }

  private void punch(String name) {
    menu(ProductCategory.PONCHERA_1_5, name + " 1.5 L", "60.00");
    menu(ProductCategory.PONCHERA_3, name + " 3 L", "110.00");
  }

  private void menu(ProductCategory category, String name, String price) {
    if (productRepository.existsByNameIgnoreCase(name)) {
      return;
    }
    Product product = new Product();
    product.setName(name);
    product.setCategory(category);
    product.setPrice(new BigDecimal(price));
    product.setActive(true);
    product.setPromoEligible(category.isDefaultPromoEligible());
    productRepository.save(product);
  }
}
