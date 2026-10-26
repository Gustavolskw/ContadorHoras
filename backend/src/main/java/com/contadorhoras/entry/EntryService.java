package com.contadorhoras.entry;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Service;

import com.contadorhoras.common.ApiException;
import com.contadorhoras.entry.DayEntry.Ticket;
import com.contadorhoras.entry.EntryDtos.EntryRequest;
import com.contadorhoras.entry.EntryDtos.EntryResponse;
import com.contadorhoras.entry.EntryDtos.MonthSummary;
import com.contadorhoras.entry.EntryDtos.WeekSummary;
import com.contadorhoras.settings.SettingsService;
import com.contadorhoras.settings.UserSettings;

@Service
public class EntryService {

    private final DayEntryRepository repository;
    private final SettingsService settingsService;
    private final MongoTemplate mongo;

    public EntryService(DayEntryRepository repository, SettingsService settingsService, MongoTemplate mongo) {
        this.repository = repository;
        this.settingsService = settingsService;
        this.mongo = mongo;
    }

    public List<EntryResponse> month(String userId, String month) {
        YearMonth ym = parseMonth(month);
        return repository.findRange(userId, ym.atDay(1).toString(), ym.atEndOfMonth().toString())
                .stream().map(EntryResponse::of).toList();
    }

    public EntryResponse day(String userId, String date) {
        String iso = parseDate(date).toString();
        return repository.findByUserIdAndDate(userId, iso).map(EntryResponse::of)
                .orElse(EntryResponse.empty(iso));
    }

    public EntryResponse save(String userId, String date, EntryRequest req) {
        String iso = parseDate(date).toString();
        String note = req.note() == null || req.note().isBlank() ? null : req.note().trim();
        DayEntry entry = repository.findByUserIdAndDate(userId, iso).orElseGet(() -> {
            DayEntry e = new DayEntry();
            e.setUserId(userId);
            e.setDate(iso);
            return e;
        });
        List<Ticket> tickets = req.tickets() == null
                ? entry.getTickets()
                : req.tickets().stream()
                        .map(t -> new Ticket(t.number().trim(),
                                t.name() == null || t.name().isBlank() ? null : t.name().trim(),
                                round(t.hours())))
                        .toList();
        double meeting = req.meetingHours() == null ? entry.getMeetingHours() : round(req.meetingHours());
        if (req.workedHours() + meeting > 24) {
            throw ApiException.badRequest("Horas trabalhadas + reunião/treinamento não podem passar de 24h no dia.");
        }
        // Dia zerado, sem observação e sem chamados não precisa existir no banco.
        if (req.workedHours() == 0 && req.plannedHours() == 0 && meeting == 0 && note == null && tickets.isEmpty()) {
            repository.deleteByUserIdAndDate(userId, iso);
            return EntryResponse.empty(iso);
        }
        entry.setWorkedHours(round(req.workedHours()));
        entry.setPlannedHours(round(req.plannedHours()));
        entry.setMeetingHours(meeting);
        entry.setNote(note);
        entry.setTickets(new ArrayList<>(tickets));
        return EntryResponse.of(repository.save(entry));
    }

    /** Preenche as horas pretendidas do mês com o planejamento padrão por dia da semana. */
    public List<EntryResponse> applyPlan(String userId, String month, boolean overwrite) {
        YearMonth ym = parseMonth(month);
        Map<DayOfWeek, Double> plan = settingsService.get(userId).getDefaultPlanned();
        Map<String, DayEntry> existing = repository
                .findRange(userId, ym.atDay(1).toString(), ym.atEndOfMonth().toString())
                .stream().collect(Collectors.toMap(DayEntry::getDate, Function.identity()));

        List<DayEntry> toSave = new ArrayList<>();
        for (LocalDate d = ym.atDay(1); !d.isAfter(ym.atEndOfMonth()); d = d.plusDays(1)) {
            double hours = plan.getOrDefault(d.getDayOfWeek(), 0.0);
            DayEntry entry = existing.get(d.toString());
            if (entry == null) {
                if (hours == 0) {
                    continue;
                }
                entry = new DayEntry();
                entry.setUserId(userId);
                entry.setDate(d.toString());
            } else if (!overwrite && entry.getPlannedHours() > 0) {
                continue;
            }
            entry.setPlannedHours(hours);
            toSave.add(entry);
        }
        repository.saveAll(toSave);
        return month(userId, month);
    }

