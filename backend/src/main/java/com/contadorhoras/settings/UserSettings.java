package com.contadorhoras.settings;

import java.time.DayOfWeek;
import java.util.EnumMap;
import java.util.Map;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** Configurações pessoais. O _id é o próprio id do usuário (1 documento por usuário). */
@Document("user_settings")
public class UserSettings {

    public enum CalcMode { SEMANAL, MENSAL }

    @Id
    private String userId;

    /** Valor da hora (R$). Coluna "Saldo" da planilha = horas x este valor. */
    private double hourlyRate = 35;

    /** SEMANAL: mostra Totais/Saldo por semana (como a planilha); MENSAL: só o resultado do mês. */
    private CalcMode calcMode = CalcMode.SEMANAL;

    /** Horas que já existiam no sistema de chamados antes de usar este sistema. */
    private double initialBalance;

    /** Incremento dos botões +/- do contador do dia. */
    private double counterStep = 1;

    /** Planejamento padrão por dia da semana, usado no "Planejar mês". */
    private Map<DayOfWeek, Double> defaultPlanned = defaultPlan();

    public static Map<DayOfWeek, Double> defaultPlan() {
        Map<DayOfWeek, Double> plan = new EnumMap<>(DayOfWeek.class);
        for (DayOfWeek d : DayOfWeek.values()) {
            plan.put(d, d == DayOfWeek.SATURDAY || d == DayOfWeek.SUNDAY ? 0.0 : 7.0);
        }
        return plan;
    }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public double getHourlyRate() { return hourlyRate; }
    public void setHourlyRate(double hourlyRate) { this.hourlyRate = hourlyRate; }
    public CalcMode getCalcMode() { return calcMode; }
    public void setCalcMode(CalcMode calcMode) { this.calcMode = calcMode; }
    public double getInitialBalance() { return initialBalance; }
    public void setInitialBalance(double initialBalance) { this.initialBalance = initialBalance; }
    public double getCounterStep() { return counterStep; }
    public void setCounterStep(double counterStep) { this.counterStep = counterStep; }
    public Map<DayOfWeek, Double> getDefaultPlanned() { return defaultPlanned; }
    public void setDefaultPlanned(Map<DayOfWeek, Double> defaultPlanned) { this.defaultPlanned = defaultPlanned; }
}
