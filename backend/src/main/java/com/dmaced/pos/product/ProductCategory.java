package com.dmaced.pos.product;

public enum ProductCategory {
  COMIDA("Comida", true),
  COMBO_COMIDA("Combos de comida", false),
  BEBIDA("Bebidas", true),
  COCTEL("Cocteles", true),
  COCTEL_SIN_ALCOHOL("Cocteles sin alcohol", true),
  BEBIDA_CALIENTE("Bebidas calientes", true),
  FRAP("Fraps", true),
  INFUSION("Infusiones", true),
  PONCHERA_1_5("Ponchera 1.5 L", false),
  PONCHERA_3("Ponchera 3 L", false),
  TAPER("Taper para llevar", false),
  VASO("Vaso para llevar", false);

  private final String label;
  private final boolean defaultPromoEligible;

  ProductCategory(String label, boolean defaultPromoEligible) {
    this.label = label;
    this.defaultPromoEligible = defaultPromoEligible;
  }

  public String getLabel() {
    return label;
  }

  public boolean isDefaultPromoEligible() {
    return defaultPromoEligible;
  }
}
