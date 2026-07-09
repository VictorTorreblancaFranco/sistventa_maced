package com.dmaced.pos.sale;

public enum PaymentMethod {
  EFECTIVO("Efectivo"),
  YAPE("Yape"),
  VISA("Visa");

  private final String label;

  PaymentMethod(String label) {
    this.label = label;
  }

  public String getLabel() {
    return label;
  }
}
