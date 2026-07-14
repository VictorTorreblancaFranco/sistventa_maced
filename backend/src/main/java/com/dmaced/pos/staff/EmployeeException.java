package com.dmaced.pos.staff;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "employee_exceptions")
public class EmployeeException {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  private Employee employee;

  @Enumerated(EnumType.STRING)
  private AbsenceType type;

  private LocalDate startDate;
  private LocalDate endDate;
  private LocalTime startTime;

  @Column(length = 500)
  private String note;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Employee getEmployee() { return employee; }
  public void setEmployee(Employee employee) { this.employee = employee; }
  public AbsenceType getType() { return type; }
  public void setType(AbsenceType type) { this.type = type; }
  public LocalDate getStartDate() { return startDate; }
  public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
  public LocalDate getEndDate() { return endDate; }
  public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
  public LocalTime getStartTime() { return startTime; }
  public void setStartTime(LocalTime startTime) { this.startTime = startTime; }
  public String getNote() { return note; }
  public void setNote(String note) { this.note = note; }
}
