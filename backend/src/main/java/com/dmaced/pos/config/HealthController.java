package com.dmaced.pos.config;

import java.time.LocalDateTime;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
  @GetMapping("/api/health")
  Map<String, Object> health() {
    return Map.of("status", "ok", "time", LocalDateTime.now());
  }
}
