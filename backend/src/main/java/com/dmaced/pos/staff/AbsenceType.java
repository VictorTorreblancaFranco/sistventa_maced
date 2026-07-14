package com.dmaced.pos.staff;

public enum AbsenceType {
  PERMISO("Permiso"),
  FALTA("Falta"),
  DESCANSO("Descanso"),
  VACACIONES("Vacaciones"),
  CAMBIO_TURNO("Cambio de turno");

  private final String label;

  AbsenceType(String label) {
    this.label = label;
  }

  public String getLabel() {
    return label;
  }
}
