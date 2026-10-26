package com.contadorhoras.settings;

import java.time.DayOfWeek;
import java.util.Map;

import com.contadorhoras.settings.UserSettings.CalcMode;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record SettingsRequest(
        @PositiveOrZero double hourlyRate,
        @NotNull CalcMode calcMode,
        double initialBalance,
        double counterStep,
        Map<DayOfWeek, Double> defaultPlanned) {
}
