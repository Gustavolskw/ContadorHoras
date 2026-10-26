package com.contadorhoras.auth;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

import com.contadorhoras.common.ApiException;

/**
 * Regras de senha. O frontend (core/password.ts) aplica as mesmas regras para dar retorno imediato,
 * mas é aqui que elas são garantidas.
 */
public final class PasswordPolicy {

    public static final int MIN_LENGTH = 8;
    public static final int MAX_LENGTH = 100;

    private static final Pattern UPPER = Pattern.compile("\\p{Lu}");
    private static final Pattern LOWER = Pattern.compile("\\p{Ll}");
    private static final Pattern DIGIT = Pattern.compile("\\p{Nd}");
    private static final Pattern SPECIAL = Pattern.compile("[^\\p{L}\\p{Nd}\\s]");
    private static final Pattern WHITESPACE = Pattern.compile("\\s");

    private PasswordPolicy() {
    }

    public static List<String> violations(String password, String username) {
        List<String> errors = new ArrayList<>();
        String pwd = password == null ? "" : password;
        if (pwd.length() < MIN_LENGTH || pwd.length() > MAX_LENGTH) {
            errors.add("ter entre " + MIN_LENGTH + " e " + MAX_LENGTH + " caracteres");
        }
        if (!UPPER.matcher(pwd).find()) {
            errors.add("conter letra maiúscula");
        }
        if (!LOWER.matcher(pwd).find()) {
            errors.add("conter letra minúscula");
        }
        if (!DIGIT.matcher(pwd).find()) {
            errors.add("conter número");
        }
        if (!SPECIAL.matcher(pwd).find()) {
            errors.add("conter caractere especial");
        }
        if (WHITESPACE.matcher(pwd).find()) {
            errors.add("não conter espaços");
        }
        if (username != null && username.trim().length() >= 3
                && pwd.toLowerCase(Locale.ROOT).contains(username.trim().toLowerCase(Locale.ROOT))) {
            errors.add("não conter o nome de usuário");
        }
        return errors;
    }

    public static void validate(String password, String username) {
        List<String> errors = violations(password, username);
        if (!errors.isEmpty()) {
            throw ApiException.badRequest("Senha fora das regras. Ela precisa: " + String.join("; ", errors) + ".");
        }
    }
}
