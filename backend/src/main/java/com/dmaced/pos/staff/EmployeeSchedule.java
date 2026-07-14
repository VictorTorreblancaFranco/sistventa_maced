package com.dmaced.pos.staff;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.DayOfWeek;
import java.time.LocalTime;

@Entity
@Table(name = "employee_schedules")
public class EmployeeSchedule {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  private Employee employee;

  private DayOfWeek dayOfWeek;
  private boolean working = true;
  private LocalTime startTime;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Employee getEmployee() { return employee; }
  public void setEmployee(Employee employee) { this.employee = employee; }
  public DayOfWeek getDayOfWeek() { return dayOfWeek; }
  public void setDayOfWeek(DayOfWeek dayOfWeek) { this.dayOfWeek = dayOfWeek; }
  public boolean isWorking() { return working; }
  public void setWorking(boolean working) { this.working = working; }
  public LocalTime getStartTime() { return startTime; }
  public void setStartTime(LocalTime startTime) { this.startTime = startTime; }
}
