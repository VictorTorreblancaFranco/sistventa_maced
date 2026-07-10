package com.dmaced.pos.auth;

import jakarta.validation.Valid;
import java.time.Instant;
import org.springframework.security.core.Authentication;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final TokenService tokenService;
  private final PasswordEncoder passwordEncoder;

  public AuthController(TokenService tokenService, PasswordEncoder passwordEncoder) {
    this.tokenService = tokenService;
    this.passwordEncoder = passwordEncoder;
  }

  @Value("${app.security.admin-user}")
  private String adminUser;

  @Value("${app.security.admin-password}")
  private String adminPassword;

  @PostMapping("/login")
  ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
    boolean sameUser = adminUser.equalsIgnoreCase(request.username());
    boolean samePassword = passwordEncoder.matches(request.password(), passwordEncoder.encode(adminPassword));
    if (!sameUser || !samePassword) {
      return ResponseEntity.status(401).build();
    }
    String token = tokenService.issue(adminUser);
    return ResponseEntity.ok(new AuthResponse(token, adminUser, Instant.now().plusSeconds(TokenService.TTL_SECONDS)));
  }

  @PostMapping("/refresh")
  ResponseEntity<AuthResponse> refresh(Authentication authentication) {
    if (authentication == null || !authentication.isAuthenticated()) {
      return ResponseEntity.status(401).build();
    }
    String username = authentication.getName();
    String token = tokenService.issue(username);
    return ResponseEntity.ok(new AuthResponse(token, username, Instant.now().plusSeconds(TokenService.TTL_SECONDS)));
  }
}
