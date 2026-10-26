package com.contadorhoras.user;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("users")
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String username;

    private String passwordHash;

    /** Perguntas em texto puro; respostas guardadas apenas como hash BCrypt. */
    private List<SecurityQuestion> securityQuestions = new ArrayList<>();

    private int failedLoginAttempts;
    private int failedRecoveryAttempts;
    private Instant lockedUntil;
    private Instant createdAt = Instant.now();

    public record SecurityQuestion(String question, String answerHash) {
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public List<SecurityQuestion> getSecurityQuestions() { return securityQuestions; }
    public void setSecurityQuestions(List<SecurityQuestion> securityQuestions) { this.securityQuestions = securityQuestions; }
    public int getFailedLoginAttempts() { return failedLoginAttempts; }
    public void setFailedLoginAttempts(int failedLoginAttempts) { this.failedLoginAttempts = failedLoginAttempts; }
    public int getFailedRecoveryAttempts() { return failedRecoveryAttempts; }
    public void setFailedRecoveryAttempts(int failedRecoveryAttempts) { this.failedRecoveryAttempts = failedRecoveryAttempts; }
    public Instant getLockedUntil() { return lockedUntil; }
    public void setLockedUntil(Instant lockedUntil) { this.lockedUntil = lockedUntil; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
