package com.contadorhoras.common;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;

/**
 * Semanas de um mês como na planilha: segunda a domingo, contendo apenas os dias do mês
 * (a primeira e a última podem ser parciais). A semana 1 é a que contém o dia 1.
 */
public final class MonthWeeks {

    private MonthWeeks() {
    }

    public static List<List<LocalDate>> of(YearMonth ym) {
        List<List<LocalDate>> weeks = new ArrayList<>();
        LocalDate last = ym.atEndOfMonth();
        LocalDate weekStart = ym.atDay(1);
        while (!weekStart.isAfter(last)) {
            LocalDate sunday = weekStart.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
            LocalDate weekEnd = sunday.isAfter(last) ? last : sunday;
            List<LocalDate> days = new ArrayList<>();
            for (LocalDate d = weekStart; !d.isAfter(weekEnd); d = d.plusDays(1)) {
                days.add(d);
            }
            weeks.add(days);
            weekStart = weekEnd.plusDays(1);
        }
        return weeks;
    }
}
