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

  @Transactional
  public List<ScheduleResponse> schedule(Long employeeId, LocalDate date) {
    Employee employee = employeeRepository.findById(employeeId).orElseThrow();
    LocalDate weekStart = weekStart(date);
    List<EmployeeSchedule> schedules = ensureWeekSchedule(employee, weekStart);
    return schedules.stream()
        .sorted(Comparator.comparing(EmployeeSchedule::getDayOfWeek))
        .map(this::toSchedule)
        .toList();
  }

  @Transactional
  public ScheduleResponse updateSchedule(Long employeeId, LocalDate date, ScheduleRequest request) {
    Employee employee = employeeRepository.findById(employeeId).orElseThrow();
    LocalDate weekStart = weekStart(date);
    EmployeeSchedule schedule = scheduleRepository.findByEmployeeIdAndWeekStartAndDayOfWeek(employeeId, weekStart, request.dayOfWeek()).orElseGet(() -> {
      EmployeeSchedule created = new EmployeeSchedule();
      created.setEmployee(employee);
      created.setWeekStart(weekStart);
      created.setDayOfWeek(request.dayOfWeek());
      return created;
    });
    schedule.setWorking(request.working());
    schedule.setStartTime(request.working() ? request.startTime() : null);
    schedule.setDoubleShift(isDoubleShift(request.working(), request.startTime(), request.doubleShift()));
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

  @Transactional
  public StaffWeekResponse week(LocalDate date) {
    LocalDate weekStart = weekStart(date);
    LocalDate weekEnd = weekStart.plusDays(6);
    List<EmployeeException> exceptions = exceptionRepository.findByStartDateLessThanEqualAndEndDateGreaterThanEqual(weekEnd, weekStart);
    List<StaffWeekRow> rows = employeeRepository.findAllByOrderByActiveDescNameAsc().stream()
        .filter(Employee::isActive)
        .map(employee -> new StaffWeekRow(toEmployee(employee), buildWeekDays(employee, weekStart, exceptions)))
        .toList();
    return new StaffWeekResponse(weekStart, weekEnd, rows);
  }

  private List<StaffDayResponse> buildWeekDays(Employee employee, LocalDate weekStart, List<EmployeeException> exceptions) {
    List<EmployeeSchedule> schedules = ensureWeekSchedule(employee, weekStart);
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
      boolean doubleShift = isDoubleShift(works, start, schedule != null && schedule.isDoubleShift());
      return new StaffDayResponse(date, day, works, start, doubleShift, works ? shiftLabel(start, doubleShift) : "Descanso", null, null, null);
    }).toList();
  }

  private void applyEmployee(Employee employee, EmployeeRequest request) {
    employee.setName(request.name().trim());
    employee.setRole(roleRepository.findById(request.roleId()).orElseThrow());
    employee.setGender(resolveGender(request.gender(), request.name()));
    employee.setActive(request.active() == null || request.active());
    employee.setInactiveReason(employee.isActive() ? null : clean(request.inactiveReason()));
    employee.setDeactivatedAt(employee.isActive() ? null : LocalDateTime.now());
  }

  private void createDefaultSchedule(Employee employee) {
    ensureWeekSchedule(employee, weekStart(LocalDate.now()));
  }

  private List<EmployeeSchedule> ensureWeekSchedule(Employee employee, LocalDate weekStart) {
    List<EmployeeSchedule> schedules = scheduleRepository.findByEmployeeIdAndWeekStart(employee.getId(), weekStart);
    if (schedules.size() >= DayOfWeek.values().length) {
      if (looksLikeOldAutoTemplate(schedules)) {
        schedules.forEach(this::clearScheduleDay);
        return scheduleRepository.saveAll(schedules);
      }
      return schedules;
    }
    for (DayOfWeek day : DayOfWeek.values()) {
      if (schedules.stream().anyMatch(schedule -> schedule.getDayOfWeek() == day)) {
        continue;
      }
      EmployeeSchedule schedule = new EmployeeSchedule();
      schedule.setEmployee(employee);
      schedule.setWeekStart(weekStart);
      schedule.setDayOfWeek(day);
      clearScheduleDay(schedule);
      schedules.add(scheduleRepository.save(schedule));
    }
    return schedules;
  }

  private boolean looksLikeOldAutoTemplate(List<EmployeeSchedule> schedules) {
    return Arrays.stream(DayOfWeek.values()).allMatch(day -> schedules.stream()
        .filter(schedule -> schedule.getDayOfWeek() == day)
        .findFirst()
        .map(schedule -> day == DayOfWeek.MONDAY
            ? !schedule.isWorking() && schedule.getStartTime() == null && !schedule.isDoubleShift()
            : schedule.isWorking() && LocalTime.of(18, 0).equals(schedule.getStartTime()) && !schedule.isDoubleShift())
        .orElse(false));
  }

  private void clearScheduleDay(EmployeeSchedule schedule) {
    schedule.setWorking(false);
    schedule.setStartTime(null);
    schedule.setDoubleShift(false);
  }

  private LocalDate weekStart(LocalDate date) {
    return (date == null ? LocalDate.now() : date).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
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
    return new EmployeeResponse(employee.getId(), employee.getName(), employee.getRole().getId(), employee.getRole().getName(), resolveGender(employee.getGender(), employee.getName()), employee.isActive(), employee.getInactiveReason());
  }

  private ScheduleResponse toSchedule(EmployeeSchedule schedule) {
    boolean doubleShift = isDoubleShift(schedule.isWorking(), schedule.getStartTime(), schedule.isDoubleShift());
    return new ScheduleResponse(schedule.getId(), schedule.getWeekStart(), schedule.getDayOfWeek(), schedule.isWorking(), schedule.getStartTime(), doubleShift);
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

  private String resolveGender(String gender, String name) {
    String cleaned = clean(gender);
    if ("FEMALE".equalsIgnoreCase(cleaned)) {
      return "FEMALE";
    }
    if ("MALE".equalsIgnoreCase(cleaned)) {
      return "MALE";
    }
    return looksFemaleName(name) ? "FEMALE" : "MALE";
  }

  private boolean looksFemaleName(String name) {
    String cleaned = clean(name);
    if (cleaned == null) {
      return false;
    }
    String first = cleaned.toLowerCase(Locale.ROOT).split("\\s+")[0];
    return List.of("ana", "andrea", "angela", "carla", "carmen", "cristhina", "cristina", "diana",
        "elena", "helen", "karla", "lucia", "maria", "melissa", "paola", "rosa",
        "silvia", "sofia", "valeria", "vanessa", "ximena").contains(first);
  }

  private boolean isDoubleShift(boolean working, LocalTime startTime, boolean doubleShift) {
    return working && (doubleShift || LocalTime.of(12, 0).equals(startTime));
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
