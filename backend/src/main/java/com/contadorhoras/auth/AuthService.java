package com.contadorhoras.auth;

import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.contadorhoras.auth.AuthDtos.AccountResponse;
import com.contadorhoras.auth.AuthDtos.ChangePasswordRequest;
import com.contadorhoras.auth.AuthDtos.ChangeQuestionsRequest;
import com.contadorhoras.auth.AuthDtos.LoginRequest;
import com.contadorhoras.auth.AuthDtos.QuestionAnswer;
import com.contadorhoras.auth.AuthDtos.RegisterRequest;
import com.contadorhoras.auth.AuthDtos.ResetPasswordRequest;
import com.contadorhoras.auth.AuthDtos.TokenResponse;
import com.contadorhoras.common.ApiException;
import com.contadorhoras.config.JwtService;
import com.contadorhoras.settings.SettingsService;
import com.contadorhoras.user.User;
import com.contadorhoras.user.User.SecurityQuestion;
import com.contadorhoras.user.UserRepository;

@Service
public class AuthService {

    private static final String INVALID_CREDENTIALS = "Usuário ou senha inválidos.";
    private static final String RECOVERY_NOT_AVAILABLE = "Usuário não encontrado.";

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final SettingsService settingsService;
    private final int maxFailedAttempts;
    private final Duration lockDuration;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt, SettingsService settingsService,
                       @Value("${app.security.max-failed-attempts}") int maxFailedAttempts,
                       @Value("${app.security.lock-minutes}") long lockMinutes) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.settingsService = settingsService;
        this.maxFailedAttempts = maxFailedAttempts;
        this.lockDuration = Duration.ofMinutes(lockMinutes);
    }

    public TokenResponse register(RegisterRequest req) {
        String username = normalizeUsername(req.username());
        if (users.existsByUsername(username)) {
            throw new ApiException(HttpStatus.CONFLICT, "Nome de usuário já está em uso.");
        }
        PasswordPolicy.validate(req.password(), username);
        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(encoder.encode(req.password()));
        user.setSecurityQuestions(hashQuestions(req.securityQuestions()));
        users.save(user);
        settingsService.createDefaults(user.getId());
        return new TokenResponse(jwt.generate(user.getId(), username), username);
    }

    public TokenResponse login(LoginRequest req) {
        User user = users.findByUsername(normalizeUsername(req.username()))
                .orElseThrow(() -> ApiException.unauthorized(INVALID_CREDENTIALS));
        ensureNotLocked(user);
        if (!encoder.matches(req.password(), user.getPasswordHash())) {
            user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);
            lockIfNeeded(user, user.getFailedLoginAttempts());
            users.save(user);
            throw ApiException.unauthorized(INVALID_CREDENTIALS);
        }
        user.setFailedLoginAttempts(0);
        users.save(user);
        return new TokenResponse(jwt.generate(user.getId(), user.getUsername()), user.getUsername());
    }

    public List<String> recoveryQuestions(String username) {
        User user = users.findByUsername(normalizeUsername(username))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, RECOVERY_NOT_AVAILABLE));
        ensureNotLocked(user);
        return user.getSecurityQuestions().stream().map(SecurityQuestion::question).toList();
    }

    public void resetPassword(ResetPasswordRequest req) {
        User user = users.findByUsername(normalizeUsername(req.username()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, RECOVERY_NOT_AVAILABLE));
        ensureNotLocked(user);
        PasswordPolicy.validate(req.newPassword(), user.getUsername());

        List<SecurityQuestion> questions = user.getSecurityQuestions();
        boolean allMatch = questions.size() == req.answers().size();
        for (int i = 0; allMatch && i < questions.size(); i++) {
            allMatch = encoder.matches(normalizeAnswer(req.answers().get(i)), questions.get(i).answerHash());
        }
        if (!allMatch) {
            user.setFailedRecoveryAttempts(user.getFailedRecoveryAttempts() + 1);
            lockIfNeeded(user, user.getFailedRecoveryAttempts());
            users.save(user);
            throw ApiException.badRequest("Uma ou mais respostas estão incorretas.");
        }

        user.setPasswordHash(encoder.encode(req.newPassword()));
        user.setFailedRecoveryAttempts(0);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        users.save(user);
    }

    public AccountResponse account(String userId) {
        User user = getUser(userId);
        return new AccountResponse(user.getUsername(),
                user.getSecurityQuestions().stream().map(SecurityQuestion::question).toList());
    }

    public void changePassword(String userId, ChangePasswordRequest req) {
        User user = getUser(userId);
        checkCurrentPassword(user, req.currentPassword());
        PasswordPolicy.validate(req.newPassword(), user.getUsername());
        user.setPasswordHash(encoder.encode(req.newPassword()));
        users.save(user);
    }

    public void changeQuestions(String userId, ChangeQuestionsRequest req) {
        User user = getUser(userId);
        checkCurrentPassword(user, req.currentPassword());
        user.setSecurityQuestions(hashQuestions(req.securityQuestions()));
        users.save(user);
    }

    private User getUser(String userId) {
        return users.findById(userId).orElseThrow(() -> ApiException.unauthorized("Não autenticado."));
    }

    private void checkCurrentPassword(User user, String password) {
        if (!encoder.matches(password, user.getPasswordHash())) {
            throw ApiException.badRequest("Senha atual incorreta.");
        }
    }

    private List<SecurityQuestion> hashQuestions(List<QuestionAnswer> items) {
        var distinct = new HashSet<String>();
        for (QuestionAnswer qa : items) {
            if (!distinct.add(qa.question().trim().toLowerCase(Locale.ROOT))) {
                throw ApiException.badRequest("As perguntas de segurança devem ser diferentes entre si.");
            }
        }
        return items.stream()
                .map(qa -> new SecurityQuestion(qa.question().trim(), encoder.encode(normalizeAnswer(qa.answer()))))
                .toList();
    }

    private void ensureNotLocked(User user) {
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(Instant.now())) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "Muitas tentativas inválidas. Tente novamente em alguns minutos.");
        }
    }

    private void lockIfNeeded(User user, int attempts) {
        if (attempts >= maxFailedAttempts) {
            user.setLockedUntil(Instant.now().plus(lockDuration));
            user.setFailedLoginAttempts(0);
            user.setFailedRecoveryAttempts(0);
        }
    }

    private static String normalizeUsername(String username) {
        return username.trim().toLowerCase(Locale.ROOT);
    }

    /** Respostas comparadas sem diferenciar maiúsculas, acentos e espaços extras. */
    static String normalizeAnswer(String answer) {
        String noAccents = Normalizer.normalize(answer, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return noAccents.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }
}
