package com.contadorhoras.extra;

import java.util.Map;

import com.contadorhoras.extra.ExtraHours.Distribution;
import com.contadorhoras.extra.ExtraHours.Scope;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class ExtraHoursDtos {

    private ExtraHoursDtos() {
    }

    /**
     * distribution null/NONE = não ratear (scope e week são ignorados).
     * Com rateio: scope MONTH (mês inteiro) ou WEEK + week (1..n).
     */
    public record ExtraRequest(
            @NotBlank @Pattern(regexp = "\\d{4}-\\d{2}", message = "use o formato AAAA-MM") String month,
            @Size(max = 200) String description,
            @DecimalMin(value = "0", inclusive = false) @DecimalMax("500") double hours,
            Distribution distribution,
            Scope scope,
            Integer week) {
    }

    public record ExtraResponse(String id, String month, String description, double hours,
                                Distribution distribution, Scope scope, Integer week,
                                Map<String, Double> allocation) {
        static ExtraResponse of(ExtraHours e) {
            return new ExtraResponse(e.getId(), e.getMonth(), e.getDescription(), e.getHours(),
                    e.getDistribution(), e.getScope(), e.getWeek(), e.getAllocation());
        }
    }
}
