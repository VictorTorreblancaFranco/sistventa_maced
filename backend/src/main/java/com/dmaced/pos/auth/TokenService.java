package com.dmaced.pos.auth;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class TokenService {
  public static final long TTL_SECONDS = 60L * 60L * 12L;

  @Value("${app.security.token-secret}")
  private String secret;

  public String issue(String username) {
    long expires = Instant.now().plusSeconds(TTL_SECONDS).getEpochSecond();
    String payload = username + ":" + expires;
    return b64(payload) + "." + sign(payload);
  }

  public String validate(String token) {
    if (token == null || !token.contains(".")) {
      return null;
    }
    String[] parts = token.split("\\.", 2);
    String payload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
    if (!sign(payload).equals(parts[1])) {
      return null;
    }
    String[] values = payload.split(":", 2);
    if (values.length != 2 || Long.parseLong(values[1]) < Instant.now().getEpochSecond()) {
      return null;
    }
    return values[0];
  }

  private String sign(String payload) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      return b64(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception ex) {
      throw new IllegalStateException("No se pudo firmar el token", ex);
    }
  }

  private String b64(String value) {
    return b64(value.getBytes(StandardCharsets.UTF_8));
  }

  private String b64(byte[] value) {
    return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
  }
}
