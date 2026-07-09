package com.dmaced.pos.auth;

import java.time.Instant;

public record AuthResponse(String token, String username, Instant expiresAt) {}
