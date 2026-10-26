package com.contadorhoras.extra;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Horas avulsas de um mês. Entram nas horas feitas, nas pretendidas, no saldo e no valor do mês.
 * Opcionalmente são rateadas entre dias (do mês inteiro ou de uma semana), o que as faz aparecer
 * nos dias e nas semanas do calendário.
 */
@Document("extra_hours")
@CompoundIndex(name = "user_month", def = "{'userId': 1, 'month': 1}")
public class ExtraHours {

    /** NONE: fica só no total do mês; WORKDAYS: partes iguais seg–sex; PLAN: proporcional ao planejamento padrão. */
    public enum Distribution { NONE, WORKDAYS, PLAN }

    public enum Scope { MONTH, WEEK }

    @Id
    private String id;

    private String userId;

    /** yyyy-MM: ordena lexicograficamente, o que permite somar "meses anteriores". */
    private String month;

    private String description;
    private double hours;

    private Distribution distribution = Distribution.NONE;
    private Scope scope;
    /** Número da semana do mês (1..n) quando scope = WEEK. */
    private Integer week;

    /** Rateio calculado ao salvar: data (yyyy-MM-dd) -> horas. Vazio quando distribution = NONE. */
    private Map<String, Double> allocation = new LinkedHashMap<>();

    private Instant createdAt = Instant.now();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getMonth() { return month; }
    public void setMonth(String month) { this.month = month; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public double getHours() { return hours; }
    public void setHours(double hours) { this.hours = hours; }
    public Distribution getDistribution() { return distribution == null ? Distribution.NONE : distribution; }
    public void setDistribution(Distribution distribution) { this.distribution = distribution; }
    public Scope getScope() { return scope; }
    public void setScope(Scope scope) { this.scope = scope; }
    public Integer getWeek() { return week; }
    public void setWeek(Integer week) { this.week = week; }
    public Map<String, Double> getAllocation() { return allocation == null ? Map.of() : allocation; }
    public void setAllocation(Map<String, Double> allocation) { this.allocation = allocation; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
