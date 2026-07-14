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
import com.dmaced.pos.staff.StaffDtos.StaffDayResponse;
import com.dmaced.pos.staff.StaffDtos.StaffWeekResponse;
import com.dmaced.pos.staff.StaffDtos.StaffWeekRow;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StaffService {
  private final StaffRoleRepository roleRepository;
  private final EmployeeRepository employeeRepository;
  private final EmployeeScheduleRepository scheduleRepository;
  private final EmployeeExceptionRepository exceptionRepository;

  public StaffService(
      StaffRoleRepository roleRepository,
      EmployeeRepository employeeRepository,
      EmployeeScheduleRepository scheduleRepository,
      EmployeeExceptionRepository exceptionRepository) {
    this.roleRepository = roleRepository;
    this.employeeRepository = employeeRepository;
    this.scheduleRepository = scheduleRepository;
    this.exceptionRepository = exceptionRepository;
  }

  @Transactional
  public void seedDefaults() {
    mergeDuplicateRoles();
    List.of("Mozo", "Bartender", "Cocinero").forEach(name -> {
      if (!roleRepository.existsByNameIgnoreCase(name)) {
        StaffRole role = new StaffRole();
        role.setName(name);
        roleRepository.save(role);
      }
    });
  }

  @Transactional(readOnly = true)
  public List<RoleResponse> roles() {
    return roleRepository.findAllByOrderByNameAsc().stream()
        .collect(LinkedHashMap<String, StaffRole>::new,
            (roles, role) -> roles.putIfAbsent(normalizeRole(role.getName()), role),
            Map::putAll)
        .values()
        .stream()
        .map(this::toRole)
        .toList();
  }

  @Transactional
  public RoleResponse createRole(RoleRequest request) {
    String name = clean(request.name());
    if (name == null) {
      throw new IllegalArgumentException("El nombre del rol es obligatorio.");
    }
    return roleRepository.findFirstByNameIgnoreCaseOrderByIdAsc(name)
        .map(this::toRole)
        .orElseGet(() -> {
          StaffRole role = new StaffRole();
          role.setName(name);
          return toRole(roleRepository.save(role));
        });
  }

  @Transactional(readOnly = true)
  public List<EmployeeResponse> employees() {
    return employeeRepository.findAllByOrderByActiveDescNameAsc().stream().map(this::toEmployee).toList();
  }

  @Transactional
  public EmployeeResponse createEmployee(EmployeeRequest request) {
    Employee employee = new Employee();
    applyEmployee(employee, request);
    Employee saved = employeeRepository.save(employee);
    createDefaultSchedule(saved);
    return toEmployee(saved);
  }

  @Transactional
  public EmployeeResponse updateEmployee(Long id, EmployeeRequest request) {
    Employee employee = employeeRepository.findById(id).orElseThrow();
    applyEmployee(employee, request);
    return toEmployee(employee);
  }

  @Transactional
  public EmployeeResponse updateStatus(Long id, EmployeeStatusRequest request) {
    Employee employee = employeeRepository.findById(id).orElseThrow();
    employee.setActive(request.active());
    employee.setInactiveReason(request.active() ? null : clean(request.inactiveReason()));
    employee.setDeactivatedAt(request.active() ? null : LocalDateTime.now());
    return toEmployee(employee);
  }

  @Transactional(readOnly = true)
  public List<ScheduleResponse> schedule(Long employeeId) {
    return scheduleRepository.findByEmployeeId(employeeId).stream()
        .sorted(Comparator.comparing(EmployeeSchedule::getDayOfWeek))
        .map(this::toSchedule)
        .toList();
  }

  @Transactional
  public ScheduleResponse updateSchedule(Long employeeId, ScheduleRequest request) {
    Employee employee = employeeRepository.findById(employeeId).orElseThrow();
    EmployeeSchedule schedule = scheduleRepository.findByEmployeeIdAndDayOfWeek(employeeId, request.dayOfWeek()).orElseGet(() -> {
      EmployeeSchedule created = new EmployeeSchedule();
      created.setEmployee(employee);
      created.setDayOfWeek(request.dayOfWeek());
      return created;
    });
    schedule.setWorking(request.working());
    schedule.setStartTime(request.working() ? request.startTime() : null);
    schedule.setDoubleShift(request.working() && request.doubleShift());
    return toSchedule(scheduleRepository.save(schedule));
  }

  @Transactional(readOnly = true)
  public List<ExceptionResponse> exceptions(Long employeeId) {
    return exceptionRepository.findByEmployeeId(employeeId).stream()
        .sorted(Comparator.comparing(EmployeeException::getStartDate).reversed())
        .map(this::toException)
        .toList();
  }

  @Transactional
  public ExceptionResponse createException(ExceptionRequest request) {
    Employee employee = employeeRepository.findById(request.employeeId()).orElseThrow();
    EmployeeException exception = new EmployeeException();
    applyException(exception, employee, request);
    return toException(exceptionRepository.save(exception));
  }

  @Transactional
  public ExceptionResponse updateException(Long id, ExceptionRequest request) {
    Employee employee = employeeRepository.findById(request.employeeId()).orElseThrow();
    EmployeeException exception = exceptionRepository.findById(id).orElseThrow();
    applyException(exception, employee, request);
    return toException(exception);
  }

  @Transactional
  public void deleteException(Long id) {
    exceptionRepository.deleteById(id);
  }

  @Transactional(readOnly = true)
  public StaffWeekResponse week(LocalDate date) {
    LocalDate weekStart = (date == null ? LocalDate.now() : date).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    LocalDate weekEnd = weekStart.plusDays(6);
    List<EmployeeException> exceptions = exceptionRepository.findByStartDateLessThanEqualAndEndDateGreaterThanEqual(weekEnd, weekStart);
    List<StaffWeekRow> rows = employeeRepository.findAllByOrderByActiveDescNameAsc().stream()
        .filter(Employee::isActive)
        .map(employee -> new StaffWeekRow(toEmployee(employee), buildWeekDays(employee, weekStart, exceptions)))
        .toList();
    return new StaffWeekResponse(weekStart, weekEnd, rows);
  }

  private List<StaffDayResponse> buildWeekDays(Employee employee, LocalDate weekStart, List<EmployeeException> exceptions) {
    List<EmployeeSchedule> schedules = scheduleRepository.findByEmployeeId(employee.getId());
    return Arrays.stream(DayOfWeek.values()).map(day -> {
      LocalDate date = weekStart.plusDays(day.getValue() - 1L);
      EmployeeException exception = exceptions.stream()
          .filter(item -> item.getEmployee().getId().equals(employee.getId()))
          .filter(item -> !item.getStartDate().isAfter(date) && !item.getEndDate().isBefore(date))
          .findFirst()
          .orElse(null);
      if (exception != null) {
        boolean works = exception.getType() == AbsenceType.CAMBIO_TURNO;
        LocalTime start = works ? exception.getStartTime() : null;
        return new StaffDayResponse(date, day, works, start, false, works ? shiftLabel(start, false) : exception.getType().getLabel(), exception.getNote(), exception.getType(), exception.getId());
      }
      EmployeeSchedule schedule = schedules.stream().filter(item -> item.getDayOfWeek() == day).findFirst().orElse(null);
      boolean works = schedule != null && schedule.isWorking();
      LocalTime start = works ? schedule.getStartTime() : null;
      boolean doubleShift = works && schedule.isDoubleShift();
      return new StaffDayResponse(date, day, works, start, doubleShift, works ? shiftLabel(start, doubleShift) : "Descanso", null, null, null);
    }).toList();
  }

  private void applyEmployee(Employee employee, EmployeeRequest request) {
    employee.setName(request.name().trim());
    employee.setRole(roleRepository.findById(request.roleId()).orElseThrow());
    employee.setGender(normalizeGender(request.gender()));
    employee.setActive(request.active() == null || request.active());
    employee.setInactiveReason(employee.isActive() ? null : clean(request.inactiveReason()));
    employee.setDeactivatedAt(employee.isActive() ? null : LocalDateTime.now());
  }

  private void createDefaultSchedule(Employee employee) {
    for (DayOfWeek day : DayOfWeek.values()) {
      EmployeeSchedule schedule = new EmployeeSchedule();
      schedule.setEmployee(employee);
      schedule.setDayOfWeek(day);
      schedule.setWorking(day != DayOfWeek.MONDAY);
      schedule.setStartTime(day == DayOfWeek.MONDAY ? null : LocalTime.of(18, 0));
      schedule.setDoubleShift(false);
      scheduleRepository.save(schedule);
    }
  }

  private void applyException(EmployeeException exception, Employee employee, ExceptionRequest request) {
    LocalDate end = request.endDate().isBefore(request.startDate()) ? request.startDate() : request.endDate();
    exception.setEmployee(employee);
    exception.setType(request.type());
    exception.setStartDate(request.startDate());
    exception.setEndDate(end);
    exception.setStartTime(request.type() == AbsenceType.CAMBIO_TURNO ? request.startTime() : null);
    exception.setNote(clean(request.note()));
  }

  private RoleResponse toRole(StaffRole role) {
    return new RoleResponse(role.getId(), role.getName(), role.isActive());
  }

  private void mergeDuplicateRoles() {
    Map<String, StaffRole> canonicalRoles = new LinkedHashMap<>();
    for (StaffRole role : roleRepository.findAllByOrderByNameAsc()) {
      String key = normalizeRole(role.getName());
      StaffRole canonical = canonicalRoles.get(key);
      if (canonical == null) {
        role.setName(clean(role.getName()));
        canonicalRoles.put(key, role);
        continue;
      }
      employeeRepository.findByRoleId(role.getId()).forEach(employee -> employee.setRole(canonical));
      roleRepository.delete(role);
    }
  }

  private String normalizeRole(String value) {
    String cleaned = clean(value);
    return cleaned == null ? "" : cleaned.toLowerCase(Locale.ROOT);
  }

  private EmployeeResponse toEmployee(Employee employee) {
    return new EmployeeResponse(employee.getId(), employee.getName(), employee.getRole().getId(), employee.getRole().getName(), normalizeGender(employee.getGender()), employee.isActive(), employee.getInactiveReason());
  }

  private ScheduleResponse toSchedule(EmployeeSchedule schedule) {
    return new ScheduleResponse(schedule.getId(), schedule.getDayOfWeek(), schedule.isWorking(), schedule.getStartTime(), schedule.isDoubleShift());
  }

  private ExceptionResponse toException(EmployeeException exception) {
    return new ExceptionResponse(
        exception.getId(),
        exception.getEmployee().getId(),
        exception.getEmployee().getName(),
        exception.getType(),
        exception.getType().getLabel(),
        exception.getStartDate(),
        exception.getEndDate(),
        exception.getStartTime(),
        exception.getNote());
  }

  private String clean(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }

  private String normalizeGender(String gender) {
    return "FEMALE".equalsIgnoreCase(clean(gender)) ? "FEMALE" : "MALE";
  }

  private String shiftLabel(LocalTime startTime, boolean doubleShift) {
    if (doubleShift) {
      return "Dobleteo";
    }
    if (startTime != null && startTime.isBefore(LocalTime.of(15, 0))) {
      return "Apertura";
    }
    return "Cierre";
  }
}
