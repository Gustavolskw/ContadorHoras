package com.contadorhoras.entry;

import java.util.List;

import com.contadorhoras.entry.DayEntry.Ticket;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class EntryDtos {

    private EntryDtos() {
    }

    public record EntryRequest(
            @DecimalMin("0") @DecimalMax("24") double workedHours,
            @DecimalMin("0") @DecimalMax("24") double plannedHours,
            /* null = mantém o valor salvo */
            @DecimalMin("0") @DecimalMax("24") Double meetingHours,
            @Size(max = 500) String note,
            /* null = mantém os chamados já salvos; lista (mesmo vazia) = substitui */
            @Size(max = 50) List<@Valid TicketRequest> tickets) {
    }

    public record TicketRequest(
            @NotBlank @Size(max = 40) String number,
            @Size(max = 200) String name,
            @DecimalMin("0") @DecimalMax("24") double hours) {
    }

    public record EntryResponse(String date, double workedHours, double plannedHours, double meetingHours,
                                String note, List<Ticket> tickets) {
        static EntryResponse of(DayEntry e) {
            return new EntryResponse(e.getDate(), e.getWorkedHours(), e.getPlannedHours(), e.getMeetingHours(),
                    e.getNote(), e.getTickets());
        }

        static EntryResponse empty(String date) {
            return new EntryResponse(date, 0, 0, 0, null, List.of());
        }
    }

    /** Colunas da planilha: Totais (horas da semana) e Saldo (valor da semana, chamados + reuniões). */
    public record WeekSummary(int number, String start, String end,
                              double workedHours, double plannedHours, double meetingHours,
                              double workedValue, double plannedValue) {
    }

    public record MonthSummary(
            String month,
            double hourlyRate,
            String calcMode,
            List<WeekSummary> weeks,
            /* "Feitas no mês" / "Mes" */
            double workedHours,
            double plannedHours,
            /* Reuniões/treinamentos: entram no valor, não no saldo de horas */
            double meetingHours,
            /* Pretendidas - (trabalhadas + reuniões) no mês */
            double remainingHours,
            /* "Resultado Mês": (trabalhadas + reuniões) x valor hora */
            double workedValue,
            double plannedValue,
            /* "Total Horas": saldo inicial + tudo o que foi feito antes deste mês */
            double previousTotal,
            /* "Saldo Atual": Total Horas + Feitas no mês (somente chamados) */
            double currentBalance,
            /* Saldo inicial + todos os meses lançados */
            double overallTotal) {
    }
}
