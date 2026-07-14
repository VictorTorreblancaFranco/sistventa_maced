package com.dmaced.pos.staff;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public class StaffDtos {
  public record RoleRequest(@NotBlank String name) {}
  public record RoleResponse(Long id, String name, boolean active) {}

  public record EmployeeRequest(@NotBlank String name, @NotNull Long roleId, String gender, Boolean active, String inactiveReason) {}
  public record EmployeeStatusRequest(boolean active, String inactiveReason) {}
  public record EmployeeResponse(Long id, String name, Long roleId, String roleName, String gender, boolean active, String inactiveReason) {}

  public record ScheduleRequest(@NotNull DayOfWeek dayOfWeek, boolean working, LocalTime startTime, boolean doubleShift) {}
  public record ScheduleResponse(Long id, DayOfWeek dayOfWeek, boolean working, LocalTime startTime, boolean doubleShift) {}

  public record ExceptionRequest(
      @NotNull Long employeeId,
      @NotNull AbsenceType type,
      @NotNull LocalDate startDate,
      @NotNull LocalDate endDate,
      LocalTime startTime,
      String note) {}
  public record ExceptionResponse(
      Long id,
      Long employeeId,
      String employeeName,
      AbsenceType type,
      String typeLabel,
      LocalDate startDate,
      LocalDate endDate,
      LocalTime startTime,
      String note) {}

  public record StaffDayResponse(
      LocalDate date,
      DayOfWeek dayOfWeek,
      boolean working,
      LocalTime startTime,
      boolean doubleShift,
      String status,
      String note,
      AbsenceType exceptionType,
      Long exceptionId) {}
  public record StaffWeekRow(EmployeeResponse employee, List<StaffDayResponse> days) {}
  public record StaffWeekResponse(LocalDate weekStart, LocalDate weekEnd, List<StaffWeekRow> rows) {}
}
