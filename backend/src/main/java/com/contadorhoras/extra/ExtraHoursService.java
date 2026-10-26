package com.contadorhoras.extra;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.contadorhoras.common.ApiException;
import com.contadorhoras.common.MonthWeeks;
import com.contadorhoras.extra.ExtraHours.Distribution;
import com.contadorhoras.extra.ExtraHours.Scope;
import com.contadorhoras.extra.ExtraHoursDtos.ExtraRequest;
import com.contadorhoras.extra.ExtraHoursDtos.ExtraResponse;
import com.contadorhoras.settings.SettingsService;

@Service
public class ExtraHoursService {

    private static final String DEFAULT_DESCRIPTION = "Horas avulsas";

    private final ExtraHoursRepository repository;
    private final SettingsService settingsService;
    private final MongoTemplate mongo;

    public ExtraHoursService(ExtraHoursRepository repository, SettingsService settingsService, MongoTemplate mongo) {
        this.repository = repository;
        this.settingsService = settingsService;
        this.mongo = mongo;
    }

    public List<ExtraResponse> list(String userId, String month) {
        return repository.findByUserIdAndMonthOrderByCreatedAtAsc(userId, parseMonth(month).toString())
                .stream().map(ExtraResponse::of).toList();
    }

    public ExtraResponse create(String userId, ExtraRequest req) {
        ExtraHours extra = new ExtraHours();
        extra.setUserId(userId);
        extra.setMonth(parseMonth(req.month()).toString());
        apply(userId, extra, req);
        return ExtraResponse.of(repository.save(extra));
    }

    /** O mês de um lançamento não muda; o resto (descrição, horas e rateio) é recalculado. */
    public ExtraResponse update(String userId, String id, ExtraRequest req) {
        ExtraHours extra = find(userId, id);
        apply(userId, extra, req);
        return ExtraResponse.of(repository.save(extra));
    }

    public void delete(String userId, String id) {
        repository.delete(find(userId, id));
    }

    public double sumForMonth(String userId, String month) {
        return sum(userId, Criteria.where("month").is(month));
    }

    /** Avulsas de todos os meses anteriores a {@code month}. */
    public double sumBefore(String userId, String month) {
        return sum(userId, Criteria.where("month").lt(month));
    }

    public double sumAll(String userId) {
        return sum(userId, null);
    }

    /** Horas avulsas rateadas por dia no mês (data -> horas), somando todos os lançamentos. */
    public Map<String, Double> allocationByDate(String userId, String month) {
        Map<String, Double> byDate = new HashMap<>();
        for (ExtraHours e : repository.findByUserIdAndMonthOrderByCreatedAtAsc(userId, month)) {
            e.getAllocation().forEach((date, hours) -> byDate.merge(date, hours, Double::sum));
        }
        byDate.replaceAll((date, hours) -> round(hours));
        return byDate;
    }

    private void apply(String userId, ExtraHours extra, ExtraRequest req) {
        double hours = round(req.hours());
        Distribution distribution = req.distribution() == null ? Distribution.NONE : req.distribution();
        extra.setDescription(description(req.description()));
        extra.setHours(hours);
        extra.setDistribution(distribution);
        if (distribution == Distribution.NONE) {
            extra.setScope(null);
            extra.setWeek(null);
            extra.setAllocation(new LinkedHashMap<>());
            return;
        }
        Scope scope = req.scope() == null ? Scope.MONTH : req.scope();
        YearMonth ym = YearMonth.parse(extra.getMonth());
        List<LocalDate> days = scopeDays(ym, scope, req.week());
        extra.setScope(scope);
        extra.setWeek(scope == Scope.WEEK ? req.week() : null);
        extra.setAllocation(allocate(hours, days, weights(userId, distribution, days)));
    }

    private static List<LocalDate> scopeDays(YearMonth ym, Scope scope, Integer week) {
        List<List<LocalDate>> weeks = MonthWeeks.of(ym);
        if (scope == Scope.MONTH) {
            return weeks.stream().flatMap(List::stream).toList();
        }
        if (week == null || week < 1 || week > weeks.size()) {
            throw ApiException.badRequest("Escolha uma semana entre 1 e " + weeks.size() + ".");
        }
        return weeks.get(week - 1);
    }

    private double[] weights(String userId, Distribution distribution, List<LocalDate> days) {
        Map<DayOfWeek, Double> plan = distribution == Distribution.PLAN
                ? settingsService.get(userId).getDefaultPlanned() : Map.of();
        double[] weights = new double[days.size()];
        double total = 0;
        for (int i = 0; i < days.size(); i++) {
            DayOfWeek dow = days.get(i).getDayOfWeek();
            weights[i] = distribution == Distribution.PLAN
                    ? plan.getOrDefault(dow, 0.0)
                    : (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY ? 0 : 1);
            total += weights[i];
        }
        if (total <= 0) {
            throw ApiException.badRequest(distribution == Distribution.PLAN
                    ? "Não há dias com horas no planejamento padrão nesse período. Ajuste em Configurações ou escolha outro critério."
                    : "Não há dias úteis (seg–sex) nesse período. Escolha outra semana ou o mês inteiro.");
        }
        return weights;
    }

    /** Distribui proporcionalmente aos pesos; a diferença de arredondamento vai para o último dia com peso. */
    private static Map<String, Double> allocate(double hours, List<LocalDate> days, double[] weights) {
        double total = 0;
        int lastWithWeight = -1;
        for (int i = 0; i < weights.length; i++) {
            total += weights[i];
            if (weights[i] > 0) {
                lastWithWeight = i;
            }
        }
        Map<String, Double> allocation = new LinkedHashMap<>();
        double assigned = 0;
        for (int i = 0; i < days.size(); i++) {
            if (weights[i] <= 0) {
                continue;
            }
            double share = i == lastWithWeight ? round(hours - assigned) : round(hours * weights[i] / total);
            assigned = round(assigned + share);
            if (share != 0) {
                allocation.put(days.get(i).toString(), share);
            }
        }
        return allocation;
    }

    private double sum(String userId, Criteria extra) {
        Criteria criteria = Criteria.where("userId").is(userId);
        if (extra != null) {
            criteria = new Criteria().andOperator(criteria, extra);
        }
        Aggregation agg = Aggregation.newAggregation(
                Aggregation.match(criteria),
                Aggregation.group().sum("hours").as("total"));
        Document result = mongo.aggregate(agg, "extra_hours", Document.class).getUniqueMappedResult();
        return result == null ? 0 : ((Number) result.get("total")).doubleValue();
    }

    private ExtraHours find(String userId, String id) {
        return repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Lançamento de horas avulsas não encontrado."));
    }

    private static String description(String text) {
        return text == null || text.isBlank() ? DEFAULT_DESCRIPTION : text.trim();
    }

    private static YearMonth parseMonth(String month) {
        try {
            return YearMonth.parse(month);
        } catch (DateTimeParseException | NullPointerException e) {
            throw ApiException.badRequest("Mês inválido, use o formato AAAA-MM.");
        }
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
