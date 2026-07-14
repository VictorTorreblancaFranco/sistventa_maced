package com.dmaced.pos.staff;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "employees")
public class Employee {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String name;

  @ManyToOne(fetch = FetchType.LAZY)
  private StaffRole role;

  private String gender = "MALE";
  private boolean active = true;
  private String inactiveReason;
  private LocalDateTime deactivatedAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public StaffRole getRole() { return role; }
  public void setRole(StaffRole role) { this.role = role; }
  public String getGender() { return gender; }
  public void setGender(String gender) { this.gender = gender; }
  public boolean isActive() { return active; }
  public void setActive(boolean active) { this.active = active; }
  public String getInactiveReason() { return inactiveReason; }
  public void setInactiveReason(String inactiveReason) { this.inactiveReason = inactiveReason; }
  public LocalDateTime getDeactivatedAt() { return deactivatedAt; }
  public void setDeactivatedAt(LocalDateTime deactivatedAt) { this.deactivatedAt = deactivatedAt; }
}