    public MonthSummary summary(String userId, String month) {
        YearMonth ym = parseMonth(month);
        UserSettings settings = settingsService.get(userId);
        double rate = settings.getHourlyRate();
        LocalDate first = ym.atDay(1);
        LocalDate last = ym.atEndOfMonth();

        Map<String, DayEntry> byDate = repository.findRange(userId, first.toString(), last.toString())
                .stream().collect(Collectors.toMap(DayEntry::getDate, Function.identity()));

        // Semanas de segunda a domingo, contando apenas os dias que pertencem ao mês.
        List<WeekSummary> weeks = new ArrayList<>();
        double monthWorked = 0;
        double monthPlanned = 0;
        double monthMeeting = 0;
        LocalDate weekStart = first;
        int number = 1;
        while (!weekStart.isAfter(last)) {
            LocalDate sunday = weekStart.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
            LocalDate weekEnd = sunday.isAfter(last) ? last : sunday;
            double worked = 0;
            double planned = 0;
            double meeting = 0;
            for (LocalDate d = weekStart; !d.isAfter(weekEnd); d = d.plusDays(1)) {
                DayEntry e = byDate.get(d.toString());
                if (e != null) {
                    worked += e.getWorkedHours();
                    planned += e.getPlannedHours();
                    meeting += e.getMeetingHours();
                }
            }
            weeks.add(new WeekSummary(number++, weekStart.toString(), weekEnd.toString(),
                    round(worked), round(planned), round(meeting),
                    round((worked + meeting) * rate), round(planned * rate)));
            monthWorked += worked;
            monthPlanned += planned;
            monthMeeting += meeting;
            weekStart = weekEnd.plusDays(1);
        }

        // Saldo de horas: somente horas de chamados (workedHours), sem reuniões.
        double initial = settings.getInitialBalance();
        double previousTotal = initial + sumWorked(userId, Criteria.where("date").lt(first.toString()));
        double overallTotal = initial + sumWorked(userId, null);

        return new MonthSummary(
                ym.toString(), rate, settings.getCalcMode().name(), weeks,
                round(monthWorked), round(monthPlanned), round(monthMeeting),
                round(monthPlanned - monthWorked - monthMeeting),
                round((monthWorked + monthMeeting) * rate), round(monthPlanned * rate),
                round(previousTotal), round(previousTotal + monthWorked), round(overallTotal));
    }

    private double sumWorked(String userId, Criteria extra) {
        Criteria criteria = Criteria.where("userId").is(userId);
        if (extra != null) {
            criteria = new Criteria().andOperator(criteria, extra);
        }
        Aggregation agg = Aggregation.newAggregation(
                Aggregation.match(criteria),
                Aggregation.group().sum("workedHours").as("total"));
        Document result = mongo.aggregate(agg, "day_entries", Document.class).getUniqueMappedResult();
        return result == null ? 0 : ((Number) result.get("total")).doubleValue();
    }

    private static YearMonth parseMonth(String month) {
        try {
            return YearMonth.parse(month);
        } catch (DateTimeParseException e) {
            throw ApiException.badRequest("Mês inválido, use o formato AAAA-MM.");
        }
    }

    private static LocalDate parseDate(String date) {
        try {
            return LocalDate.parse(date);
        } catch (DateTimeParseException e) {
            throw ApiException.badRequest("Data inválida, use o formato AAAA-MM-DD.");
        }
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
