package com.contadorhoras.settings;

import java.time.DayOfWeek;
import java.util.EnumMap;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.contadorhoras.common.ApiException;

@Service
public class SettingsService {

    private final SettingsRepository repository;

    public SettingsService(SettingsRepository repository) {
        this.repository = repository;
    }

    public void createDefaults(String userId) {
        UserSettings settings = new UserSettings();
        settings.setUserId(userId);
        repository.save(settings);
    }

    public UserSettings get(String userId) {
        return repository.findById(userId).orElseGet(() -> {
            UserSettings settings = new UserSettings();
            settings.setUserId(userId);
            return repository.save(settings);
        });
    }

    public UserSettings update(String userId, SettingsRequest req) {
        if (req.counterStep() <= 0) {
            throw ApiException.badRequest("O incremento do contador deve ser maior que zero.");
        }
        Map<DayOfWeek, Double> plan = new EnumMap<>(UserSettings.defaultPlan());
        if (req.defaultPlanned() != null) {
            req.defaultPlanned().forEach((day, hours) -> {
                if (hours == null || hours < 0 || hours > 24) {
                    throw ApiException.badRequest("Horas pretendidas por dia devem estar entre 0 e 24.");
                }
                plan.put(day, hours);
            });
        }
        UserSettings settings = get(userId);
        settings.setHourlyRate(req.hourlyRate());
        settings.setCalcMode(req.calcMode());
        settings.setInitialBalance(req.initialBalance());
        settings.setCounterStep(req.counterStep());
        settings.setDefaultPlanned(plan);
        return repository.save(settings);
    }
}
