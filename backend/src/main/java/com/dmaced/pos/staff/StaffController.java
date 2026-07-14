package com.dmaced.pos.staff;

import com.dmaced.pos.staff.StaffDtos.EmployeeRequest;
import com.dmaced.pos.staff.StaffDtos.EmployeeResponse;
import com.dmaced.pos.staff.StaffDtos.EmployeeStatusRequest;
import com.dmaced.pos.staff.StaffDtos.ExceptionRequest;
import com.dmaced.pos.staff.StaffDtos.ExceptionResponse;
import com.dmaced.pos.staff.StaffDtos.RoleRequest;
import com.dmaced.pos.staff.StaffDtos.RoleResponse;
import com.dmaced.pos.staff.StaffDtos.ScheduleRequest;
import com.dmaced.pos.staff.StaffDtos.ScheduleResponse;
import com.dmaced.pos.staff.StaffDtos.StaffWeekResponse;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
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
@RequestMapping("/api/staff")
public class StaffController {
  private final StaffService staffService;

  public StaffController(StaffService staffService) {
    this.staffService = staffService;
  }

  @GetMapping("/roles")
  List<RoleResponse> roles() {
    return staffService.roles();
  }

  @PostMapping("/roles")
  RoleResponse createRole(@Valid @RequestBody RoleRequest request) {
    return staffService.createRole(request);
  }

  @GetMapping("/employees")
  List<EmployeeResponse> employees() {
    return staffService.employees();
  }

  @PostMapping("/employees")
  EmployeeResponse createEmployee(@Valid @RequestBody EmployeeRequest request) {
    return staffService.createEmployee(request);
  }

  @PutMapping("/employees/{id}")
  EmployeeResponse updateEmployee(@PathVariable Long id, @Valid @RequestBody EmployeeRequest request) {
    return staffService.updateEmployee(id, request);
  }

  @PatchMapping("/employees/{id}/status")
  EmployeeResponse updateStatus(@PathVariable Long id, @RequestBody EmployeeStatusRequest request) {
    return staffService.updateStatus(id, request);
  }

  @GetMapping("/employees/{id}/schedule")
  List<ScheduleResponse> schedule(@PathVariable Long id) {
    return staffService.schedule(id);
  }

  @PutMapping("/employees/{id}/schedule")
  ScheduleResponse updateSchedule(@PathVariable Long id, @Valid @RequestBody ScheduleRequest request) {
    return staffService.updateSchedule(id, request);
  }

  @GetMapping("/employees/{id}/exceptions")
  List<ExceptionResponse> exceptions(@PathVariable Long id) {
    return staffService.exceptions(id);
  }

  @PostMapping("/exceptions")
  ExceptionResponse createException(@Valid @RequestBody ExceptionRequest request) {
    return staffService.createException(request);
  }

  @PutMapping("/exceptions/{id}")
  ExceptionResponse updateException(@PathVariable Long id, @Valid @RequestBody ExceptionRequest request) {
    return staffService.updateException(id, request);
  }

  @DeleteMapping("/exceptions/{id}")
  void deleteException(@PathVariable Long id) {
    staffService.deleteException(id);
  }

  @GetMapping("/week")
  StaffWeekResponse week(@RequestParam(required = false) LocalDate date) {
    return staffService.week(date);
  }
}
